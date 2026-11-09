import type { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AI_PROVIDERS, testAiConnection } from '../admin/ai-test';
import { fail, me, parseBody } from '../admin/helpers';
import { audit } from '../audit';
import { maskSecret, SecretBox } from '../auth/secrets';
import { aiModules, companyMailConfig, departments, users } from '../db/schema';
import { companySmtp } from '../mail/company';
import { testMail } from '../mail/templates';
import { requireAuth } from '../plugins/auth';

const uuid = z.string().uuid();
const departmentBody = z.object({ name: z.string().trim().min(2).max(80) });
const departmentPatch = z
  .object({ name: z.string().trim().min(2).max(80).optional(), active: z.boolean().optional() })
  .strict();

/** Absender: „name@firma.de“ oder „Name <name@firma.de>“. */
const fromSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^(?:[^<>@]*<\s*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\s*>|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/);
const mailBody = z
  .object({
    transport: z.enum(['system', 'smtp']),
    host: z.string().trim().max(253).optional().nullable(),
    port: z.number().int().min(1).max(65535).optional().nullable(),
    secure: z.boolean().optional(),
    username: z.string().trim().max(200).optional().nullable(),
    /** Fehlt das Feld, bleibt das gespeicherte Passwort erhalten; null löscht es. */
    password: z.string().max(500).optional().nullable(),
    fromAddress: z
      .union([fromSchema, z.literal('')])
      .optional()
      .nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.transport !== 'smtp') return;
    if (!v.host) ctx.addIssue({ code: 'custom', path: ['host'], message: 'required' });
    if (!v.port) ctx.addIssue({ code: 'custom', path: ['port'], message: 'required' });
  });

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'http_only');
const aiFields = {
  name: z.string().trim().min(2).max(60),
  mode: z.enum(['rules', 'local', 'cloud']),
  provider: z.enum([...AI_PROVIDERS, 'rules']),
  baseUrl: httpUrl.nullable().optional(),
  model: z.string().trim().max(120).nullable().optional(),
  /** Fehlt das Feld, bleibt der gespeicherte Schlüssel erhalten; null löscht ihn. */
  apiKey: z.string().trim().max(500).nullable().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(200_000).optional(),
  timeoutSec: z.number().int().min(5).max(300).optional(),
  sendComments: z.boolean().optional(),
  pseudonymize: z.boolean().optional(),
  promptTemplate: z.string().max(20_000).nullable().optional(),
  isDefault: z.boolean().optional(),
};
/** Validierung Abschnitt 5: Basis-URL Pflicht außer im Modus „regelbasiert“; Timeout 5–300 s; Temperatur 0–1. */
function aiRules(v: { mode?: string; baseUrl?: string | null }, ctx: z.RefinementCtx) {
  if (v.mode && v.mode !== 'rules' && !v.baseUrl)
    ctx.addIssue({ code: 'custom', path: ['baseUrl'], message: 'required' });
}
const aiCreate = z.object(aiFields).strict().superRefine(aiRules);
const aiPatch = z.object(aiFields).partial().strict();

/**
 * Firmeneigene Konfiguration (M1, S-04): Abteilungen, Mailserver, KI-Module.
 * Geheimnisse werden verschlüsselt gespeichert und nie im Klartext ausgeliefert.
 */
export const adminConfigRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth(['admin']));
  const db = () => app.deps.db!.db;
  const box = new SecretBox(app.deps.config.SECRET_ENCRYPTION_KEY);

  // ---------- Abteilungen ----------
  async function ownDepartment(companyId: string, id: string) {
    if (!uuid.safeParse(id).success) return undefined;
    const [d] = await db()
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1);
    return d;
  }
  async function departmentNameTaken(companyId: string, name: string, exceptId?: string) {
    const [d] = await db()
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.companyId, companyId),
          sql`lower(${departments.name}) = ${name.toLowerCase()}`,
          exceptId ? ne(departments.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return !!d;
  }

  app.get('/api/admin/departments', async (req) =>
    db()
      .select({
        id: departments.id,
        name: departments.name,
        active: departments.active,
        userCount: sql<number>`(select count(*)::int from "app_user" u where u."department_id" = "department"."id" and u."status" <> 'deleted')`,
      })
      .from(departments)
      .where(eq(departments.companyId, me(req).companyId))
      .orderBy(asc(departments.name)),
  );

  app.post('/api/admin/departments', async (req, reply) => {
    const b = parseBody(departmentBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    if (await departmentNameTaken(u.companyId, b.name)) return fail(reply, 409, 'name_taken');
    const [d] = await db()
      .insert(departments)
      .values({ companyId: u.companyId, name: b.name })
      .returning({ id: departments.id, name: departments.name, active: departments.active });
    await audit(db(), req, {
      action: 'admin.department_created',
      userId: u.id,
      companyId: u.companyId,
      entity: 'department',
      entityId: d!.id,
      details: { name: b.name },
    });
    return reply.status(201).send({ ...d, userCount: 0 });
  });

  app.patch<{ Params: { id: string } }>('/api/admin/departments/:id', async (req, reply) => {
    const u = me(req);
    const d = await ownDepartment(u.companyId, req.params.id);
    if (!d) return fail(reply, 404, 'not_found');
    const b = parseBody(departmentPatch, req.body, reply);
    if (!b) return;
    if (b.name && (await departmentNameTaken(u.companyId, b.name, d.id)))
      return fail(reply, 409, 'name_taken');
    const [updated] = await db()
      .update(departments)
      .set(b)
      .where(eq(departments.id, d.id))
      .returning({ id: departments.id, name: departments.name, active: departments.active });
    await audit(db(), req, {
      action: 'admin.department_updated',
      userId: u.id,
      companyId: u.companyId,
      entity: 'department',
      entityId: d.id,
      details: { from: d.name, ...b },
    });
    return updated;
  });

  /** Abteilungen mit zugeordneten Nutzern können nicht gelöscht, nur deaktiviert werden. */
  app.delete<{ Params: { id: string } }>('/api/admin/departments/:id', async (req, reply) => {
    const u = me(req);
    const d = await ownDepartment(u.companyId, req.params.id);
    if (!d) return fail(reply, 404, 'not_found');
    const [r] = await db()
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.departmentId, d.id), ne(users.status, 'deleted')));
    if ((r?.n ?? 0) > 0) return fail(reply, 409, 'department_in_use');
    await db().update(users).set({ departmentId: null }).where(eq(users.departmentId, d.id));
    await db().delete(departments).where(eq(departments.id, d.id));
    await audit(db(), req, {
      action: 'admin.department_deleted',
      userId: u.id,
      companyId: u.companyId,
      entity: 'department',
      entityId: d.id,
      details: { name: d.name },
    });
    return reply.status(204).send();
  });

  // ---------- E-Mail (je Firma) ----------
  async function mailView(companyId: string) {
    const [c] = await db()
      .select()
      .from(companyMailConfig)
      .where(eq(companyMailConfig.companyId, companyId))
      .limit(1);
    return {
      transport: c?.transport ?? 'system',
      host: c?.host ?? null,
      port: c?.port ?? null,
      secure: c?.secure ?? false,
      username: c?.username ?? null,
      fromAddress: c?.fromAddress ?? null,
      hasPassword: !!c?.passwordEnc,
      systemTransport: app.deps.config.MAIL_TRANSPORT === 'sendmail' ? 'sendmail' : 'smtp',
    };
  }

  app.get('/api/admin/mail-config', async (req) => mailView(me(req).companyId));

  app.put('/api/admin/mail-config', async (req, reply) => {
    const b = parseBody(mailBody, req.body, reply);
    if (!b) return;
    const u = me(req);
    const values = {
      transport: b.transport,
      host: b.host || null,
      port: b.port ?? null,
      secure: b.secure ?? false,
      username: b.username || null,
      fromAddress: b.fromAddress || null,
      updatedAt: new Date(),
      ...(b.password !== undefined ? { passwordEnc: b.password ? box.encrypt(b.password) : null } : {}),
    };
    await db()
      .insert(companyMailConfig)
      .values({ companyId: u.companyId, ...values })
      .onConflictDoUpdate({ target: companyMailConfig.companyId, set: values });
    await audit(db(), req, {
      action: 'admin.mail_config_updated',
      userId: u.id,
      companyId: u.companyId,
      details: { transport: b.transport, host: values.host, passwordChanged: b.password !== undefined },
    });
    return mailView(u.companyId);
  });

  /** Test-Mail an den angemeldeten Admin über den Mailserver der Firma. Fehler werden hier gemeldet (502). */
  app.post('/api/admin/mail-config/test', async (req, reply) => {
    const u = me(req);
    const smtp = await companySmtp(app, u.companyId);
    const via = smtp
      ? `SMTP ${smtp.host}:${smtp.port}`
      : app.deps.config.MAIL_TRANSPORT === 'sendmail'
        ? 'sendmail'
        : 'SMTP (Standard)';
    try {
      await app.deps.mailer!.send(
        testMail({ to: u.email, name: u.name, companyName: u.companyName, via }),
        smtp,
      );
    } catch (err) {
      req.log.warn({ err }, 'test mail failed');
      await audit(db(), req, {
        action: 'admin.mail_test_failed',
        userId: u.id,
        companyId: u.companyId,
        details: { via },
      });
      return fail(reply, 502, 'mail_failed');
    }
    await audit(db(), req, {
      action: 'admin.mail_test_sent',
      userId: u.id,
      companyId: u.companyId,
      details: { via },
    });
    return { status: 'sent', to: u.email, via };
  });

  // ---------- KI-Module (je Firma) ----------
  type AiRow = typeof aiModules.$inferSelect;
  const aiView = (m: AiRow) => {
    const { apiKeyEnc, companyId: _c, ...rest } = m;
    return { ...rest, hasApiKey: !!apiKeyEnc, apiKeyMasked: maskSecret(box.decrypt(apiKeyEnc)) };
  };
  async function ownModule(companyId: string, id: string) {
    if (!uuid.safeParse(id).success) return undefined;
    const [m] = await db()
      .select()
      .from(aiModules)
      .where(and(eq(aiModules.id, id), eq(aiModules.companyId, companyId)))
      .limit(1);
    return m;
  }
  async function moduleNameTaken(companyId: string, name: string, exceptId?: string) {
    const [m] = await db()
      .select({ id: aiModules.id })
      .from(aiModules)
      .where(
        and(
          eq(aiModules.companyId, companyId),
          sql`lower(${aiModules.name}) = ${name.toLowerCase()}`,
          exceptId ? ne(aiModules.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return !!m;
  }
  async function moduleCount(companyId: string) {
    const [r] = await db().select({ n: count() }).from(aiModules).where(eq(aiModules.companyId, companyId));
    return r?.n ?? 0;
  }

  app.get('/api/admin/ai-modules', async (req) => {
    const rows = await db()
      .select()
      .from(aiModules)
      .where(eq(aiModules.companyId, me(req).companyId))
      .orderBy(asc(aiModules.name));
    return rows.map(aiView);
  });

  app.post('/api/admin/ai-modules', async (req, reply) => {
    const b = parseBody(aiCreate, req.body, reply);
    if (!b) return;
    const u = me(req);
    if (await moduleNameTaken(u.companyId, b.name)) return fail(reply, 409, 'name_taken');
    const rules = b.mode === 'rules';
    const isDefault = b.isDefault ?? (await moduleCount(u.companyId)) === 0;
    const { apiKey, ...rest } = b;
    const created = await db().transaction(async (tx) => {
      if (isDefault)
        await tx.update(aiModules).set({ isDefault: false }).where(eq(aiModules.companyId, u.companyId));
      const [m] = await tx
        .insert(aiModules)
        .values({
          ...rest,
          companyId: u.companyId,
          provider: rules ? 'rules' : b.provider,
          baseUrl: rules ? null : (b.baseUrl ?? null),
          apiKeyEnc: !rules && apiKey ? box.encrypt(apiKey) : null,
          isDefault,
        })
        .returning();
      return m!;
    });
    await audit(db(), req, {
      action: 'admin.ai_module_created',
      userId: u.id,
      companyId: u.companyId,
      entity: 'ai_module',
      entityId: created.id,
      details: { name: created.name, mode: created.mode, provider: created.provider },
    });
    return reply.status(201).send(aiView(created));
  });

  app.patch<{ Params: { id: string } }>('/api/admin/ai-modules/:id', async (req, reply) => {
    const u = me(req);
    const m = await ownModule(u.companyId, req.params.id);
    if (!m) return fail(reply, 404, 'not_found');
    const b = parseBody(aiPatch, req.body, reply);
    if (!b) return;
    const mode = b.mode ?? m.mode;
    const baseUrl = b.baseUrl !== undefined ? b.baseUrl : m.baseUrl;
    if (mode !== 'rules' && !baseUrl)
      return reply.status(400).send({ error: 'invalid_input', fields: ['baseUrl'] });
    if (b.name && (await moduleNameTaken(u.companyId, b.name, m.id))) return fail(reply, 409, 'name_taken');
    if (b.isDefault === false && m.isDefault) return fail(reply, 409, 'default_required');
    const { apiKey, ...rest } = b;
    const patch: Partial<typeof aiModules.$inferInsert> = { ...rest };
    if (mode === 'rules') Object.assign(patch, { provider: 'rules', baseUrl: null, apiKeyEnc: null });
    else if (apiKey !== undefined) patch.apiKeyEnc = apiKey ? box.encrypt(apiKey) : null;
    const updated = await db().transaction(async (tx) => {
      if (b.isDefault)
        await tx.update(aiModules).set({ isDefault: false }).where(eq(aiModules.companyId, u.companyId));
      const [r] = await tx.update(aiModules).set(patch).where(eq(aiModules.id, m.id)).returning();
      return r!;
    });
    await audit(db(), req, {
      action: 'admin.ai_module_updated',
      userId: u.id,
      companyId: u.companyId,
      entity: 'ai_module',
      entityId: m.id,
      details: { changed: Object.keys(b).map((k) => (k === 'apiKey' ? 'apiKey' : k)) },
    });
    return aiView(updated);
  });

  app.delete<{ Params: { id: string } }>('/api/admin/ai-modules/:id', async (req, reply) => {
    const u = me(req);
    const m = await ownModule(u.companyId, req.params.id);
    if (!m) return fail(reply, 404, 'not_found');
    await db().delete(aiModules).where(eq(aiModules.id, m.id));
    if (m.isDefault) {
      // Nächstes Modul (alphabetisch) wird Standard, damit immer eines vorbelegt ist (S-09).
      const [next] = await db()
        .select({ id: aiModules.id })
        .from(aiModules)
        .where(eq(aiModules.companyId, u.companyId))
        .orderBy(asc(aiModules.name))
        .limit(1);
      if (next) await db().update(aiModules).set({ isDefault: true }).where(eq(aiModules.id, next.id));
    }
    await audit(db(), req, {
      action: 'admin.ai_module_deleted',
      userId: u.id,
      companyId: u.companyId,
      entity: 'ai_module',
      entityId: m.id,
      details: { name: m.name },
    });
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>('/api/admin/ai-modules/:id/test', async (req, reply) => {
    const u = me(req);
    const m = await ownModule(u.companyId, req.params.id);
    if (!m) return fail(reply, 404, 'not_found');
    const result = await testAiConnection({
      mode: m.mode,
      provider: m.provider,
      baseUrl: m.baseUrl,
      apiKey: box.decrypt(m.apiKeyEnc),
      timeoutSec: m.timeoutSec,
    });
    await audit(db(), req, {
      action: 'admin.ai_module_tested',
      userId: u.id,
      companyId: u.companyId,
      entity: 'ai_module',
      entityId: m.id,
      details: { ok: result.ok, error: result.error, status: result.status },
    });
    return result;
  });
};
