import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { and, asc, count, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { belongsToCompany, companySlugSchema, emailSchema, isExternalEmail } from '@ai-tpi/shared';
import {
  activeAdminCount,
  adminPasswordReset,
  companyInfo,
  domainProblem,
  domainsOf,
  emailTaken,
  fail,
  me,
  notifyCompanyAdmins,
  parseBody,
  sendInvitation,
} from '../admin/helpers';
import { audit } from '../audit';
import { destroyAllSessions } from '../auth/sessions';
import { auditLog, companies, companyDomains, industries, users } from '../db/schema';
import type { NoticeAction } from '../mail/templates';
import { requireAuth } from '../plugins/auth';
import { logoUrlSchema } from './admin';

/** S-15: höchstens 3 firmenübergreifende Passwort-Resets je Admin und Kalendertag (Europe/Berlin). */
export const CROSS_RESET_LIMIT = 3;
const CROSS_RESET_ACTIONS = ['admin.cross_password_reset', 'admin.cross_password_reset_unknown'];

const adminBody = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema });
const newCompanyBody = z.object({
  company: z.object({
    name: z.string().trim().min(2).max(120),
    slug: companySlugSchema,
    domains: z.array(z.string().trim().toLowerCase().max(253)).min(1).max(10),
    industryCode: z.string().min(2).max(5),
    logoUrl: logoUrlSchema.optional(),
  }),
  admin: adminBody,
});
/** Selbst angelegte Admins dürfen nur auf eine Nicht-Admin-Rolle umgestellt werden (M4). */
const createdAdminPatch = z
  .object({ role: z.enum(['assessor', 'respondent', 'reader']).optional(), active: z.boolean().optional() })
  .strict();
const resetBody = z.object({ email: emailSchema });
const uuid = z.string().uuid();

/**
 * Firmenübergreifende Admin-Funktionen (S-01, S-10, S-13, S-14, S-15; M3, M4, M4a–M4e).
 * Der handelnde Admin sieht von anderen Firmen nur Name und Kürzel – keine Nutzerlisten, keine Fachdaten.
 */
export const adminCrossRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth(['admin']));
  const db = () => app.deps.db!.db;

  async function crossResetsToday(userId: string): Promise<number> {
    const [r] = await db()
      .select({ n: count() })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          inArray(auditLog.action, CROSS_RESET_ACTIONS),
          gte(
            auditLog.createdAt,
            sql`(date_trunc('day', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin')`,
          ),
        ),
      );
    return r?.n ?? 0;
  }

  /** Von mir angelegter Admin einer anderen Firma (M4) – sonst 404. */
  async function createdByMe(req: FastifyRequest, id: string) {
    if (!uuid.safeParse(id).success) return undefined;
    const u = me(req);
    const [t] = await db()
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.createdByUserId, u.id),
          ne(users.companyId, u.companyId),
          ne(users.status, 'deleted'),
        ),
      )
      .limit(1);
    return t;
  }

  app.get('/api/admin/companies', async (req) =>
    db()
      .select({ id: companies.id, name: companies.name, slug: companies.slug })
      .from(companies)
      .where(and(ne(companies.id, me(req).companyId), eq(companies.active, true)))
      .orderBy(asc(companies.name)),
  );

  /** (a) Neue Firma + ersten Admin anlegen (M3). */
  app.post('/api/admin/companies', async (req, reply) => {
    const b = parseBody(newCompanyBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    const domains = [...new Set(b.company.domains)];
    for (const d of domains) {
      const problem = await domainProblem(db(), d);
      if (problem)
        return reply.status(problem === 'domain_taken' ? 409 : 400).send({ error: problem, domain: d });
    }
    if (!belongsToCompany(b.admin.email, domains)) return fail(reply, 400, 'email_domain');
    const [slugUsed] = await db()
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, b.company.slug))
      .limit(1);
    if (slugUsed) return fail(reply, 409, 'slug_taken');
    if (await emailTaken(db(), b.admin.email)) return fail(reply, 409, 'email_taken');
    const [industry] = await db()
      .select({ id: industries.id })
      .from(industries)
      .where(and(eq(industries.code, b.company.industryCode), eq(industries.active, true)))
      .limit(1);
    if (!industry) return reply.status(400).send({ error: 'invalid_input', fields: ['company'] });

    const created = await db().transaction(async (tx) => {
      const [c] = await tx
        .insert(companies)
        .values({
          name: b.company.name,
          slug: b.company.slug,
          industryId: industry.id,
          logoUrl: b.company.logoUrl ?? null,
          logoAlt: b.company.name,
          createdByUserId: u.id,
        })
        .returning({ id: companies.id, name: companies.name, slug: companies.slug });
      await tx.insert(companyDomains).values(domains.map((domain) => ({ companyId: c!.id, domain })));
      const [a] = await tx
        .insert(users)
        .values({
          companyId: c!.id,
          name: b.admin.name,
          email: b.admin.email,
          role: 'admin',
          status: 'invited',
          isExternal: isExternalEmail(b.admin.email),
          createdByUserId: u.id,
        })
        .returning({ id: users.id, name: users.name, email: users.email, companyId: users.companyId });
      return { company: c!, admin: a! };
    });
    await sendInvitation(app, created.admin);
    const entry = {
      userId: u.id,
      companyId: u.companyId,
      targetCompanyId: created.company.id,
      entity: 'user',
      entityId: created.admin.id,
      details: { company: created.company.slug, email: created.admin.email },
    };
    await audit(db(), req, { action: 'admin.company_created', ...entry });
    return reply.status(201).send(created);
  });

  /** (b) Weiteren Admin für eine bestehende Firma anlegen (M3); deren Admins werden informiert (M4b). */
  app.post<{ Params: { id: string } }>('/api/admin/companies/:id/admins', async (req, reply) => {
    const u = me(req);
    if (!uuid.safeParse(req.params.id).success) return fail(reply, 404, 'not_found');
    if (req.params.id === u.companyId) return fail(reply, 400, 'own_company');
    const target = await companyInfo(db(), req.params.id);
    if (!target) return fail(reply, 404, 'not_found');
    const b = parseBody(adminBody, req.body, reply);
    if (!b) return;
    if (!belongsToCompany(b.email, await domainsOf(db(), target.id))) return fail(reply, 400, 'email_domain');
    if (await emailTaken(db(), b.email)) return fail(reply, 409, 'email_taken');
    const [a] = await db()
      .insert(users)
      .values({
        companyId: target.id,
        name: b.name,
        email: b.email,
        role: 'admin',
        status: 'invited',
        isExternal: isExternalEmail(b.email),
        createdByUserId: u.id,
      })
      .returning({ id: users.id, name: users.name, email: users.email, companyId: users.companyId });
    await sendInvitation(app, a!);
    await audit(db(), req, {
      action: 'admin.cross_admin_created',
      userId: u.id,
      companyId: u.companyId,
      targetCompanyId: target.id,
      entity: 'user',
      entityId: a!.id,
      details: { email: a!.email },
    });
    await notifyCompanyAdmins(app, target.id, u, 'admin_created', { name: a!.name, email: a!.email });
    return reply.status(201).send({ company: target, admin: a });
  });

  /** Liste „Von mir angelegte Admins“ (M4) – nur Konten anderer Firmen, die ich angelegt habe. */
  app.get('/api/admin/created-admins', async (req) => {
    const u = me(req);
    return db()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(users)
      .innerJoin(companies, eq(companies.id, users.companyId))
      .where(
        and(eq(users.createdByUserId, u.id), ne(users.companyId, u.companyId), ne(users.status, 'deleted')),
      )
      .orderBy(asc(companies.name), asc(users.name));
  });

  app.patch<{ Params: { id: string } }>('/api/admin/created-admins/:id', async (req, reply) => {
    const u = me(req);
    const t = await createdByMe(req, req.params.id);
    if (!t) return fail(reply, 404, 'not_found');
    const b = parseBody(createdAdminPatch, req.body, reply);
    if (!b) return;
    const demote = b.role !== undefined && t.role === 'admin';
    const deactivate = b.active === false && t.status !== 'inactive';
    // M4a: Auch ein fremder Admin kann den letzten aktiven Admin einer Firma nicht herabstufen/deaktivieren.
    if (
      t.role === 'admin' &&
      t.status === 'active' &&
      (demote || deactivate) &&
      (await activeAdminCount(db(), t.companyId)) <= 1
    )
      return fail(reply, 409, 'last_admin');
    const patch: Partial<typeof users.$inferInsert> = {};
    const notices: NoticeAction[] = [];
    if (b.role && b.role !== t.role) {
      patch.role = b.role;
      notices.push('role_changed');
    }
    if (deactivate) {
      patch.status = 'inactive';
      notices.push('user_deactivated');
    }
    if (b.active === true && t.status === 'inactive') {
      patch.status = t.passwordHash ? 'active' : 'invited';
      notices.push('user_activated');
    }
    if (!Object.keys(patch).length) return { id: t.id, role: t.role, status: t.status };
    const [updated] = await db()
      .update(users)
      .set(patch)
      .where(eq(users.id, t.id))
      .returning({ id: users.id, role: users.role, status: users.status });
    if (deactivate) await destroyAllSessions(db(), t.id);
    await audit(db(), req, {
      action: 'admin.cross_user_updated',
      userId: u.id,
      companyId: u.companyId,
      targetCompanyId: t.companyId,
      entity: 'user',
      entityId: t.id,
      details: { changed: Object.keys(patch), fromRole: t.role, toRole: patch.role, email: t.email },
    });
    const details = patch.role ? `${t.role} → ${patch.role}` : undefined;
    for (const n of notices)
      await notifyCompanyAdmins(
        app,
        t.companyId,
        u,
        n,
        { name: t.name, email: t.email },
        n === 'role_changed' ? details : undefined,
      );
    return updated;
  });

  app.post<{ Params: { id: string } }>('/api/admin/created-admins/:id/invitation', async (req, reply) => {
    const t = await createdByMe(req, req.params.id);
    if (!t || t.status !== 'invited') return fail(reply, 404, 'not_found');
    await sendInvitation(app, t);
    return reply.status(202).send({ status: 'invitation_sent' });
  });

  async function crossReset(req: FastifyRequest, t: typeof users.$inferSelect) {
    const u = me(req);
    await adminPasswordReset(app, t);
    await audit(db(), req, {
      action: 'admin.cross_password_reset',
      userId: u.id,
      companyId: u.companyId,
      targetCompanyId: t.companyId,
      entity: 'user',
      entityId: t.id,
      details: { email: t.email },
    });
    await notifyCompanyAdmins(app, t.companyId, u, 'password_reset', { name: t.name, email: t.email });
  }

  async function limitReached(req: FastifyRequest): Promise<boolean> {
    const u = me(req);
    if ((await crossResetsToday(u.id)) < CROSS_RESET_LIMIT) return false;
    await audit(db(), req, {
      action: 'admin.cross_password_reset_limited',
      userId: u.id,
      companyId: u.companyId,
    });
    return true;
  }

  app.post<{ Params: { id: string } }>('/api/admin/created-admins/:id/password-reset', async (req, reply) => {
    const t = await createdByMe(req, req.params.id);
    if (!t) return fail(reply, 404, 'not_found');
    if (t.status === 'inactive') return fail(reply, 409, 'user_inactive');
    if (await limitReached(req)) return fail(reply, 429, 'reset_limit');
    await crossReset(req, t);
    return reply.status(202).send({ status: 'link_sent' });
  });

  /**
   * Passwort für Nutzer einer anderen Firma zurücksetzen – nur per vollständiger E-Mail-Adresse (S-14).
   * Antwort ist für bekannte und unbekannte Adressen gleich (202); auch unbekannte zählen zum Tageslimit (S-15).
   */
  app.get('/api/admin/cross-password-reset', async (req) => {
    const used = await crossResetsToday(me(req).id);
    return { limit: CROSS_RESET_LIMIT, used, remaining: Math.max(0, CROSS_RESET_LIMIT - used) };
  });

  app.post('/api/admin/cross-password-reset', async (req, reply) => {
    const b = parseBody(resetBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    if (belongsToCompany(b.email, await domainsOf(db(), u.companyId))) return fail(reply, 400, 'own_company');
    if (await limitReached(req)) return fail(reply, 429, 'reset_limit');
    const [t] = await db()
      .select()
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${b.email}`,
          ne(users.companyId, u.companyId),
          inArray(users.status, ['active', 'invited']),
        ),
      )
      .limit(1);
    if (t) await crossReset(req, t);
    else
      await audit(db(), req, {
        action: 'admin.cross_password_reset_unknown',
        userId: u.id,
        companyId: u.companyId,
      });
    return reply.status(202).send({ status: 'accepted' });
  });
};
