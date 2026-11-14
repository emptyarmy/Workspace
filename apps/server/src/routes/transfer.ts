import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { fail, me, parseBody } from '../admin/helpers';
import { loadAccess, recordHistory } from '../assessment/access';
import { buildExport, importAssessment, parseExport, type ImportReport } from '../assessment/transfer';
import type { Db } from '../db/client';
import { assessments, departments, users } from '../db/schema';
import { requireAuth } from '../plugins/auth';

const duplicateBody = z.object({ project: z.string().trim().min(2).max(120) });

/** Dateiname für den Download: Projekt in sichere Zeichen umwandeln. */
const fileName = (project: string) =>
  `assessment-${
    project
      .normalize('NFKD')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'export'
  }.json`;

/** Historieneintrag für ein neu entstandenes Assessment (Import oder Kopie). */
async function historyForNew(
  db: Db,
  req: FastifyRequest,
  report: ImportReport,
  action: string,
  from: string,
) {
  const [a] = await db.select().from(assessments).where(eq(assessments.id, report.id)).limit(1);
  const [dep] = await db
    .select({ id: departments.id, name: departments.name })
    .from(users)
    .innerJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, me(req).id))
    .limit(1);
  await recordHistory(
    db,
    { assessment: a!, user: me(req), departmentId: dep?.id ?? null, departmentName: dep?.name ?? null },
    { entityType: 'assessment', action, entityId: report.id, oldValue: from, newValue: report.project },
  );
}

/**
 * JSON-Export/-Import (US-1.3, TC-IO-001…005) und Duplizieren (TC-ASM-005).
 * Import und Kopie legen immer ein neues Assessment an; bestehende Daten bleiben unverändert.
 */
export const transferRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  app.get<{ Params: { id: string } }>('/api/assessments/:id/export', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const data = await buildExport(db(), acc.assessment);
    reply.header('content-disposition', `attachment; filename="${fileName(acc.assessment.project)}"`);
    return data;
  });

  app.post(
    '/api/assessments/import',
    { preHandler: requireAuth(['assessor']), bodyLimit: 20 * 1024 * 1024 },
    async (req, reply) => {
      const parsed = parseExport(req.body);
      if (!parsed.ok) return reply.status(400).send(parsed.problem);
      const report = await importAssessment(db(), me(req), parsed.data);
      await historyForNew(db(), req, report, 'assessment.imported', 'JSON');
      return reply.status(201).send(report);
    },
  );

  app.post<{ Params: { id: string } }>('/api/assessments/:id/duplicate', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    if (!acc.canManage) return fail(reply, 403, 'forbidden');
    const b = parseBody(duplicateBody, req.body, reply);
    if (!b) return;
    const parsed = parseExport(await buildExport(db(), acc.assessment));
    if (!parsed.ok) return reply.status(500).send({ error: 'internal_error' });
    const report = await importAssessment(db(), me(req), parsed.data, { project: b.project });
    await historyForNew(db(), req, report, 'assessment.duplicated', acc.assessment.project);
    return reply.status(201).send(report);
  });
};
