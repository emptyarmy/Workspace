import type { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { belongsToCompany, emailSchema, isExternalEmail, roleSchema } from '@ai-tpi/shared';
import {
  activeAdminCount,
  adminPasswordReset,
  departmentBelongs,
  domainProblem,
  domainsOf,
  emailTaken,
  fail,
  me,
  notifyCompanyAdmins,
  parseBody,
  sendInvitation,
  userColumns,
} from '../admin/helpers';
import { audit } from '../audit';
import { destroyAllSessions } from '../auth/sessions';
import { companies, companyDomains, industries, users } from '../db/schema';
import { requireAuth } from '../plugins/auth';

const departmentIdSchema = z.string().uuid().nullable();
const createUserBody = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  role: roleSchema,
  departmentId: departmentIdSchema.optional(),
});
const updateUserBody = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: emailSchema.optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
    departmentId: departmentIdSchema.optional(),
  })
  .strict();
const idParam = z.object({ id: z.string().uuid() });
/** Logo nur per https (TC-ADM-007): javascript:, data:, ftp:, http: werden abgewiesen. */
export const logoUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => u.toLowerCase().startsWith('https://'), 'https_only');
const companyBody = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    logoUrl: logoUrlSchema.nullable().optional(),
    logoAlt: z.string().trim().max(120).optional(),
    industryCode: z.string().min(2).max(5).optional(),
    benchmarkOptIn: z.boolean().optional(),
  })
  .strict();
const domainBody = z.object({ domain: z.string().trim().toLowerCase().max(253) });

/**
 * Admin-Bereich der eigenen Firma (R-02, FA-8). Fremde IDs → 404 (Existenz wird nicht verraten).
 * Firmenübergreifende Funktionen (S-01, S-10, S-14, S-15) siehe admin-cross.ts.
 */
export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth(['admin']));
  const db = () => app.deps.db!.db;

  async function ownUser(companyId: string, id: unknown) {
    const p = idParam.safeParse({ id });
    if (!p.success) return undefined;
    const [target] = await db()
      .select()
      .from(users)
      .where(and(eq(users.id, p.data.id), eq(users.companyId, companyId), ne(users.status, 'deleted')))
      .limit(1);
    return target;
  }

  app.get('/api/admin/users', async (req) =>
    db()
      .select(userColumns)
      .from(users)
      .where(and(eq(users.companyId, me(req).companyId), ne(users.status, 'deleted')))
      .orderBy(asc(users.name)),
  );

  app.post('/api/admin/users', async (req, reply) => {
    const b = parseBody(createUserBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    if (!belongsToCompany(b.email, await domainsOf(db(), u.companyId)))
      return fail(reply, 400, 'email_domain');
    if (b.departmentId && !(await departmentBelongs(db(), b.departmentId, u.companyId)))
      return reply.status(400).send({ error: 'invalid_input', fields: ['departmentId'] });
    if (await emailTaken(db(), b.email)) return fail(reply, 409, 'email_taken');
    const [created] = await db()
      .insert(users)
      .values({
        companyId: u.companyId,
        departmentId: b.departmentId ?? null,
        name: b.name,
        email: b.email,
        role: b.role,
        status: 'invited',
        isExternal: isExternalEmail(b.email),
        createdByUserId: u.id,
      })
      .returning(userColumns);
    await sendInvitation(app, { email: b.email, name: b.name, companyId: u.companyId });
    await audit(db(), req, {
      action: 'admin.user_created',
      userId: u.id,
      companyId: u.companyId,
      entity: 'user',
      entityId: created!.id,
      details: { role: b.role, email: b.email },
    });
    return reply.status(201).send(created);
  });

  app.patch<{ Params: { id: string } }>('/api/admin/users/:id', async (req, reply) => {
    const u = me(req);
    const target = await ownUser(u.companyId, req.params.id);
    if (!target) return fail(reply, 404, 'not_found');
    const b = parseBody(updateUserBody, req.body, reply);
    if (!b) return;

    const demote = b.role !== undefined && b.role !== 'admin' && target.role === 'admin';
    const deactivate = b.active === false && target.status !== 'inactive';
    if (target.id === u.id && (demote || deactivate)) return fail(reply, 400, 'self_protection');
    if (
      target.role === 'admin' &&
      target.status === 'active' &&
      (demote || deactivate) &&
      (await activeAdminCount(db(), u.companyId)) <= 1
    )
      return fail(reply, 409, 'last_admin');

    const patch: Partial<typeof users.$inferInsert> = {};
    if (b.name) patch.name = b.name;
    if (b.role) patch.role = b.role;
    if (b.departmentId !== undefined) {
      if (b.departmentId && !(await departmentBelongs(db(), b.departmentId, u.companyId)))
        return reply.status(400).send({ error: 'invalid_input', fields: ['departmentId'] });
      patch.departmentId = b.departmentId;
    }
    if (b.email && b.email !== target.email.toLowerCase()) {
      if (!belongsToCompany(b.email, await domainsOf(db(), u.companyId)))
        return fail(reply, 400, 'email_domain');
      if (await emailTaken(db(), b.email, target.id)) return fail(reply, 409, 'email_taken');
      patch.email = b.email;
      patch.isExternal = isExternalEmail(b.email);
    }
    if (b.active === false) patch.status = 'inactive';
    if (b.active === true && target.status === 'inactive')
      patch.status = target.passwordHash ? 'active' : 'invited';

    const [updated] = await db()
      .update(users)
      .set(patch)
      .where(eq(users.id, target.id))
      .returning(userColumns);
    if (deactivate || patch.email) await destroyAllSessions(db(), target.id);
    await audit(db(), req, {
      action: 'admin.user_updated',
      userId: u.id,
      companyId: u.companyId,
      entity: 'user',
      entityId: target.id,
      details: {
        changed: Object.keys(patch),
        fromRole: target.role,
        toRole: patch.role,
        email: target.email,
      },
    });
    return updated;
  });

  /** Löschen = Pseudonymisieren (R-10). Admins nur durch Admins derselben Firma (S-13); übrige Admins werden informiert. */
  app.delete<{ Params: { id: string } }>('/api/admin/users/:id', async (req, reply) => {
    const u = me(req);
    const target = await ownUser(u.companyId, req.params.id);
    if (!target) return fail(reply, 404, 'not_found');
    if (target.id === u.id) return fail(reply, 400, 'self_protection');
    if (
      target.role === 'admin' &&
      target.status === 'active' &&
      (await activeAdminCount(db(), u.companyId)) <= 1
    )
      return fail(reply, 409, 'last_admin');
    const tag = target.id.slice(0, 8);
    await db()
      .update(users)
      .set({
        status: 'deleted',
        name: `Gelöschter Nutzer #${tag}`,
        email: `deleted-${target.id}@deleted.invalid`,
        passwordHash: null,
        isExternal: false,
        departmentId: null,
      })
      .where(eq(users.id, target.id));
    await destroyAllSessions(db(), target.id);
    await audit(db(), req, {
      action: 'admin.user_deleted',
      userId: u.id,
      companyId: u.companyId,
      entity: 'user',
      entityId: target.id,
      details: { role: target.role },
    });
    if (target.role === 'admin')
      await notifyCompanyAdmins(app, u.companyId, u, 'admin_deleted', {
        name: target.name,
        email: target.email,
      });
    return reply.status(204).send();
  });

  /** Passwort zurücksetzen per Button (S-01): altes Passwort sofort ungültig, Sitzungen beendet, neuer Einmal-Link. */
  app.post<{ Params: { id: string } }>('/api/admin/users/:id/password-reset', async (req, reply) => {
    const u = me(req);
    const target = await ownUser(u.companyId, req.params.id);
    if (!target) return fail(reply, 404, 'not_found');
    if (target.status === 'inactive') return fail(reply, 409, 'user_inactive');
    await adminPasswordReset(app, target);
    await audit(db(), req, {
      action: 'admin.password_reset',
      userId: u.id,
      companyId: u.companyId,
      entity: 'user',
      entityId: target.id,
      details: { email: target.email },
    });
    return reply.status(202).send({ status: 'link_sent' });
  });

  app.post<{ Params: { id: string } }>('/api/admin/users/:id/invitation', async (req, reply) => {
    const u = me(req);
    const target = await ownUser(u.companyId, req.params.id);
    if (!target || target.status !== 'invited') return fail(reply, 404, 'not_found');
    await sendInvitation(app, target);
    return reply.status(202).send({ status: 'invitation_sent' });
  });

  app.get('/api/admin/company', async (req) => {
    const [c] = await db()
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logoUrl: companies.logoUrl,
        logoAlt: companies.logoAlt,
        benchmarkOptIn: companies.benchmarkOptIn,
        industryCode: industries.code,
      })
      .from(companies)
      .leftJoin(industries, eq(industries.id, companies.industryId))
      .where(eq(companies.id, me(req).companyId));
    return { ...c, domains: (await domainsOf(db(), me(req).companyId)).sort() };
  });

  app.patch('/api/admin/company', async (req, reply) => {
    const b = parseBody(companyBody, req.body, reply);
    if (!b) return;
    const patch: Partial<typeof companies.$inferInsert> = {};
    if (b.name) patch.name = b.name;
    if (b.logoUrl !== undefined) patch.logoUrl = b.logoUrl;
    if (b.logoAlt !== undefined) patch.logoAlt = b.logoAlt;
    if (b.benchmarkOptIn !== undefined) patch.benchmarkOptIn = b.benchmarkOptIn;
    if (b.industryCode) {
      const [ind] = await db()
        .select({ id: industries.id })
        .from(industries)
        .where(and(eq(industries.code, b.industryCode), eq(industries.active, true)))
        .limit(1);
      if (!ind) return reply.status(400).send({ error: 'invalid_input', fields: ['industryCode'] });
      patch.industryId = ind.id;
    }
    await db()
      .update(companies)
      .set(patch)
      .where(eq(companies.id, me(req).companyId));
    await audit(db(), req, {
      action: 'admin.company_updated',
      userId: me(req).id,
      companyId: me(req).companyId,
      details: { changed: Object.keys(patch) },
    });
    return { status: 'ok' };
  });

  /** Zugelassene E-Mail-Domains der eigenen Firma (M2, M6). */
  app.post('/api/admin/company/domains', async (req, reply) => {
    const b = parseBody(domainBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    const problem = await domainProblem(db(), b.domain, u.companyId);
    if (problem) return fail(reply, problem === 'domain_taken' ? 409 : 400, problem);
    await db()
      .insert(companyDomains)
      .values({ companyId: u.companyId, domain: b.domain })
      .onConflictDoNothing();
    await audit(db(), req, {
      action: 'admin.domain_added',
      userId: u.id,
      companyId: u.companyId,
      details: { domain: b.domain },
    });
    return reply.status(201).send({ domains: (await domainsOf(db(), u.companyId)).sort() });
  });

  /** Die letzte Domain bleibt; eine Domain mit Nutzern kann nicht entfernt werden (Validierung Abschnitt 5). */
  app.delete<{ Params: { domain: string } }>('/api/admin/company/domains/:domain', async (req, reply) => {
    const u = me(req);
    const domain = req.params.domain.toLowerCase();
    const own = await domainsOf(db(), u.companyId);
    if (!own.includes(domain)) return fail(reply, 404, 'not_found');
    if (own.length <= 1) return fail(reply, 409, 'last_domain');
    const [inUse] = await db()
      .select({ n: count() })
      .from(users)
      .where(
        and(
          eq(users.companyId, u.companyId),
          ne(users.status, 'deleted'),
          sql`lower(split_part(${users.email}, '@', 2)) = ${domain}`,
        ),
      );
    if ((inUse?.n ?? 0) > 0) return fail(reply, 409, 'domain_in_use');
    await db()
      .delete(companyDomains)
      .where(and(eq(companyDomains.companyId, u.companyId), eq(companyDomains.domain, domain)));
    await audit(db(), req, {
      action: 'admin.domain_removed',
      userId: u.id,
      companyId: u.companyId,
      details: { domain },
    });
    return { domains: own.filter((d) => d !== domain).sort() };
  });
};

export const industryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/industries', { preHandler: requireAuth() }, async () =>
    app.deps
      .db!.db.select({ code: industries.code, nameDe: industries.nameDe, nameEn: industries.nameEn })
      .from(industries)
      .where(eq(industries.active, true))
      .orderBy(asc(industries.nameDe)),
  );
};
