/**
 * JSON-Export und -Import eines Assessments (US-1.3, TC-IO-*) sowie Duplizieren (TC-ASM-005).
 *
 * Das Format ist firmenunabhängig: Abteilungen, Personen und Quellen stehen mit Namen bzw. E-Mail-Adresse,
 * nicht mit internen IDs. Beim Import entsteht immer ein **neues** Assessment; bestehende werden nie überschrieben.
 * Unbekannte Kontrollpunkte, Abteilungen und Personen werden übersprungen und im Ergebnis gemeldet.
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { catalog, findCheckpoint } from '@ai-tpi/catalog';
import { assessmentMasterSchema, METHOD_MODELS } from '@ai-tpi/shared';
import type { SessionUser } from '../auth/sessions';
import type { Db } from '../db/client';
import {
  assessmentMembers,
  assessments,
  comments,
  consolidatedAnswers,
  departmentAnswers,
  departments,
  keyAreaAssignments,
  sources,
  users,
} from '../db/schema';
import type { AssessmentRow } from './access';

export const EXPORT_FORMAT = 'ai-tpi-assessment';
export const EXPORT_SCHEMA_VERSION = 1;

const value = z.enum(['yes', 'partial', 'no', 'na']);
const text = (max: number) => z.string().max(max);

/** Aufbau der Exportdatei, Version 1. */
export const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.number().int(),
  exportedAt: z.string().optional(),
  catalogVersion: z.string().max(40),
  assessment: z.object({
    project: z.string(),
    assessorName: z.string(),
    domain: z.string().optional(),
    organizationUnit: z.string().optional(),
    mainStakeholder: z.string().optional(),
    contact: z.string().optional(),
    assessmentType: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    interviewCount: z.number().nullable().optional(),
    scope: z.string().optional(),
    methodModel: z.enum(METHOD_MODELS).optional(),
    includeAi: z.boolean().optional(),
  }),
  members: z
    .array(z.object({ email: text(320), name: text(100).optional() }))
    .max(1000)
    .default([]),
  departments: z.array(text(80)).max(500).default([]),
  assignments: z
    .array(z.object({ keyAreaId: text(10), department: text(80) }))
    .max(5000)
    .default([]),
  sources: z
    .array(
      z.object({
        name: text(120),
        role: text(120).default(''),
        unit: text(120).default(''),
        type: z.enum(['person', 'document', 'tool', 'other']).default('person'),
        active: z.boolean().default(true),
      }),
    )
    .max(1000)
    .default([]),
  departmentAnswers: z
    .array(
      z.object({
        department: text(80),
        checkpointId: text(20),
        value,
        updatedBy: text(320).nullable().optional(),
      }),
    )
    .max(100_000)
    .default([]),
  consolidatedAnswers: z
    .array(
      z.object({
        checkpointId: text(20),
        value,
        suggestedValue: text(10).optional(),
        rationale: text(2000).nullable().optional(),
      }),
    )
    .max(10_000)
    .default([]),
  comments: z
    .array(
      z.object({
        checkpointId: text(20),
        department: text(80).nullable().optional(),
        author: text(320).nullable().optional(),
        authorName: text(100).optional(),
        source: z
          .object({ name: text(120), role: text(120).default('') })
          .nullable()
          .optional(),
        text: z.string().trim().min(1).max(2000),
        createdAt: z.string().optional(),
      }),
    )
    .max(100_000)
    .default([]),
});
export type AssessmentExport = z.input<typeof exportSchema>;

/** Stellt die Exportdatei eines Assessments zusammen. */
export async function buildExport(db: Db, a: AssessmentRow): Promise<AssessmentExport> {
  const [members, deps, assigns, srcs, answers, cons, cmts] = await Promise.all([
    db
      .select({ email: users.email, name: users.name })
      .from(assessmentMembers)
      .innerJoin(users, eq(users.id, assessmentMembers.userId))
      .where(eq(assessmentMembers.assessmentId, a.id))
      .orderBy(asc(users.email)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.companyId, a.companyId)),
    db.select().from(keyAreaAssignments).where(eq(keyAreaAssignments.assessmentId, a.id)),
    db.select().from(sources).where(eq(sources.assessmentId, a.id)).orderBy(asc(sources.name)),
    db
      .select({
        departmentId: departmentAnswers.departmentId,
        checkpointId: departmentAnswers.checkpointId,
        value: departmentAnswers.value,
        updatedBy: users.email,
      })
      .from(departmentAnswers)
      .leftJoin(users, eq(users.id, departmentAnswers.updatedByUserId))
      .where(eq(departmentAnswers.assessmentId, a.id))
      .orderBy(asc(departmentAnswers.checkpointId)),
    db
      .select()
      .from(consolidatedAnswers)
      .where(eq(consolidatedAnswers.assessmentId, a.id))
      .orderBy(asc(consolidatedAnswers.checkpointId)),
    db
      .select({
        checkpointId: comments.checkpointId,
        departmentId: comments.departmentId,
        author: users.email,
        authorName: users.name,
        sourceId: comments.sourceId,
        text: comments.text,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorUserId))
      .where(eq(comments.assessmentId, a.id))
      .orderBy(asc(comments.createdAt)),
  ]);
  const depName = new Map(deps.map((d) => [d.id, d.name]));
  const srcById = new Map(srcs.map((s) => [s.id, s]));
  const usedDeps = new Set([...assigns.map((x) => x.departmentId), ...answers.map((x) => x.departmentId)]);
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    catalogVersion: a.catalogVersion,
    assessment: {
      project: a.project,
      assessorName: a.assessorName,
      domain: a.domain,
      organizationUnit: a.organizationUnit,
      mainStakeholder: a.mainStakeholder,
      contact: a.contact,
      assessmentType: a.assessmentType,
      startDate: a.startDate,
      endDate: a.endDate,
      interviewCount: a.interviewCount,
      scope: a.scope,
      methodModel: a.methodModel,
      includeAi: a.includeAi,
    },
    members,
    departments: [...usedDeps]
      .map((id) => depName.get(id) ?? '')
      .filter(Boolean)
      .sort(),
    assignments: assigns.map((x) => ({
      keyAreaId: x.keyAreaId,
      department: depName.get(x.departmentId) ?? '',
    })),
    sources: srcs.map((s) => ({
      name: s.name,
      role: s.role,
      unit: s.unit,
      type: s.type as 'person',
      active: s.active,
    })),
    departmentAnswers: answers.map((x) => ({
      department: depName.get(x.departmentId) ?? '',
      checkpointId: x.checkpointId,
      value: x.value,
      updatedBy: x.updatedBy,
    })),
    consolidatedAnswers: cons.map((c) => ({
      checkpointId: c.checkpointId,
      value: c.value,
      suggestedValue: c.suggestedValue,
      rationale: c.rationale,
    })),
    comments: cmts.map((c) => {
      const s = c.sourceId ? srcById.get(c.sourceId) : undefined;
      return {
        checkpointId: c.checkpointId,
        department: c.departmentId ? (depName.get(c.departmentId) ?? null) : null,
        author: c.author,
        authorName: c.authorName,
        source: s ? { name: s.name, role: s.role } : null,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
      };
    }),
  };
}

export interface ImportReport {
  id: string;
  project: string;
  imported: { departmentAnswers: number; consolidatedAnswers: number; comments: number; members: number };
  ignored: { checkpoints: string[]; departments: string[]; members: string[]; keyAreas: string[] };
}

export type ImportProblem =
  | { error: 'invalid_format' }
  | { error: 'unsupported_version'; schemaVersion: number }
  | { error: 'invalid_input'; fields: string[] };

/** Prüft eine Exportdatei; liefert die bereinigten Daten oder den Grund der Abweisung. */
export function parseExport(
  body: unknown,
): { ok: true; data: z.output<typeof exportSchema> } | { ok: false; problem: ImportProblem } {
  if (!body || typeof body !== 'object' || (body as { format?: unknown }).format !== EXPORT_FORMAT)
    return { ok: false, problem: { error: 'invalid_format' } };
  const version = (body as { schemaVersion?: unknown }).schemaVersion;
  if (version !== EXPORT_SCHEMA_VERSION)
    return {
      ok: false,
      problem: { error: 'unsupported_version', schemaVersion: typeof version === 'number' ? version : -1 },
    };
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) return { ok: false, problem: { error: 'invalid_format' } };
  const master = assessmentMasterSchema.safeParse(parsed.data.assessment);
  if (!master.success)
    return {
      ok: false,
      problem: {
        error: 'invalid_input',
        fields: [...new Set(master.error.issues.map((i) => String(i.path[0])))],
      },
    };
  return { ok: true, data: parsed.data };
}

/**
 * Legt aus einer geprüften Exportdatei ein neues Assessment in der Firma des Nutzers an.
 * Der Importierende wird Mitglied; Antworten und Kommentare unbekannter Personen werden ihm zugeordnet.
 */
export async function importAssessment(
  db: Db,
  user: SessionUser,
  data: z.output<typeof exportSchema>,
  overrides: { project?: string } = {},
): Promise<ImportReport> {
  const master = assessmentMasterSchema.parse({ ...data.assessment, ...overrides });
  const known = (id: string) => !!findCheckpoint(id);
  const keyAreas = new Set(catalog.keyAreas.map((k) => k.id));

  const companyDeps = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.companyId, user.companyId));
  const depByName = new Map(companyDeps.map((d) => [d.name.toLowerCase(), d.id]));
  const depId = (name: string | null | undefined) => (name ? depByName.get(name.toLowerCase()) : undefined);

  const emails = [
    ...new Set(
      [
        ...data.members.map((m) => m.email),
        ...data.departmentAnswers.map((x) => x.updatedBy ?? ''),
        ...data.comments.map((c) => c.author ?? ''),
      ]
        .map((e) => e.toLowerCase())
        .filter(Boolean),
    ),
  ];
  const companyUsers = emails.length
    ? await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.companyId, user.companyId),
            ne(users.status, 'deleted'),
            inArray(sql`lower(${users.email})`, emails),
          ),
        )
    : [];
  const userByEmail = new Map(companyUsers.map((u) => [u.email.toLowerCase(), u]));
  const userId = (email: string | null | undefined) =>
    (email ? userByEmail.get(email.toLowerCase())?.id : undefined) ?? user.id;

  const ignored = {
    checkpoints: new Set<string>(),
    departments: new Set<string>(),
    members: new Set<string>(),
    keyAreas: new Set<string>(),
  };
  const answerRows = data.departmentAnswers.filter((x) => {
    if (!known(x.checkpointId)) return (void ignored.checkpoints.add(x.checkpointId), false);
    if (!depId(x.department)) return (void ignored.departments.add(x.department), false);
    return true;
  });
  const consRows = data.consolidatedAnswers.filter((x) =>
    known(x.checkpointId) ? true : (ignored.checkpoints.add(x.checkpointId), false),
  );
  const commentRows = data.comments.filter((x) =>
    known(x.checkpointId) ? true : (ignored.checkpoints.add(x.checkpointId), false),
  );
  const assignRows = data.assignments.filter((x) => {
    if (!keyAreas.has(x.keyAreaId)) return (void ignored.keyAreas.add(x.keyAreaId), false);
    if (!depId(x.department)) return (void ignored.departments.add(x.department), false);
    return true;
  });
  for (const d of data.departments) if (!depId(d)) ignored.departments.add(d);
  const memberIds = new Set<string>([user.id]);
  for (const m of data.members) {
    const u = userByEmail.get(m.email.toLowerCase());
    if (u && u.role !== 'admin') memberIds.add(u.id);
    else if (m.email.toLowerCase() !== user.email.toLowerCase()) ignored.members.add(m.email);
  }

  const created = await db.transaction(async (tx) => {
    const [a] = await tx
      .insert(assessments)
      .values({
        ...master,
        companyId: user.companyId,
        catalogVersion: catalog.catalogVersion,
        createdByUserId: user.id,
      })
      .returning();
    const id = a!.id;
    await tx.insert(assessmentMembers).values([...memberIds].map((u) => ({ assessmentId: id, userId: u })));
    const assignValues = [
      ...new Map(
        assignRows.map((x) => [
          `${x.keyAreaId}|${depId(x.department)}`,
          { assessmentId: id, keyAreaId: x.keyAreaId, departmentId: depId(x.department)! },
        ]),
      ).values(),
    ];
    if (assignValues.length) await tx.insert(keyAreaAssignments).values(assignValues);
    const srcIds = new Map<string, string>();
    for (const s of data.sources) {
      const key = `${s.name.toLowerCase()}|${s.role.toLowerCase()}`;
      if (srcIds.has(key)) continue;
      const [row] = await tx
        .insert(sources)
        .values({ ...s, assessmentId: id })
        .returning({ id: sources.id });
      srcIds.set(key, row!.id);
    }
    const answerValues = [
      ...new Map(
        answerRows.map((x) => [
          `${depId(x.department)}|${x.checkpointId}`,
          {
            assessmentId: id,
            departmentId: depId(x.department)!,
            checkpointId: x.checkpointId,
            value: x.value,
            updatedByUserId: userId(x.updatedBy),
          },
        ]),
      ).values(),
    ];
    for (let i = 0; i < answerValues.length; i += 500)
      await tx.insert(departmentAnswers).values(answerValues.slice(i, i + 500));
    const consValues = [
      ...new Map(
        consRows.map((x) => [
          x.checkpointId,
          {
            assessmentId: id,
            checkpointId: x.checkpointId,
            value: x.value,
            suggestedValue: x.suggestedValue ?? x.value,
            rationale: x.rationale ?? null,
            consolidatedByUserId: user.id,
          },
        ]),
      ).values(),
    ];
    if (consValues.length) await tx.insert(consolidatedAnswers).values(consValues);
    const commentValues = commentRows.map((c) => ({
      assessmentId: id,
      checkpointId: c.checkpointId,
      departmentId: depId(c.department) ?? null,
      authorUserId: userId(c.author),
      sourceId: c.source
        ? (srcIds.get(`${c.source.name.toLowerCase()}|${c.source.role.toLowerCase()}`) ?? null)
        : null,
      text: c.text,
      createdAt: c.createdAt && !Number.isNaN(Date.parse(c.createdAt)) ? new Date(c.createdAt) : new Date(),
    }));
    for (let i = 0; i < commentValues.length; i += 500)
      await tx.insert(comments).values(commentValues.slice(i, i + 500));
    return {
      id,
      project: a!.project,
      counts: {
        departmentAnswers: answerValues.length,
        consolidatedAnswers: consValues.length,
        comments: commentValues.length,
        members: memberIds.size,
      },
    };
  });
  return {
    id: created.id,
    project: created.project,
    imported: created.counts,
    ignored: {
      checkpoints: [...ignored.checkpoints].sort(),
      departments: [...ignored.departments].sort(),
      members: [...ignored.members].sort(),
      keyAreas: [...ignored.keyAreas].sort(),
    },
  };
}
