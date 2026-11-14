import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { me } from '../admin/helpers';
import { assessmentMembers, changeHistory } from '../db/schema';
import { requireAuth } from '../plugins/auth';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const query = z.object({
  assessmentId: z.string().uuid().optional(),
  keyAreaId: z
    .string()
    .regex(/^KB\d{2}$/i)
    .optional(),
  checkpointId: z.string().max(20).optional(),
  userId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  from: day,
  to: day,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
type Query = z.infer<typeof query>;

/**
 * Änderungshistorie (N-03, US-9.3, TC-HIST-*): für alle Rollen, nur eigene Firma.
 * Admins sehen alle Assessments der Firma, alle anderen nur Assessments, in denen sie Mitglied sind.
 * Es gibt bewusst keine Endpunkte zum Ändern oder Löschen (append-only).
 */
export const historyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  function where(req: FastifyRequest, q: Query): SQL | undefined {
    const u = me(req);
    const conds: (SQL | undefined)[] = [eq(changeHistory.companyId, u.companyId)];
    if (u.role !== 'admin')
      conds.push(
        inArray(
          changeHistory.assessmentId,
          db()
            .select({ id: assessmentMembers.assessmentId })
            .from(assessmentMembers)
            .where(eq(assessmentMembers.userId, u.id)),
        ),
      );
    if (q.assessmentId) conds.push(eq(changeHistory.assessmentId, q.assessmentId));
    if (q.keyAreaId) conds.push(eq(changeHistory.keyAreaId, q.keyAreaId.toUpperCase()));
    if (q.checkpointId) conds.push(eq(changeHistory.checkpointId, q.checkpointId.toUpperCase()));
    if (q.userId) conds.push(eq(changeHistory.userId, q.userId));
    if (q.departmentId) conds.push(eq(changeHistory.departmentId, q.departmentId));
    if (q.from) conds.push(gte(changeHistory.createdAt, new Date(`${q.from}T00:00:00Z`)));
    if (q.to)
      conds.push(lt(changeHistory.createdAt, new Date(new Date(`${q.to}T00:00:00Z`).getTime() + 86_400_000)));
    return and(...conds);
  }

  const columns = {
    id: changeHistory.id,
    createdAt: changeHistory.createdAt,
    assessmentId: changeHistory.assessmentId,
    assessmentName: changeHistory.assessmentName,
    entityType: changeHistory.entityType,
    keyAreaId: changeHistory.keyAreaId,
    checkpointId: changeHistory.checkpointId,
    action: changeHistory.action,
    oldValue: changeHistory.oldValue,
    newValue: changeHistory.newValue,
    rationale: changeHistory.rationale,
    userId: changeHistory.userId,
    userName: changeHistory.userNameSnapshot,
    userRole: changeHistory.userRoleSnapshot,
    departmentId: changeHistory.departmentId,
    departmentName: changeHistory.departmentSnapshot,
  };

  app.get('/api/history', async (req, reply) => {
    const q = query.safeParse(req.query);
    if (!q.success) return reply.status(400).send({ error: 'invalid_input' });
    const w = where(req, q.data);
    const [items, [t]] = await Promise.all([
      db()
        .select(columns)
        .from(changeHistory)
        .where(w)
        .orderBy(desc(changeHistory.createdAt))
        .limit(q.data.limit)
        .offset(q.data.offset),
      db().select({ n: count() }).from(changeHistory).where(w),
    ]);
    return { total: t?.n ?? 0, items };
  });

  /** Auswahllisten für die Filter: Personen und Abteilungen, die in der sichtbaren Historie vorkommen. */
  app.get('/api/history/facets', async (req) => {
    const w = where(req, query.parse({}));
    const [people, deps] = await Promise.all([
      db()
        .selectDistinct({ id: changeHistory.userId, name: changeHistory.userNameSnapshot })
        .from(changeHistory)
        .where(and(w, sql`${changeHistory.userId} is not null`)),
      db()
        .selectDistinct({ id: changeHistory.departmentId, name: changeHistory.departmentSnapshot })
        .from(changeHistory)
        .where(and(w, sql`${changeHistory.departmentId} is not null`)),
    ]);
    const byName = (a: { name: string | null }, b: { name: string | null }) =>
      (a.name ?? '').localeCompare(b.name ?? '');
    return { users: people.sort(byName), departments: deps.sort(byName) };
  });

  app.get('/api/history.csv', async (req, reply) => {
    const q = query.safeParse(req.query);
    if (!q.success) return reply.status(400).send({ error: 'invalid_input' });
    const rows = await db()
      .select(columns)
      .from(changeHistory)
      .where(where(req, q.data))
      .orderBy(desc(changeHistory.createdAt))
      .limit(10000);
    const cell = (v: unknown) => {
      const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
      // Formel-Injektion in Tabellenkalkulationen verhindern.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const head = [
      'Zeitpunkt',
      'Assessment',
      'Kernbereich',
      'Kontrollpunkt',
      'Aktion',
      'Alter Wert',
      'Neuer Wert',
      'Begründung',
      'Person',
      'Rolle',
      'Abteilung',
    ];
    const lines = rows.map((r) =>
      [
        r.createdAt,
        r.assessmentName,
        r.keyAreaId,
        r.checkpointId,
        r.action,
        r.oldValue,
        r.newValue,
        r.rationale,
        r.userName,
        r.userRole,
        r.departmentName,
      ]
        .map(cell)
        .join(';'),
    );
    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header(
        'content-disposition',
        `attachment; filename="aenderungshistorie-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
    return `\uFEFF${[head.map(cell).join(';'), ...lines].join('\r\n')}\r\n`;
  });
};
