import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { catalog } from '@ai-tpi/catalog';
import {
  assessments,
  assessmentScores,
  companies,
  industries,
  oneTimeTokens,
  sessions,
  users,
} from '../db/schema';

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
  /**
   * Benchmark-Testdaten (TC-BM-*): je Wert eine anonyme Firma der Branche mit freigegebenem Assessment,
   * dessen Kernbereiche alle diesen Erfüllungsgrad haben. Legt die Branche bei Bedarf an.
   */
  app.post<{ Body: { industryCode: string; values: number[]; optIn?: boolean } }>(
    '/api/test/benchmark-fixture',
    async (req) => {
      const db = app.deps.db!.db;
      const code = req.body.industryCode.toUpperCase();
      let [ind] = await db.select({ id: industries.id }).from(industries).where(eq(industries.code, code));
      if (!ind)
        [ind] = await db
          .insert(industries)
          .values({ code, nameDe: `Testbranche ${code}`, nameEn: `Test industry ${code}` })
          .returning({ id: industries.id });
      const keyAreas = catalog.keyAreas.map((k) => k.id);
      for (const [i, v] of req.body.values.entries()) {
        const slug = `bm-${code.toLowerCase()}-${Date.now().toString(36)}-${i}`;
        const [c] = await db
          .insert(companies)
          .values({
            name: `Benchmark ${code} ${i}`,
            slug,
            industryId: ind!.id,
            benchmarkOptIn: req.body.optIn ?? true,
          })
          .returning({ id: companies.id });
        const [a] = await db
          .insert(assessments)
          .values({
            companyId: c!.id,
            project: `BM ${i}`,
            assessorName: 'Test',
            startDate: '2026-01-01',
            catalogVersion: catalog.catalogVersion,
            status: 'released',
            releasedAt: new Date(),
          })
          .returning({ id: assessments.id });
        await db.insert(assessmentScores).values({
          assessmentId: a!.id,
          companyId: c!.id,
          catalogVersion: catalog.catalogVersion,
          releasedAt: new Date(),
          overallIndex: v,
          aiIndex: v,
          areas: keyAreas.map((keyAreaId) => ({ keyAreaId, fulfillment: v, level: 'controlled' })),
        });
      }
      return { industryId: ind!.id, created: req.body.values.length };
    },
  );

  /**
   * Nachgebildeter KI-Dienst (OpenAI-kompatibel) für die Empfehlungs-Tests TC-REC-003…007/010.
   * Basis-URL eines Test-Moduls: http://127.0.0.1:<port>/test-llm/<token>/<szenario>
   * (bewusst außerhalb von /api, weil der Server ohne CSRF-Header aufruft).
   * Szenarien: ok, alt, timeout, invalid_json, unknown_id, http_401, http_500.
   */
  const llmCalls = new Map<string, { calls: number; last: unknown }>();
  app.get<{ Params: { token: string } }>('/api/test/llm-calls/:token', async (req) => {
    return llmCalls.get(req.params.token) ?? { calls: 0, last: null };
  });
  app.post<{
    Params: { token: string; scenario: string };
    Body: { messages?: { role: string; content: string }[] };
  }>('/test-llm/:token/:scenario/chat/completions', async (req, reply) => {
    const { token, scenario } = req.params;
    const entry = llmCalls.get(token) ?? { calls: 0, last: null };
    entry.calls += 1;
    entry.last = req.body;
    llmCalls.set(token, entry);
    const reply200 = (content: string) =>
      reply.send({ choices: [{ index: 0, message: { role: 'assistant', content } }] });
    if (scenario === 'http_401') return reply.status(401).send({ error: 'invalid_api_key' });
    if (scenario === 'http_500') return reply.status(500).send({ error: 'boom' });
    if (scenario === 'timeout') {
      await new Promise((r) => setTimeout(r, 12_000));
      return reply200('{}');
    }
    if (scenario === 'invalid_json') return reply200('Hier sind meine Empfehlungen: …');
    const user = req.body?.messages?.find((m) => m.role === 'user')?.content ?? '{}';
    const ctx = JSON.parse(user) as { candidates?: { checkpointId: string; horizon: 'short' | 'long' }[] };
    const cands = ctx.candidates ?? [];
    if (scenario === 'unknown_id')
      return reply200(
        JSON.stringify({
          recommendations: [{ horizon: 'short', checkpointIds: ['KB99.X.99'], title: 'X', text: 'Y' }],
        }),
      );
    const prefix = scenario === 'alt' ? 'Alt-KI' : 'KI';
    const pick = (h: 'short' | 'long') => cands.find((c) => c.horizon === h);
    const recs = (['short', 'long'] as const)
      .map((h) => pick(h))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({
        horizon: c.horizon,
        checkpointIds: [c.checkpointId],
        title: `${prefix}-Vorschlag ${c.checkpointId}`,
        text: `${prefix}: konkreter Vorschlag für ${c.checkpointId}.`,
        nextStep: 'Termin im nächsten Refinement einplanen',
        benefit: 'Weniger Fehler in Produktion',
        metric: 'Anzahl Produktionsfehler je Quartal',
        ownerRole: 'Testmanager',
      }));
    return reply200('```json\n' + JSON.stringify({ recommendations: recs }) + '\n```');
  });
};
