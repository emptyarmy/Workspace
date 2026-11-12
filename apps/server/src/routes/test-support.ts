import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { oneTimeTokens, sessions, users } from '../db/schema';

/**
 * Nur für automatisierte Tests (NODE_ENV=test UND TEST_ENDPOINTS=true, MAIL_TRANSPORT=memory):
 * versendete E-Mails abrufen, damit Playwright Einladungs- und Einmal-Links ohne Mailpit nutzen kann.
 * Lokal mit Mailpit können die Mails stattdessen über http://localhost:8025 bzw. die Mailpit-API gelesen werden.
 */
export const testSupportRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { to?: string } }>('/api/test/outbox', async (req) => {
    const to = req.query.to?.toLowerCase();
    return (app.deps.mailer?.outbox ?? []).filter((m) => !to || m.to.toLowerCase() === to);
  });
  /** Uhr „vorstellen“: alle Sitzungen der Person gelten als 61 Minuten unbenutzt (TC-AUTH-008). */
  app.post<{ Body: { email: string } }>('/api/test/expire-sessions', async (req) => {
    const db = app.deps.db!.db;
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${req.body.email.toLowerCase()}`);
    if (!u) return { updated: 0 };
    const r = await db
      .update(sessions)
      .set({ lastSeenAt: new Date(Date.now() - 61 * 60 * 1000) })
      .where(eq(sessions.userId, u.id))
      .returning({ id: sessions.id });
    return { updated: r.length };
  });
  /** Einmal-Links der Person ablaufen lassen (TC-RST-004). */
  app.post<{ Body: { email: string } }>('/api/test/expire-tokens', async (req) => {
    const db = app.deps.db!.db;
    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${req.body.email.toLowerCase()}`);
    if (!u) return { updated: 0 };
    const r = await db
      .update(oneTimeTokens)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(oneTimeTokens.userId, u.id))
      .returning({ id: oneTimeTokens.id });
    return { updated: r.length };
  });
  /** Nachgebildeter Ollama-Endpunkt für den positiven KI-Verbindungstest ohne echten KI-Server. */
  app.get('/api/test/fake-ollama/api/tags', async () => ({ models: [{ name: 'test-model:latest' }] }));
};
