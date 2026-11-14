import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { REC_STATUSES } from '@ai-tpi/shared';
import { fail, me, parseBody } from '../admin/helpers';
import { loadAccess, recordHistory, type Access } from '../assessment/access';
import {
  buildAiMessages,
  computeRules,
  generateRecommendations,
  listRecommendations,
  type AiModuleRow,
} from '../assessment/recommend';
import { llmRequest } from '../assessment/llm';
import { SecretBox } from '../auth/secrets';
import { audit } from '../audit';
import { aiModules, assessmentMembers, recommendations, users } from '../db/schema';
import { requireAuth } from '../plugins/auth';

const uuid = z.string().uuid();
const lang = z.enum(['de', 'en']).default('de');
const previewBody = z.object({ moduleId: uuid.nullable(), lang }).strict();
const generateBody = z.object({ moduleId: uuid.nullable(), consent: z.boolean().optional(), lang }).strict();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(d)));
const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const patchBody = z
  .object({
    version: z.number().int().min(1),
    status: z.enum(REC_STATUSES).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    text: z.string().trim().min(1).max(4000).optional(),
    nextStep: optText(500),
    benefit: optText(500),
    metric: optText(300),
    ownerRole: optText(100),
    ownerUserId: uuid.nullable().optional(),
    dueDate: isoDate.nullable().optional(),
  })
  .strict();

/** Öffentliche Sicht auf ein KI-Modul (ohne Schlüssel, ohne Endpunkt). */
const moduleView = (m: AiModuleRow) => ({
  id: m.id,
  name: m.name,
  mode: m.mode,
  provider: m.provider,
  model: m.model,
  isDefault: m.isDefault,
  sendComments: m.sendComments,
  pseudonymize: m.pseudonymize,
});

/**
 * Handlungsempfehlungen und Maßnahmenplan (Phase 7, 05_ki-empfehlungen.md).
 * Lesen: alle Mitglieder und Admins der Firma. Erzeugen, Modulwahl und Bearbeiten: nur Assessoren
 * des Assessments (Admins nur lesend, S-11; Befragte/Leser 403, TC-REC-012).
 */
export const recommendationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;
  const box = new SecretBox(app.deps.config.SECRET_ENCRYPTION_KEY);

  /**
   * 403 mit Grund, damit die Oberfläche eine verständliche Meldung zeigen kann:
   * `admin_read_only` (S-11), `role_read_only` (Befragte/Leser), `not_assessor` (sonstige).
   */
  const forbidden = (reply: FastifyReply, acc: Access) => {
    const role = acc.user.role;
    const reason =
      role === 'admin'
        ? 'admin_read_only'
        : role === 'respondent' || role === 'reader'
          ? 'role_read_only'
          : 'not_assessor';
    return reply.status(403).send({ error: 'forbidden', reason, role });
  };

  async function companyModules(companyId: string) {
    return db()
      .select()
      .from(aiModules)
      .where(eq(aiModules.companyId, companyId))
      .orderBy(sql`${aiModules.isDefault} desc`, asc(sql`lower(${aiModules.name})`));
  }
  async function findModule(companyId: string, id: string | null) {
    if (!id) return null;
    const [m] = await db()
      .select()
      .from(aiModules)
      .where(and(eq(aiModules.id, id), eq(aiModules.companyId, companyId)))
      .limit(1);
    return m;
  }
  async function members(assessmentId: string) {
    return db()
      .select({ id: users.id, name: users.name, role: users.role })
      .from(assessmentMembers)
      .innerJoin(users, eq(users.id, assessmentMembers.userId))
      .where(and(eq(assessmentMembers.assessmentId, assessmentId), eq(users.status, 'active')))
      .orderBy(asc(users.name));
  }
  const listPayload = async (acc: Access) => ({
    items: await listRecommendations(db(), acc.assessment.id),
    canEdit: acc.canManage,
    members: acc.canManage ? await members(acc.assessment.id) : [],
  });

  app.get<{ Params: { id: string } }>('/api/assessments/:id/recommendations', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    return listPayload(acc);
  });

  /** KI-Module zur Auswahl beim Erzeugen (S-09); das Standardmodul steht vorne. */
  app.get<{ Params: { id: string } }>('/api/assessments/:id/ai-modules', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    if (!acc.canManage) return forbidden(reply, acc);
    return { modules: (await companyModules(acc.assessment.companyId)).map(moduleView) };
  });

  /** Datenschutz-Vorschau: genau die Daten, die an das KI-Modul gesendet würden. Kein Netzwerkaufruf. */
  app.post<{ Params: { id: string } }>('/api/assessments/:id/recommendations/preview', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    if (!acc.canManage) return forbidden(reply, acc);
    const body = parseBody(previewBody, req.body ?? {}, reply);
    if (!body) return;
    const module = await findModule(acc.assessment.companyId, body.moduleId);
    if (module === undefined) return fail(reply, 400, 'invalid_module');
    const rules = await computeRules(db(), acc.assessment);
    if (!module || module.mode === 'rules')
      return {
        mode: 'rules',
        module: module ? moduleView(module) : null,
        candidateCount: rules.result.candidates.length,
      };
    const { messages, checkpointIds } = await buildAiMessages(db(), acc.assessment, module, body.lang, rules);
    let target: string | null = null;
    try {
      target = new URL(llmRequest(module, null, messages).url).host;
    } catch {
      target = null;
    }
    return {
      mode: module.mode,
      module: moduleView(module),
      target,
      checkpointCount: checkpointIds.length,
      messages,
    };
  });

  app.post<{ Params: { id: string } }>(
    '/api/assessments/:id/recommendations/generate',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      if (!acc.canManage) return forbidden(reply, acc);
      const body = parseBody(generateBody, req.body ?? {}, reply);
      if (!body) return;
      const module = await findModule(acc.assessment.companyId, body.moduleId);
      if (module === undefined) return fail(reply, 400, 'invalid_module');
      const usesAi = !!module && module.mode !== 'rules';
      // Ohne ausdrückliche Zustimmung verlassen keine Daten den Server (TC-REC-007).
      if (usesAi && body.consent !== true) return fail(reply, 400, 'consent_required');
      const result = await generateRecommendations(db(), acc.assessment, {
        lang: body.lang,
        userId: me(req).id,
        module: module ?? null,
        apiKey: usesAi ? box.decrypt(module!.apiKeyEnc) : null,
      });
      if (usesAi)
        await audit(db(), req, {
          action: result.origin === 'ai' ? 'ai.recommendations' : 'ai.recommendations_failed',
          userId: me(req).id,
          companyId: acc.assessment.companyId,
          entity: 'assessment',
          entityId: acc.assessment.id,
          details: {
            moduleId: module!.id,
            provider: module!.provider,
            model: module!.model,
            ...(result.notice ? { notice: result.notice } : {}),
            ...(result.status ? { status: result.status } : {}),
          },
        });
      await recordHistory(db(), acc, {
        entityType: 'recommendation',
        action: 'recommendation.generated',
        newValue: {
          origin: result.origin,
          created: result.created,
          module: module?.name ?? null,
          ...(result.notice ? { notice: result.notice } : {}),
        },
      });
      return { ...result, ...(await listPayload(acc)) };
    },
  );

  app.patch<{ Params: { id: string; recId: string } }>(
    '/api/assessments/:id/recommendations/:recId',
    async (req, reply) => {
      const acc = await loadAccess(db(), req, reply, req.params.id);
      if (!acc) return;
      if (!uuid.safeParse(req.params.recId).success) return fail(reply, 404, 'not_found');
      const [rec] = await db()
        .select()
        .from(recommendations)
        .where(
          and(eq(recommendations.id, req.params.recId), eq(recommendations.assessmentId, acc.assessment.id)),
        )
        .limit(1);
      if (!rec) return fail(reply, 404, 'not_found');
      if (!acc.canManage) return forbidden(reply, acc);
      const body = parseBody(patchBody, req.body, reply);
      if (!body) return;
      if (body.version !== rec.version)
        return reply.status(409).send({ error: 'version_conflict', current: rec });
      if (body.ownerUserId && !(await members(acc.assessment.id)).some((m) => m.id === body.ownerUserId))
        return fail(reply, 400, 'invalid_owner');

      const { version: _v, ...changes } = body;
      const editedText =
        (changes.title !== undefined && changes.title !== rec.title) ||
        (changes.text !== undefined && changes.text !== rec.text);
      const [updated] = await db()
        .update(recommendations)
        .set({
          ...changes,
          ...(editedText ? { edited: true } : {}),
          version: rec.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(recommendations.id, rec.id), eq(recommendations.version, rec.version)))
        .returning();
      if (!updated) {
        const [current] = await db().select().from(recommendations).where(eq(recommendations.id, rec.id));
        return reply.status(409).send({ error: 'version_conflict', current });
      }
      // Historie: übernommene/abgelehnte Empfehlungen und Änderungen (03_zusammenfuehrung-und-historie.md).
      const diff = Object.fromEntries(
        Object.entries(changes).filter(([k, v]) => (rec as Record<string, unknown>)[k] !== v),
      );
      if (Object.keys(diff).length)
        await recordHistory(db(), acc, {
          entityType: 'recommendation',
          entityId: rec.id,
          keyAreaId: rec.keyAreaId,
          action: diff.status ? `recommendation.status_${diff.status as string}` : 'recommendation.updated',
          oldValue: Object.fromEntries(
            Object.keys(diff).map((k) => [k, (rec as Record<string, unknown>)[k] ?? null]),
          ),
          newValue: diff,
        });
      const [withOwner] = (await listRecommendations(db(), acc.assessment.id)).filter((r) => r.id === rec.id);
      return withOwner;
    },
  );
};
