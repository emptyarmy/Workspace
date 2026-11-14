import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { fail, parseBody } from '../admin/helpers';
import { loadAccess } from '../assessment/access';
import { requireAuth } from '../plugins/auth';

const viewSchema = z.enum(['questionnaire', 'consolidation', 'overview']);
const presenceBody = z.object({
  connectionId: z.string().uuid(),
  keyAreaId: z
    .string()
    .regex(/^KB\d{2}$/)
    .nullable(),
  view: viewSchema,
});
const streamQuery = z.object({
  keyAreaId: z
    .string()
    .regex(/^KB\d{2}$/)
    .optional(),
  view: viewSchema.optional().default('overview'),
});

/**
 * Ereignisstrom je Assessment (Server-Sent Events) und Präsenzmeldung (TC-MU-001, TC-MU-003).
 * Gleiche Zugriffsregeln wie beim Lesen des Assessments (Team-Mitglieder und Admins der Firma).
 */
export const liveRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  app.get<{ Params: { id: string } }>('/api/assessments/:id/events', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const q = streamQuery.safeParse(req.query);
    if (!q.success) return fail(reply, 400, 'invalid_input');
    reply.hijack();
    app.live.open(reply.raw, {
      assessmentId: acc.assessment.id,
      role: acc.user.role,
      departmentId: acc.departmentId,
      presence: {
        userId: acc.user.id,
        name: acc.user.name,
        departmentName: acc.departmentName,
        keyAreaId: q.data.keyAreaId ?? null,
        view: q.data.view,
      },
    });
  });

  app.post<{ Params: { id: string } }>('/api/assessments/:id/presence', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const b = parseBody(presenceBody, req.body, reply);
    if (!b) return;
    const ok = app.live.updatePresence(acc.assessment.id, b.connectionId, acc.user.id, {
      keyAreaId: b.keyAreaId,
      view: b.view,
    });
    if (!ok) return fail(reply, 404, 'not_found');
    return { users: app.live.presence(acc.assessment.id) };
  });
};
