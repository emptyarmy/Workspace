import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import type { AppConfig } from './config';
import type { DbHandle } from './db/client';
import type { Mailer } from './mail/mailer';
import { LiveHub } from './assessment/live';
import { authPlugin } from './plugins/auth';
import { adminRoutes, industryRoutes } from './routes/admin';
import { adminAuditRoutes } from './routes/admin-audit';
import { adminConfigRoutes } from './routes/admin-config';
import { adminCrossRoutes } from './routes/admin-cross';
import { adminIndustryRoutes } from './routes/admin-industries';
import { answerRoutes } from './routes/answers';
import { assessmentRoutes } from './routes/assessments';
import { authRoutes } from './routes/auth';
import { brandingRoutes } from './routes/branding';
import { catalogRoutes } from './routes/catalog';
import { healthRoutes } from './routes/health';
import { historyRoutes } from './routes/history';
import { liveRoutes } from './routes/live';
import { reportRoutes } from './routes/report';
import { transferRoutes } from './routes/transfer';
import { setupRoutes } from './routes/setup';
import { testSupportRoutes } from './routes/test-support';

export interface AppDeps {
  config: AppConfig;
  db?: DbHandle;
  mailer?: Mailer;
}

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps;
    live: LiveHub;
  }
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.config.NODE_ENV === 'development' ? { level: 'info' } : false,
    // Kein trustProxy: Die Client-Adresse stammt immer aus dem Socket (R-06).
    trustProxy: false,
  });
  app.decorate('deps', deps);
  // Live-Aktualisierung je Assessment; offene Ströme beim Herunterfahren beenden.
  app.decorate('live', new LiveHub());
  app.addHook('onClose', async () => app.live.closeAll());

  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Cache-Control', 'no-store');
  });

  // Keine internen Fehlerdetails an den Client (NFA-09); eindeutige DB-Konflikte → 409.
  app.setErrorHandler((err: FastifyError & { code?: string; cause?: { code?: string } }, req, reply) => {
    if (err.code === '23505' || err.cause?.code === '23505')
      return reply.status(409).send({ error: 'conflict' });
    const status = err.statusCode && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    reply
      .status(status)
      .send({ error: status === 503 ? 'db_unavailable' : status >= 500 ? 'internal_error' : 'bad_request' });
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'not_found' }));

  await app.register(cookie);
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(catalogRoutes);
  await app.register(brandingRoutes);
  await app.register(setupRoutes);
  await app.register(authRoutes);
  if (deps.db) {
    await app.register(adminRoutes);
    await app.register(adminCrossRoutes);
    await app.register(adminConfigRoutes);
    await app.register(adminAuditRoutes);
    await app.register(adminIndustryRoutes);
    await app.register(industryRoutes);
    await app.register(assessmentRoutes);
    await app.register(answerRoutes);
    await app.register(historyRoutes);
    await app.register(liveRoutes);
    await app.register(transferRoutes);
    await app.register(reportRoutes);
  }
  if (deps.config.NODE_ENV === 'test' && deps.config.TEST_ENDPOINTS) await app.register(testSupportRoutes);
  return app;
}
