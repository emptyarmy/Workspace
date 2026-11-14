import type { FastifyPluginAsync } from 'fastify';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  answerSchema,
  COMMENT_MAX,
  departmentsDisagree,
  rationaleRequired,
  suggestConsolidated,
  type Answer,
} from '@ai-tpi/shared';
import { fail, parseBody } from '../admin/helpers';
import { saveSnapshot } from '../assessment/scoring';
import {
  assignedDepartments,
  findInScope,
  loadAccess,
  recordHistory,
  scopeOf,
  type Access,
} from '../assessment/access';
import {
  comments,
  consolidatedAnswers,
  departmentAnswers,
  departments,
  departmentSubmissions,
  keyAreaAssignments,
  sources,
  users,
} from '../db/schema';
import { requireAuth } from '../plugins/auth';

const answerBody = z.object({ value: answerSchema, version: z.number().int().min(0) });
const consolidateBody = z.object({
  value: answerSchema,
  version: z.number().int().min(0),
  rationale: z.string().trim().max(2000).optional().default(''),
});
const commentBody = z.object({
  checkpointId: z.string().min(3).max(20),
  text: z.string().trim().min(1).max(COMMENT_MAX),
  sourceId: z.string().uuid().nullable().optional().default(null),
});
const commentPatch = z
  .object({
    text: z.string().trim().min(1).max(COMMENT_MAX).optional(),
    sourceId: z.string().uuid().nullable().optional(),
  })
  .strict();
const departmentQuery = z.object({ departmentId: z.string().uuid().optional() });

/** Verbindungs-ID des sendenden Fensters (nur UUID), damit es sein eigenes Live-Echo erkennt. */
const liveOrigin = (h: unknown) =>
  typeof h === 'string' && z.string().uuid().safeParse(h).success ? h : null;

/** Antworten für die eigene Abteilung dürfen Befragte und Assessoren mit Abteilung (Team-Mitglieder). */
const answerer = (acc: Access): acc is Access & { departmentId: string } =>
  acc.isMember && (acc.user.role === 'respondent' || acc.user.role === 'assessor') && !!acc.departmentId;

/**
 * Fragebogen (EP-2), Kommentare (EP-3) und Zusammenführung (EP-9).
 * Abteilungsantworten mit optimistischem Sperren: Der Client sendet die bekannte Version, bei Abweichung 409.
 */
export const answerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  async function departmentName(id: string) {
    const [d] = await db()
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    return d?.name ?? '';
  }

  // ─── Abteilungsantworten ─────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/assessments/:id/answers', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const q = departmentQuery.safeParse(req.query);
    if (!q.success) return fail(reply, 400, 'invalid_input');
    // Befragte sehen nur die Antworten ihrer Abteilung (US-9.1); Assessor, Leser und Admin alle.
    const onlyOwn = acc.user.role === 'respondent';
    if (onlyOwn && !acc.departmentId) return [];
    const departmentId = onlyOwn ? acc.departmentId! : q.data.departmentId;
    return db()
      .select({
        departmentId: departmentAnswers.departmentId,
        checkpointId: departmentAnswers.checkpointId,
        value: departmentAnswers.value,
        version: departmentAnswers.version,
        updatedAt: departmentAnswers.updatedAt,
        updatedBy: users.name,
      })
      .from(departmentAnswers)
      .leftJoin(users, eq(users.id, departmentAnswers.updatedByUserId))
      .where(
        and(
          eq(departmentAnswers.assessmentId, acc.assessment.id),
          departmentId ? eq(departmentAnswers.departmentId, departmentId) : undefined,
        ),
      );
  });

  app.put<{ Params: { id: string; checkpointId: string } }>(
    '/api/assessments/:id/answers/:checkpointId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      if (!answerer(acc)) return fail(reply, 403, 'forbidden');
      const found = findInScope(acc.assessment, req.params.checkpointId);
      if (!found) return fail(reply, 404, 'not_found');
      // Nur Kernbereiche, die der eigenen Abteilung zugewiesen sind (TC-MU-004, TC-CONS-008).
      if (!(await assignedDepartments(db(), acc.assessment.id, found.area.id)).includes(acc.departmentId))
        return fail(reply, 403, 'not_assigned');
      if (acc.assessment.status !== 'collecting') return fail(reply, 409, 'not_collecting');
      const [submitted] = await db()
        .select({ at: departmentSubmissions.submittedAt })
        .from(departmentSubmissions)
        .where(
          and(
            eq(departmentSubmissions.assessmentId, acc.assessment.id),
            eq(departmentSubmissions.departmentId, acc.departmentId),
          ),
        )
        .limit(1);
      if (submitted) return fail(reply, 409, 'submitted');
      const b = parseBody(answerBody, req.body, reply);
      if (!b) return;

      const key = and(
        eq(departmentAnswers.assessmentId, acc.assessment.id),
        eq(departmentAnswers.departmentId, acc.departmentId),
        eq(departmentAnswers.checkpointId, found.cp.id),
      );
      const current = async () => {
        const [c] = await db()
          .select({
            value: departmentAnswers.value,
            version: departmentAnswers.version,
            updatedBy: users.name,
          })
          .from(departmentAnswers)
          .leftJoin(users, eq(users.id, departmentAnswers.updatedByUserId))
          .where(key)
          .limit(1);
        return c ?? { value: 'open' as const, version: 0, updatedBy: null };
      };
      const before = await current();
      const conflict = async () =>
        reply.status(409).send({ error: 'version_conflict', current: await current() });
      if (before.version !== b.version) return conflict();
      if (before.value === b.value) return { value: before.value, version: before.version };

      let saved: { value: Answer; version: number } | undefined;
      if (b.value === 'open') {
        const del = await db()
          .delete(departmentAnswers)
          .where(and(key, eq(departmentAnswers.version, b.version)))
          .returning();
        saved = del.length ? { value: 'open', version: 0 } : undefined;
      } else if (b.version === 0) {
        const [ins] = await db()
          .insert(departmentAnswers)
          .values({
            assessmentId: acc.assessment.id,
            departmentId: acc.departmentId,
            checkpointId: found.cp.id,
            value: b.value,
            updatedByUserId: acc.user.id,
          })
          .onConflictDoNothing()
          .returning({ value: departmentAnswers.value, version: departmentAnswers.version });
        saved = ins;
      } else {
        const [upd] = await db()
          .update(departmentAnswers)
          .set({
            value: b.value,
            version: sql`${departmentAnswers.version} + 1`,
            updatedByUserId: acc.user.id,
            updatedAt: new Date(),
          })
          .where(and(key, eq(departmentAnswers.version, b.version)))
          .returning({ value: departmentAnswers.value, version: departmentAnswers.version });
        saved = upd;
      }
      if (!saved) return conflict();
      await recordHistory(db(), acc, {
        entityType: 'department_answer',
        action: 'answer.changed',
        entityId: `${acc.departmentId}:${found.cp.id}`,
        checkpointId: found.cp.id,
        keyAreaId: found.area.id,
        oldValue: before.value,
        newValue: saved.value,
      });
      app.live.publish(acc.assessment.id, {
        type: 'answer',
        departmentId: acc.departmentId,
        checkpointId: found.cp.id,
        value: saved.value,
        version: saved.version,
        updatedBy: acc.user.name,
        origin: liveOrigin(req.headers['x-live-connection']),
      });
      return saved;
    },
  );

  // ─── Abgabe der Abteilung ──────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/assessments/:id/submission', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    if (!answerer(acc)) return fail(reply, 403, 'forbidden');
    if (acc.assessment.status !== 'collecting') return fail(reply, 409, 'not_collecting');
    const inserted = await db()
      .insert(departmentSubmissions)
      .values({
        assessmentId: acc.assessment.id,
        departmentId: acc.departmentId,
        submittedByUserId: acc.user.id,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted.length)
      await recordHistory(db(), acc, {
        entityType: 'submission',
        action: 'department.submitted',
        entityId: acc.departmentId,
        oldValue: 'draft',
        newValue: 'submitted',
      });
    app.live.publish(acc.assessment.id, { type: 'submission', departmentId: acc.departmentId });
    return reply.status(201).send({ submitted: true });
  });

  /** Assessor öffnet die Abgabe einer Abteilung wieder. */
  app.delete<{ Params: { id: string; departmentId: string } }>(
    '/api/assessments/:id/submissions/:departmentId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      if (!acc.canManage) return fail(reply, 403, 'forbidden');
      if (!z.string().uuid().safeParse(req.params.departmentId).success) return fail(reply, 404, 'not_found');
      const del = await db()
        .delete(departmentSubmissions)
        .where(
          and(
            eq(departmentSubmissions.assessmentId, acc.assessment.id),
            eq(departmentSubmissions.departmentId, req.params.departmentId),
          ),
        )
        .returning();
      if (!del.length) return fail(reply, 404, 'not_found');
      await recordHistory(db(), acc, {
        entityType: 'submission',
        action: 'department.reopened',
        entityId: req.params.departmentId,
        oldValue: 'submitted',
        newValue: 'draft',
        department: { id: req.params.departmentId, name: await departmentName(req.params.departmentId) },
      });
      app.live.publish(acc.assessment.id, { type: 'submission', departmentId: req.params.departmentId });
      return reply.status(204).send();
    },
  );

  // ─── Kommentare (US-3.1, TC-COM-*) ─────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/assessments/:id/comments', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    return db()
      .select({
        id: comments.id,
        checkpointId: comments.checkpointId,
        text: comments.text,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        authorId: comments.authorUserId,
        authorName: users.name,
        departmentId: comments.departmentId,
        departmentName: departments.name,
        sourceId: comments.sourceId,
        sourceName: sources.name,
        sourceRole: sources.role,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorUserId))
      .leftJoin(departments, eq(departments.id, comments.departmentId))
      .leftJoin(sources, eq(sources.id, comments.sourceId))
      .where(eq(comments.assessmentId, acc.assessment.id))
      .orderBy(asc(comments.createdAt));
  });

  /** Kommentieren: Assessor überall, Befragte nur in den Kernbereichen ihrer Abteilung; Leser und Admin nicht. */
  async function mayComment(acc: Access, keyAreaId: string) {
    if (!acc.canComment) return false;
    if (acc.canManage) return true;
    return (await assignedDepartments(db(), acc.assessment.id, keyAreaId)).includes(acc.departmentId!);
  }

  async function activeSource(acc: Access, sourceId: string | null | undefined) {
    if (!sourceId) return true;
    const [s] = await db()
      .select({ id: sources.id })
      .from(sources)
      .where(
        and(eq(sources.id, sourceId), eq(sources.assessmentId, acc.assessment.id), eq(sources.active, true)),
      )
      .limit(1);
    return !!s;
  }

  app.post<{ Params: { id: string } }>('/api/assessments/:id/comments', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const b = parseBody(commentBody, req.body, reply);
    if (!b) return;
    const found = findInScope(acc.assessment, b.checkpointId);
    if (!found) return fail(reply, 404, 'not_found');
    if (!(await mayComment(acc, found.area.id))) return fail(reply, 403, 'forbidden');
    if (!(await activeSource(acc, b.sourceId)))
      return reply.status(400).send({ error: 'invalid_input', fields: ['sourceId'] });
    const [created] = await db()
      .insert(comments)
      .values({
        assessmentId: acc.assessment.id,
        checkpointId: found.cp.id,
        departmentId: acc.departmentId,
        authorUserId: acc.user.id,
        sourceId: b.sourceId,
        text: b.text,
      })
      .returning();
    await recordHistory(db(), acc, {
      entityType: 'comment',
      action: 'comment.created',
      entityId: created!.id,
      checkpointId: found.cp.id,
      newValue: b.text,
    });
    app.live.publish(acc.assessment.id, { type: 'comment', checkpointId: found.cp.id });
    return reply.status(201).send(created);
  });

  async function ownComment(acc: Access, commentId: string) {
    if (!z.string().uuid().safeParse(commentId).success) return undefined;
    const [c] = await db()
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.assessmentId, acc.assessment.id)))
      .limit(1);
    return c;
  }

  app.patch<{ Params: { id: string; commentId: string } }>(
    '/api/assessments/:id/comments/:commentId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      const c = await ownComment(acc, req.params.commentId);
      if (!c) return fail(reply, 404, 'not_found');
      // Nur der Verfasser ändert seinen Text (TC-COM-006, TC-MU-007).
      if (c.authorUserId !== acc.user.id || !acc.canComment) return fail(reply, 403, 'forbidden');
      const b = parseBody(commentPatch, req.body, reply);
      if (!b) return;
      if (b.sourceId !== undefined && !(await activeSource(acc, b.sourceId)))
        return reply.status(400).send({ error: 'invalid_input', fields: ['sourceId'] });
      const [updated] = await db()
        .update(comments)
        .set({ ...b, updatedAt: new Date() })
        .where(eq(comments.id, c.id))
        .returning();
      await recordHistory(db(), acc, {
        entityType: 'comment',
        action: 'comment.updated',
        entityId: c.id,
        checkpointId: c.checkpointId,
        oldValue: c.text,
        newValue: updated!.text,
      });
      app.live.publish(acc.assessment.id, { type: 'comment', checkpointId: c.checkpointId });
      return updated;
    },
  );

  app.delete<{ Params: { id: string; commentId: string } }>(
    '/api/assessments/:id/comments/:commentId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      const c = await ownComment(acc, req.params.commentId);
      if (!c) return fail(reply, 404, 'not_found');
      // Verfasser oder Assessor des Assessments (TC-COM-007, TC-MU-007).
      if (!acc.canComment || (c.authorUserId !== acc.user.id && !acc.canManage))
        return fail(reply, 403, 'forbidden');
      await db().delete(comments).where(eq(comments.id, c.id));
      await recordHistory(db(), acc, {
        entityType: 'comment',
        action: 'comment.deleted',
        entityId: c.id,
        checkpointId: c.checkpointId,
        oldValue: c.text,
      });
      app.live.publish(acc.assessment.id, { type: 'comment', checkpointId: c.checkpointId });
      return reply.status(204).send();
    },
  );

  // ─── Zusammenführung (US-9.2, TC-CONS-*) ───────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/assessments/:id/consolidation', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    // Befragte sehen keine Antworten anderer Abteilungen (TC-CONS-006).
    if (acc.user.role === 'respondent') return fail(reply, 403, 'forbidden');
    const id = acc.assessment.id;
    const [answers, consolidated, assignments, deps] = await Promise.all([
      db().select().from(departmentAnswers).where(eq(departmentAnswers.assessmentId, id)),
      db()
        .select({
          checkpointId: consolidatedAnswers.checkpointId,
          value: consolidatedAnswers.value,
          suggestedValue: consolidatedAnswers.suggestedValue,
          rationale: consolidatedAnswers.rationale,
          version: consolidatedAnswers.version,
          consolidatedAt: consolidatedAnswers.consolidatedAt,
          consolidatedBy: users.name,
        })
        .from(consolidatedAnswers)
        .leftJoin(users, eq(users.id, consolidatedAnswers.consolidatedByUserId))
        .where(eq(consolidatedAnswers.assessmentId, id)),
      db().select().from(keyAreaAssignments).where(eq(keyAreaAssignments.assessmentId, id)),
      db()
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.companyId, acc.assessment.companyId)),
    ]);
    const depName = new Map(deps.map((d) => [d.id, d.name]));
    const cons = new Map(consolidated.map((c) => [c.checkpointId, c]));
    const items = scopeOf(acc.assessment).flatMap((area) => {
      const assigned = assignments.filter((a) => a.keyAreaId === area.id).map((a) => a.departmentId);
      return area.checkpoints.map((cp) => {
        const perDept = assigned.map((d) => ({
          departmentId: d,
          departmentName: depName.get(d) ?? '',
          value: (answers.find((a) => a.departmentId === d && a.checkpointId === cp.id)?.value ??
            'open') as Answer,
        }));
        const values = perDept.map((p) => p.value);
        return {
          keyAreaId: area.id,
          checkpointId: cp.id,
          departments: perDept,
          suggestion: suggestConsolidated(values),
          disagree: departmentsDisagree(values),
          consolidated: cons.get(cp.id) ?? null,
        };
      });
    });
    return { status: acc.assessment.status, items };
  });

  app.put<{ Params: { id: string; checkpointId: string } }>(
    '/api/assessments/:id/consolidation/:checkpointId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      if (!acc.canConsolidate) return fail(reply, 403, 'forbidden');
      const found = findInScope(acc.assessment, req.params.checkpointId);
      if (!found) return fail(reply, 404, 'not_found');
      const b = parseBody(consolidateBody, req.body, reply);
      if (!b) return;
      const assigned = await assignedDepartments(db(), acc.assessment.id, found.area.id);
      const rows = await db()
        .select({ departmentId: departmentAnswers.departmentId, value: departmentAnswers.value })
        .from(departmentAnswers)
        .where(
          and(
            eq(departmentAnswers.assessmentId, acc.assessment.id),
            eq(departmentAnswers.checkpointId, found.cp.id),
          ),
        );
      const values = assigned.map((d) => (rows.find((r) => r.departmentId === d)?.value ?? 'open') as Answer);
      const suggestion = suggestConsolidated(values);
      if (b.value !== 'open' && rationaleRequired(b.value, values) && !b.rationale)
        return reply.status(400).send({ error: 'rationale_required', fields: ['rationale'], suggestion });

      const key = and(
        eq(consolidatedAnswers.assessmentId, acc.assessment.id),
        eq(consolidatedAnswers.checkpointId, found.cp.id),
      );
      const [before] = await db().select().from(consolidatedAnswers).where(key).limit(1);
      const currentVersion = before?.version ?? 0;
      if (currentVersion !== b.version)
        return reply.status(409).send({ error: 'version_conflict', current: before ?? null });

      let saved: { value: Answer; version: number } | undefined;
      if (b.value === 'open') {
        const del = await db()
          .delete(consolidatedAnswers)
          .where(and(key, eq(consolidatedAnswers.version, b.version)))
          .returning();
        saved = del.length || !before ? { value: 'open', version: 0 } : undefined;
      } else if (!before) {
        [saved] = await db()
          .insert(consolidatedAnswers)
          .values({
            assessmentId: acc.assessment.id,
            checkpointId: found.cp.id,
            value: b.value,
            suggestedValue: suggestion,
            rationale: b.rationale || null,
            consolidatedByUserId: acc.user.id,
          })
          .onConflictDoNothing()
          .returning({ value: consolidatedAnswers.value, version: consolidatedAnswers.version });
      } else {
        [saved] = await db()
          .update(consolidatedAnswers)
          .set({
            value: b.value,
            suggestedValue: suggestion,
            rationale: b.rationale || null,
            version: sql`${consolidatedAnswers.version} + 1`,
            consolidatedByUserId: acc.user.id,
            consolidatedAt: new Date(),
          })
          .where(and(key, eq(consolidatedAnswers.version, b.version)))
          .returning({ value: consolidatedAnswers.value, version: consolidatedAnswers.version });
      }
      if (!saved) return reply.status(409).send({ error: 'version_conflict', current: null });
      if ((before?.value ?? 'open') !== saved.value || (before?.rationale ?? '') !== b.rationale)
        await recordHistory(db(), acc, {
          entityType: 'consolidated_answer',
          action: 'consolidated.changed',
          entityId: found.cp.id,
          checkpointId: found.cp.id,
          keyAreaId: found.area.id,
          oldValue: before?.value ?? 'open',
          newValue: saved.value,
          rationale: b.rationale || null,
        });
      app.live.publish(acc.assessment.id, { type: 'consolidated', checkpointId: found.cp.id });
      // Änderungen nach der Freigabe aktualisieren den Benchmark-Schnappschuss.
      if (acc.assessment.status === 'released') await saveSnapshot(db(), acc.assessment);
      return { ...saved, suggestion, rationale: b.rationale || null };
    },
  );
};
