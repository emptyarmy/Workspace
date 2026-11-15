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
import { RateLimiter } from './security/rate-limit';
import { recommendationRoutes } from './routes/recommendations';

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
  const cfg = deps.config;
  const level = cfg.LOG_LEVEL ?? (cfg.NODE_ENV === 'test' ? 'silent' : 'info');
  const app = Fastify({
    // JSON-Protokoll auf stdout (auch in production, OWASP A09); Geheimnisse werden geschwärzt.
    logger:
      level === 'silent'
        ? false
        : {
            level,
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'req.headers["x-api-key"]',
                'req.headers["api-key"]',
                'res.headers["set-cookie"]',
              ],
              censor: '[geschwärzt]',
            },
          },
    // Standard: Client-Adresse aus dem Socket. Hinter einem Reverse Proxy TRUST_PROXY=true (X-Forwarded-For).
    // Die Ersteinrichtung (R-06) prüft unabhängig davon immer die Socket-Adresse.
    trustProxy: cfg.TRUST_PROXY,
  });
  app.decorate('deps', deps);
  // Live-Aktualisierung je Assessment; offene Ströme beim Herunterfahren beenden.
  app.decorate('live', new LiveHub());
  app.addHook('onClose', async () => app.live.closeAll());

  // Sicherheits-Header (Security-Review 8b, OWASP A05). Die API liefert nur JSON/CSV/SSE:
  // Die Content-Security-Policy verbietet deshalb alles; HTML-Seiten bekommen ihre eigene CSP (siehe static.ts).
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (cfg.COOKIE_SECURE) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }
  });

  // Rate-Limit für Anmeldung, „Passwort vergessen“, Passwort setzen und Ersteinrichtung (OWASP A07).
  // Ergänzt die Kontosperre nach 5 Fehlversuchen um eine Grenze je Client-Adresse (Schutz vor Credential Stuffing).
  const authLimiter = new RateLimiter(cfg.AUTH_RATE_LIMIT_PER_MIN, 60_000);
  const LIMITED = new Set([
    '/api/auth/login',
    '/api/auth/password-reset',
    '/api/auth/password',
    '/api/setup',
  ]);
  app.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'POST' || !LIMITED.has(req.url.split('?')[0]!)) return;
    const wait = authLimiter.hit(req.ip);
    if (wait > 0)
      return reply.status(429).header('Retry-After', String(wait)).send({ error: 'rate_limited' });
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
    await app.register(recommendationRoutes);
  }
  if (deps.config.NODE_ENV === 'test' && deps.config.TEST_ENDPOINTS) await app.register(testSupportRoutes);
  return app;
}
