import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { catalog } from '@ai-tpi/catalog';
import { assessmentMasterSchema, ASSESSMENT_STATUS, type AssessmentStatus } from '@ai-tpi/shared';
import { fail, me, parseBody } from '../admin/helpers';
import { loadAccess, recordHistory, type Access } from '../assessment/access';
import {
  assessmentMembers,
  assessments,
  comments,
  departments,
  departmentSubmissions,
  keyAreaAssignments,
  sources,
  users,
} from '../db/schema';
import { requireAuth } from '../plugins/auth';

const MASTER_FIELDS = [
  'project',
  'assessorName',
  'domain',
  'organizationUnit',
  'mainStakeholder',
  'contact',
  'assessmentType',
  'startDate',
  'endDate',
  'interviewCount',
  'scope',
  'methodModel',
  'includeAi',
] as const;

/** Erlaubte Statuswechsel; Rückschritte öffnen die Erfassung bzw. Zusammenführung wieder. */
const TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  collecting: ['consolidating'],
  consolidating: ['collecting', 'released'],
  released: ['consolidating'],
};

const statusBody = z.object({ status: z.enum(ASSESSMENT_STATUS) });
const memberBody = z.object({ userId: z.string().uuid() });
const assignmentBody = z.object({ departmentIds: z.array(z.string().uuid()).max(50) });
const sourceBody = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional().default(''),
  unit: z.string().trim().max(120).optional().default(''),
  type: z.enum(['person', 'document', 'tool', 'other']).optional().default('person'),
});
const sourcePatch = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: z.string().trim().max(120).optional(),
    unit: z.string().trim().max(120).optional(),
    type: z.enum(['person', 'document', 'tool', 'other']).optional(),
    active: z.boolean().optional(),
  })
  .strict();

/**
 * Assessments: Stammdaten, Status, Team, Zuweisung der Kernbereiche, Quellen (EP-1, US-1.1, US-1.2, US-3.2).
 * Antworten, Kommentare und Zusammenführung siehe answers.ts.
 */
export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  const denyUnlessManager = (acc: Access, reply: Parameters<typeof fail>[0]) => {
    if (acc.canManage) return false;
    void fail(reply, 403, 'forbidden');
    return true;
  };

  app.get('/api/assessments', async (req) => {
    const u = me(req);
    const base = db()
      .select({
        id: assessments.id,
        project: assessments.project,
        assessorName: assessments.assessorName,
        startDate: assessments.startDate,
        endDate: assessments.endDate,
        status: assessments.status,
        methodModel: assessments.methodModel,
        includeAi: assessments.includeAi,
        createdAt: assessments.createdAt,
      })
      .from(assessments);
    const rows =
      u.role === 'admin'
        ? await base.where(eq(assessments.companyId, u.companyId)).orderBy(desc(assessments.createdAt))
        : await base
            .innerJoin(
              assessmentMembers,
              and(eq(assessmentMembers.assessmentId, assessments.id), eq(assessmentMembers.userId, u.id)),
            )
            .where(eq(assessments.companyId, u.companyId))
            .orderBy(desc(assessments.createdAt));
    return rows;
  });

  app.post('/api/assessments', { preHandler: requireAuth(['assessor']) }, async (req, reply) => {
    const b = parseBody(assessmentMasterSchema, req.body, reply);
    if (!b) return;
    const u = me(req);
    const created = await db().transaction(async (tx) => {
      const [a] = await tx
        .insert(assessments)
        .values({
          ...b,
          companyId: u.companyId,
          catalogVersion: catalog.catalogVersion,
          createdByUserId: u.id,
        })
        .returning();
      await tx.insert(assessmentMembers).values({ assessmentId: a!.id, userId: u.id });
      return a!;
    });
    const [dep] = await db()
      .select({ id: departments.id, name: departments.name })
      .from(users)
      .innerJoin(departments, eq(departments.id, users.departmentId))
      .where(eq(users.id, u.id))
      .limit(1);
    await recordHistory(
      db(),
      { assessment: created, user: u, departmentId: dep?.id ?? null, departmentName: dep?.name ?? null },
      {
        entityType: 'assessment',
        action: 'assessment.created',
        entityId: created.id,
        newValue: created.project,
      },
    );
    return reply.status(201).send(created);
  });

  app.get<{ Params: { id: string } }>('/api/assessments/:id', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const id = acc.assessment.id;
    const [members, assignments, deps, submissions, srcs] = await Promise.all([
      db()
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          departmentId: users.departmentId,
        })
        .from(assessmentMembers)
        .innerJoin(users, eq(users.id, assessmentMembers.userId))
        .where(eq(assessmentMembers.assessmentId, id))
        .orderBy(asc(users.name)),
      db()
        .select({ keyAreaId: keyAreaAssignments.keyAreaId, departmentId: keyAreaAssignments.departmentId })
        .from(keyAreaAssignments)
        .where(eq(keyAreaAssignments.assessmentId, id)),
      db()
        .select({ id: departments.id, name: departments.name, active: departments.active })
        .from(departments)
        .where(eq(departments.companyId, acc.assessment.companyId))
        .orderBy(asc(departments.name)),
      db()
        .select({
          departmentId: departmentSubmissions.departmentId,
          submittedAt: departmentSubmissions.submittedAt,
        })
        .from(departmentSubmissions)
        .where(eq(departmentSubmissions.assessmentId, id)),
      db().select().from(sources).where(eq(sources.assessmentId, id)).orderBy(asc(sources.name)),
    ]);
    return {
      ...acc.assessment,
      members,
      assignments,
      departments: deps,
      submissions,
      sources: srcs,
      me: {
        departmentId: acc.departmentId,
        departmentName: acc.departmentName,
        isMember: acc.isMember,
        canManage: acc.canManage,
        canAnswer: acc.canAnswer,
        canComment: acc.canComment,
        canConsolidate: acc.canConsolidate,
      },
    };
  });

  app.patch<{ Params: { id: string } }>('/api/assessments/:id', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    const b = parseBody(assessmentMasterSchema, req.body, reply);
    if (!b) return;
    const old = acc.assessment;
    const changed = MASTER_FIELDS.filter((k) => (old[k] ?? null) !== (b[k] ?? null));
    if (!changed.length) return old;
    const [updated] = await db()
      .update(assessments)
      .set({ ...b, updatedAt: new Date() })
      .where(eq(assessments.id, old.id))
      .returning();
    for (const k of changed)
      await recordHistory(
        db(),
        { ...acc, assessment: updated! },
        {
          entityType: 'assessment',
          action: 'assessment.updated',
          entityId: `${old.id}:${k}`,
          oldValue: old[k],
          newValue: b[k],
        },
      );
    app.live.publish(acc.assessment.id, { type: 'assessment' });
    return updated;
  });

  app.post<{ Params: { id: string } }>('/api/assessments/:id/status', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    const b = parseBody(statusBody, req.body, reply);
    if (!b) return;
    const from = acc.assessment.status;
    if (!TRANSITIONS[from].includes(b.status)) return fail(reply, 409, 'invalid_transition');
    const [updated] = await db()
      .update(assessments)
      .set({
        status: b.status,
        releasedAt: b.status === 'released' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, acc.assessment.id))
      .returning();
    await recordHistory(db(), acc, {
      entityType: 'assessment',
      action: 'assessment.status',
      entityId: acc.assessment.id,
      oldValue: from,
      newValue: b.status,
    });
    app.live.publish(acc.assessment.id, { type: 'assessment' });
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/api/assessments/:id', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    await recordHistory(db(), acc, {
      entityType: 'assessment',
      action: 'assessment.deleted',
      entityId: acc.assessment.id,
      oldValue: acc.assessment.project,
    });
    await db().delete(assessments).where(eq(assessments.id, acc.assessment.id));
    app.live.publish(acc.assessment.id, { type: 'assessment', deleted: true });
    return reply.status(204).send();
  });

  // ─── Team ────────────────────────────────────────────────────────────────
  /** Nutzer der eigenen Firma, die ins Team aufgenommen werden können (keine Admins, nicht gelöscht/inaktiv). */
  app.get<{ Params: { id: string } }>('/api/assessments/:id/candidates', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    return db()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(
        and(
          eq(users.companyId, acc.assessment.companyId),
          ne(users.role, 'admin'),
          inArray(users.status, ['active', 'invited']),
          sql`${users.id} not in (select user_id from assessment_member where assessment_id = ${acc.assessment.id})`,
        ),
      )
      .orderBy(asc(users.name));
  });

  app.post<{ Params: { id: string } }>('/api/assessments/:id/members', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    const b = parseBody(memberBody, req.body, reply);
    if (!b) return;
    const [target] = await db()
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.id, b.userId),
          eq(users.companyId, acc.assessment.companyId),
          ne(users.role, 'admin'),
          inArray(users.status, ['active', 'invited']),
        ),
      )
      .limit(1);
    if (!target) return fail(reply, 404, 'not_found');
    const inserted = await db()
      .insert(assessmentMembers)
      .values({ assessmentId: acc.assessment.id, userId: target.id })
      .onConflictDoNothing()
      .returning();
    if (inserted.length)
      await recordHistory(db(), acc, {
        entityType: 'member',
        action: 'member.added',
        entityId: target.id,
        newValue: `${target.name} (${target.role})`,
      });
    app.live.publish(acc.assessment.id, { type: 'assessment' });
    return reply.status(201).send({ ok: true });
  });

  app.delete<{ Params: { id: string; userId: string } }>(
    '/api/assessments/:id/members/:userId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc || denyUnlessManager(acc, reply)) return;
      if (req.params.userId === acc.user.id) return fail(reply, 409, 'self');
      if (!z.string().uuid().safeParse(req.params.userId).success) return fail(reply, 404, 'not_found');
      const [target] = await db()
        .select({ id: users.id, name: users.name, role: users.role })
        .from(assessmentMembers)
        .innerJoin(users, eq(users.id, assessmentMembers.userId))
        .where(
          and(
            eq(assessmentMembers.assessmentId, acc.assessment.id),
            eq(assessmentMembers.userId, req.params.userId),
          ),
        )
        .limit(1);
      if (!target) return fail(reply, 404, 'not_found');
      await db()
        .delete(assessmentMembers)
        .where(
          and(eq(assessmentMembers.assessmentId, acc.assessment.id), eq(assessmentMembers.userId, target.id)),
        );
      await recordHistory(db(), acc, {
        entityType: 'member',
        action: 'member.removed',
        entityId: target.id,
        oldValue: `${target.name} (${target.role})`,
      });
      app.live.publish(acc.assessment.id, { type: 'assessment' });
      return reply.status(204).send();
    },
  );

  // ─── Zuweisung Kernbereich → Abteilungen (US-1.2, TC-ASM-009) ───────────────
  app.put<{ Params: { id: string; keyAreaId: string } }>(
    '/api/assessments/:id/assignments/:keyAreaId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc || denyUnlessManager(acc, reply)) return;
      const area = catalog.keyAreas.find((k) => k.id === req.params.keyAreaId.toUpperCase());
      if (!area) return fail(reply, 404, 'not_found');
      const b = parseBody(assignmentBody, req.body, reply);
      if (!b) return;
      const wanted = [...new Set(b.departmentIds)];
      const valid = wanted.length
        ? await db()
            .select({ id: departments.id, name: departments.name })
            .from(departments)
            .where(and(eq(departments.companyId, acc.assessment.companyId), inArray(departments.id, wanted)))
        : [];
      if (valid.length !== wanted.length)
        return reply.status(400).send({ error: 'invalid_input', fields: ['departmentIds'] });
      const before = await db()
        .select({ id: keyAreaAssignments.departmentId, name: departments.name })
        .from(keyAreaAssignments)
        .innerJoin(departments, eq(departments.id, keyAreaAssignments.departmentId))
        .where(
          and(
            eq(keyAreaAssignments.assessmentId, acc.assessment.id),
            eq(keyAreaAssignments.keyAreaId, area.id),
          ),
        );
      await db().transaction(async (tx) => {
        await tx
          .delete(keyAreaAssignments)
          .where(
            and(
              eq(keyAreaAssignments.assessmentId, acc.assessment.id),
              eq(keyAreaAssignments.keyAreaId, area.id),
            ),
          );
        if (valid.length)
          await tx
            .insert(keyAreaAssignments)
            .values(
              valid.map((d) => ({ assessmentId: acc.assessment.id, keyAreaId: area.id, departmentId: d.id })),
            );
      });
      const names = (l: { name: string }[]) =>
        l
          .map((d) => d.name)
          .sort()
          .join(', ');
      if (names(before) !== names(valid))
        await recordHistory(db(), acc, {
          entityType: 'assignment',
          action: 'assignment.changed',
          entityId: area.id,
          keyAreaId: area.id,
          oldValue: names(before),
          newValue: names(valid),
        });
      app.live.publish(acc.assessment.id, { type: 'assessment' });
      return { keyAreaId: area.id, departmentIds: valid.map((d) => d.id) };
    },
  );

  // ─── Quellen (US-3.2, TC-SRC-001…004) ─────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/assessments/:id/sources', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    return db()
      .select()
      .from(sources)
      .where(eq(sources.assessmentId, acc.assessment.id))
      .orderBy(asc(sources.name));
  });

  app.post<{ Params: { id: string } }>('/api/assessments/:id/sources', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc || denyUnlessManager(acc, reply)) return;
    const b = parseBody(sourceBody, req.body, reply);
    if (!b) return;
    const [created] = await db()
      .insert(sources)
      .values({ ...b, assessmentId: acc.assessment.id })
      .onConflictDoNothing()
      .returning();
    if (!created) return fail(reply, 409, 'duplicate');
    await recordHistory(db(), acc, {
      entityType: 'source',
      action: 'source.created',
      entityId: created.id,
      newValue: b.role ? `${b.name} (${b.role})` : b.name,
    });
    app.live.publish(acc.assessment.id, { type: 'assessment' });
    return reply.status(201).send(created);
  });

  async function ownSource(acc: Access, sourceId: string) {
    if (!z.string().uuid().safeParse(sourceId).success) return undefined;
    const [s] = await db()
      .select()
      .from(sources)
      .where(and(eq(sources.id, sourceId), eq(sources.assessmentId, acc.assessment.id)))
      .limit(1);
    return s;
  }

  app.patch<{ Params: { id: string; sourceId: string } }>(
    '/api/assessments/:id/sources/:sourceId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc || denyUnlessManager(acc, reply)) return;
      const s = await ownSource(acc, req.params.sourceId);
      if (!s) return fail(reply, 404, 'not_found');
      const b = parseBody(sourcePatch, req.body, reply);
      if (!b) return;
      const [updated] = await db().update(sources).set(b).where(eq(sources.id, s.id)).returning();
      await recordHistory(db(), acc, {
        entityType: 'source',
        action:
          b.active === false
            ? 'source.deactivated'
            : b.active === true
              ? 'source.activated'
              : 'source.updated',
        entityId: s.id,
        oldValue: { name: s.name, role: s.role, active: s.active },
        newValue: { name: updated!.name, role: updated!.role, active: updated!.active },
      });
      app.live.publish(acc.assessment.id, { type: 'assessment' });
      return updated;
    },
  );

  app.delete<{ Params: { id: string; sourceId: string } }>(
    '/api/assessments/:id/sources/:sourceId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc || denyUnlessManager(acc, reply)) return;
      const s = await ownSource(acc, req.params.sourceId);
      if (!s) return fail(reply, 404, 'not_found');
      const [used] = await db()
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.sourceId, s.id))
        .limit(1);
      // Verwendete Quellen bleiben erhalten; stattdessen deaktivieren (TC-SRC-004).
      if (used) return fail(reply, 409, 'in_use');
      await db().delete(sources).where(eq(sources.id, s.id));
      await recordHistory(db(), acc, {
        entityType: 'source',
        action: 'source.deleted',
        entityId: s.id,
        oldValue: s.role ? `${s.name} (${s.role})` : s.name,
      });
      app.live.publish(acc.assessment.id, { type: 'assessment' });
      return reply.status(204).send();
    },
  );
};
