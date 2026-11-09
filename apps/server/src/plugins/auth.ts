import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Role } from '@ai-tpi/shared';
import { resolveSession, SESSION_COOKIE, type SessionUser } from '../auth/sessions';

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

/** CSRF-Schutz: zustandsändernde API-Aufrufe müssen diesen Header senden (zusätzlich zu SameSite=Lax). */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'ai-tpi';
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (req, reply) => {
    if (UNSAFE.has(req.method) && req.url.startsWith('/api/') && req.headers[CSRF_HEADER] !== CSRF_VALUE) {
      return reply.status(403).send({ error: 'csrf' });
    }
    const token = req.cookies[SESSION_COOKIE];
    if (token && app.deps.db) {
      req.user = await resolveSession(app.deps.db.db, token);
      if (!req.user) reply.clearCookie(SESSION_COOKIE, { path: '/' });
    }
  });
});

/** preHandler: angemeldet, optional mit einer der Rollen. */
export function requireAuth(roles?: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.status(401).send({ error: 'unauthenticated' });
    if (roles && !roles.includes(req.user.role)) return reply.status(403).send({ error: 'forbidden' });
  };
}

export function setSessionCookie(app: FastifyInstance, reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: app.deps.config.COOKIE_SECURE,
    maxAge: 12 * 60 * 60,
  });
}
