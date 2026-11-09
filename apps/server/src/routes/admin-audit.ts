import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { and, count, desc, eq, gte, ilike, lt, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { me } from '../admin/helpers';
import { auditLog, companies, users } from '../db/schema';
import { requireAuth } from '../plugins/auth';

const query = z.object({
  action: z.string().trim().max(80).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const actor = alias(users, 'actor');
const actorCompany = alias(companies, 'actor_company');

/**
 * Audit-Log der eigenen Firma (Admin-Bereich): eigene Aktionen und Aktionen fremder Admins an der eigenen Firma (M4b).
 * Filter nach Aktion (Teiltext) und Zeitraum; CSV-Export für die Ablage.
 */
export const adminAuditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth(['admin']));
  const db = () => app.deps.db!.db;

  function where(req: FastifyRequest, q: z.infer<typeof query>): SQL | undefined {
    const companyId = me(req).companyId;
    const conds: (SQL | undefined)[] = [
      or(eq(auditLog.companyId, companyId), eq(auditLog.targetCompanyId, companyId)),
    ];
    if (q.action) conds.push(ilike(auditLog.action, `%${q.action.replace(/[%_\\]/g, '\\$&')}%`));
    if (q.from) conds.push(gte(auditLog.createdAt, new Date(`${q.from}T00:00:00Z`)));
    if (q.to)
      conds.push(lt(auditLog.createdAt, new Date(new Date(`${q.to}T00:00:00Z`).getTime() + 86_400_000)));
    return and(...conds);
  }

  function select(req: FastifyRequest, q: z.infer<typeof query>, limit: number, offset: number) {
    return db()
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        details: auditLog.details,
        ip: auditLog.ip,
        actorName: actor.name,
        actorEmail: actor.email,
        actorCompany: actorCompany.name,
        companyId: auditLog.companyId,
      })
      .from(auditLog)
      .leftJoin(actor, eq(actor.id, auditLog.userId))
      .leftJoin(actorCompany, eq(actorCompany.id, actor.companyId))
      .where(where(req, q))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  app.get('/api/admin/audit', async (req, reply) => {
    const q = query.safeParse(req.query);
    if (!q.success) return reply.status(400).send({ error: 'invalid_input' });
    const rows = await select(req, q.data, q.data.limit, q.data.offset);
    const [t] = await db().select({ n: count() }).from(auditLog).where(where(req, q.data));
    const own = me(req).companyId;
    return {
      total: t?.n ?? 0,
      items: rows.map(({ companyId, ...r }) => ({ ...r, external: companyId !== own })),
    };
  });

  app.get('/api/admin/audit.csv', async (req, reply) => {
    const q = query.safeParse(req.query);
    if (!q.success) return reply.status(400).send({ error: 'invalid_input' });
    const rows = await select(req, q.data, 5000, 0);
    const cell = (v: unknown) => {
      const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
      // Formel-Injektion in Tabellenkalkulationen verhindern.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const head = [
      'Zeitpunkt',
      'Aktion',
      'Handelnde Person',
      'E-Mail',
      'Firma',
      'Objekt',
      'Objekt-ID',
      'Details',
      'IP',
    ];
    const lines = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.action,
        r.actorName,
        r.actorEmail,
        r.actorCompany,
        r.entity,
        r.entityId,
        r.details,
        r.ip,
      ]
        .map(cell)
        .join(';'),
    );
    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
    return `\uFEFF${[head.map(cell).join(';'), ...lines].join('\r\n')}\r\n`;
  });
};
