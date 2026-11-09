import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { and, count, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  assessPassword,
  companySlugSchema,
  emailDomain,
  emailSchema,
  isExternalEmail,
  userInputsFrom,
} from '@ai-tpi/shared';
import { audit } from '../audit';
import { hashPassword } from '../auth/crypto';
import { createSession } from '../auth/sessions';
import { blockedDomains, companies, companyDomains, industries, setupState, users } from '../db/schema';
import { setSessionCookie } from '../plugins/auth';
import { isLoopbackAddress } from '../security/localhost';

const setupBody = z.object({
  companyName: z.string().trim().min(2).max(120),
  companySlug: companySlugSchema,
  industryCode: z.string().min(2).max(5),
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string().max(256),
  passwordRepeat: z.string().max(256),
});

/**
 * Ersteinrichtung (R-06): Der erste Nutzer, der sich über localhost registriert, wird Admin und legt seine Firma an.
 * Nur solange kein Nutzer existiert, nur über localhost (Socket-Adresse), abschaltbar per SETUP_ENABLED.
 * In allen anderen Fällen 404, damit die Funktion von außen unsichtbar ist.
 */
export const setupRoutes: FastifyPluginAsync = async (app) => {
  async function setupAllowed(req: FastifyRequest): Promise<boolean> {
    if (!app.deps.config.SETUP_ENABLED) return false;
    if (!isLoopbackAddress(req.socket.remoteAddress)) return false;
    if (!app.deps.db) return true;
    const [row] = await app.deps.db.db.select({ n: count() }).from(users);
    return (row?.n ?? 0) === 0;
  }

  app.get('/api/setup/status', async (req, reply) => {
    if (!(await setupAllowed(req))) return reply.status(404).send({ error: 'not_found' });
    const list = app.deps.db
      ? await app.deps.db.db
          .select({ code: industries.code, nameDe: industries.nameDe, nameEn: industries.nameEn })
          .from(industries)
          .where(eq(industries.active, true))
          .orderBy(industries.nameDe)
      : [];
    return { available: true, industries: list };
  });

  app.post('/api/setup', async (req, reply) => {
    if (!app.deps.db || !(await setupAllowed(req))) return reply.status(404).send({ error: 'not_found' });
    const parsed = setupBody.safeParse(req.body);
    if (!parsed.success)
      return reply
        .status(400)
        .send({ error: 'invalid_input', fields: parsed.error.issues.map((i) => i.path[0]) });
    const b = parsed.data;
    if (b.password !== b.passwordRepeat) return reply.status(400).send({ error: 'password_mismatch' });
    const assessment = assessPassword(b.password, userInputsFrom([b.name, b.email, b.companyName]));
    if (!assessment.acceptable)
      return reply
        .status(400)
        .send({ error: 'password_policy', rules: assessment.rules, strength: assessment.strength });

    const db = app.deps.db.db;
    const domain = emailDomain(b.email);
    const [blocked] = await db
      .select()
      .from(blockedDomains)
      .where(eq(blockedDomains.domain, domain))
      .limit(1);
    if (blocked) return reply.status(400).send({ error: 'domain_blocked' });
    const [industry] = await db
      .select({ id: industries.id })
      .from(industries)
      .where(and(eq(industries.code, b.industryCode), eq(industries.active, true)))
      .limit(1);
    if (!industry) return reply.status(400).send({ error: 'invalid_input', fields: ['industryCode'] });

    const passwordHash = await hashPassword(b.password);
    const userId = await db.transaction(async (tx) => {
      // Parallele Ersteinrichtung verhindern: nochmals innerhalb der Transaktion prüfen (Sperre auf setup_state).
      await tx.insert(setupState).values({ id: 1 }).onConflictDoNothing();
      const [state] = await tx
        .execute<{ initialized: boolean }>(sql`select initialized from setup_state where id = 1 for update`)
        .then((r) => r.rows);
      if (state?.initialized) return null;
      const [company] = await tx
        .insert(companies)
        .values({ name: b.companyName, slug: b.companySlug, industryId: industry.id, logoAlt: b.companyName })
        .returning({ id: companies.id });
      await tx.insert(companyDomains).values({ companyId: company!.id, domain });
      const [user] = await tx
        .insert(users)
        .values({
          companyId: company!.id,
          name: b.name,
          email: b.email,
          role: 'admin',
          status: 'active',
          isExternal: isExternalEmail(b.email),
          passwordHash,
        })
        .returning({ id: users.id });
      await tx
        .update(setupState)
        .set({
          initialized: true,
          initializedAt: new Date(),
          initializedFromIp: req.socket.remoteAddress ?? null,
        })
        .where(eq(setupState.id, 1));
      return { userId: user!.id, companyId: company!.id };
    });
    if (!userId) return reply.status(404).send({ error: 'not_found' });
    setSessionCookie(app, reply, await createSession(db, userId.userId));
    await audit(db, req, { action: 'setup.completed', userId: userId.userId, companyId: userId.companyId });
    return reply.status(201).send({ status: 'ok', companySlug: b.companySlug });
  });
};
