import type { FastifyPluginAsync } from 'fastify';

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
  /** Nachgebildeter Ollama-Endpunkt für den positiven KI-Verbindungstest ohne echten KI-Server. */
  app.get('/api/test/fake-ollama/api/tags', async () => ({ models: [{ name: 'test-model:latest' }] }));
};
