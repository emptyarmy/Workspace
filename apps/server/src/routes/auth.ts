import type { FastifyPluginAsync } from 'fastify';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { assessPassword, emailSchema, userInputsFrom } from '@ai-tpi/shared';
import { sendCompanyMail } from '../mail/company';
import { audit } from '../audit';
import { hashPassword, verifyPassword } from '../auth/crypto';
import { createSession, destroyAllSessions, destroySession, SESSION_COOKIE } from '../auth/sessions';
import { consumeToken, findValidToken, issuePasswordToken } from '../auth/tokens';
import { companies, users } from '../db/schema';
import { passwordLinkMail } from '../mail/templates';
import { requireAuth, setSessionCookie } from '../plugins/auth';

const resetBody = z.object({ email: emailSchema });
const loginBody = z.object({ email: emailSchema, password: z.string().min(1).max(256) });
const passwordSetBody = z.object({
  token: z.string().min(16).max(256),
  password: z.string().max(256),
  passwordRepeat: z.string().max(256),
});

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export const authRoutes: FastifyPluginAsync = async (app) => {
  const db = () => {
    if (!app.deps.db) throw Object.assign(new Error('db_unavailable'), { statusCode: 503 });
    return app.deps.db.db;
  };

  /** Anmeldung (F-07). Gleiche Meldung für unbekannte E-Mail und falsches Passwort (TC-AUTH-002/003). */
  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    const { email, password } = parsed.data;
    const [u] = await db()
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    const now = new Date();
    if (u?.lockedUntil && u.lockedUntil > now) return reply.status(429).send({ error: 'locked' });

    const ok = await verifyPassword(u?.passwordHash ?? null, password);
    if (!u || !ok || u.status !== 'active') {
      if (u && u.status === 'active') {
        const failed = u.failedLogins + 1;
        const lock = failed >= MAX_FAILED_LOGINS;
        await db()
          .update(users)
          .set({
            failedLogins: lock ? 0 : failed,
            lockedUntil: lock ? new Date(now.getTime() + LOCK_MS) : null,
          })
          .where(eq(users.id, u.id));
        await audit(db(), req, {
          action: lock ? 'auth.locked' : 'auth.login_failed',
          userId: u.id,
          companyId: u.companyId,
        });
        if (lock) return reply.status(429).send({ error: 'locked' });
      }
      return reply.status(401).send({ error: 'invalid_credentials' });
    }
    await db()
      .update(users)
      .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: now })
      .where(eq(users.id, u.id));
    setSessionCookie(app, reply, await createSession(db(), u.id));
    await audit(db(), req, { action: 'auth.login', userId: u.id, companyId: u.companyId });
    return { status: 'ok', role: u.role };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token && app.deps.db) await destroySession(db(), token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  app.get('/api/auth/me', { preHandler: requireAuth() }, async (req) => req.user);

  /** „Passwort vergessen“: immer 202 – verrät nicht, ob die Adresse existiert (TC-RST-001/002/009). */
  app.post('/api/auth/password-reset', async (req, reply) => {
    const parsed = resetBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!app.deps.db) return reply.status(202).send({ status: 'accepted' });
    const [u] = await db()
      .select({ id: users.id, name: users.name, email: users.email, companyId: users.companyId })
      .from(users)
      .where(
        and(sql`lower(${users.email}) = ${parsed.data.email}`, inArray(users.status, ['active', 'invited'])),
      )
      .limit(1);
    if (u) {
      try {
        const token = await issuePasswordToken(db(), u.id);
        const link = `${app.deps.config.PUBLIC_BASE_URL}/passwort-festlegen?token=${token}`;
        await sendCompanyMail(app, u.companyId, passwordLinkMail({ to: u.email, name: u.name, link }));
        await audit(db(), req, { action: 'auth.password_link_sent', userId: u.id, companyId: u.companyId });
      } catch (err) {
        req.log.error({ err }, 'password reset mail failed');
      }
    }
    return reply.status(202).send({ status: 'accepted' });
  });

  /** Passwort über Einmal-Link festlegen (N-07). Regeln + Mindeststärke werden serverseitig geprüft (TC-PWD-024). */
  app.post('/api/auth/password', async (req, reply) => {
    const parsed = passwordSetBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    const { token, password, passwordRepeat } = parsed.data;
    if (password !== passwordRepeat) return reply.status(400).send({ error: 'password_mismatch' });

    const tokenRow = app.deps.db ? await findValidToken(db(), token) : null;
    const [u] = tokenRow
      ? await db()
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            status: users.status,
            companyId: users.companyId,
            hash: users.passwordHash,
            companyName: companies.name,
            slug: companies.slug,
          })
          .from(users)
          .innerJoin(companies, eq(companies.id, users.companyId))
          .where(eq(users.id, tokenRow.userId))
          .limit(1)
      : [];

    const assessment = assessPassword(password, userInputsFrom([u?.name, u?.email, u?.companyName]));
    if (!assessment.acceptable) {
      return reply
        .status(400)
        .send({ error: 'password_policy', rules: assessment.rules, strength: assessment.strength });
    }
    if (!tokenRow || !u || !['active', 'invited'].includes(u.status)) {
      return reply.status(400).send({ error: 'invalid_token' });
    }
    if (u.hash && (await verifyPassword(u.hash, password))) {
      return reply.status(400).send({ error: 'password_reused' }); // TC-PWD-025
    }
    await db()
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        status: 'active',
        mustChangePassword: false,
        failedLogins: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, u.id));
    await consumeToken(db(), tokenRow.id);
    await destroyAllSessions(db(), u.id);
    await audit(db(), req, { action: 'auth.password_set', userId: u.id, companyId: u.companyId });
    return { status: 'password_set', companySlug: u.slug };
  });
};
