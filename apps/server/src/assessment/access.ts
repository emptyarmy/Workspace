/**
 * Zugriff auf Assessments (Phase 5) und Änderungshistorie.
 *
 * Rechte (docs/04_architektur/02_datenmodell.md, Validierungsregeln):
 * - Fremde Firma → 404 (Existenz wird nicht verraten).
 * - Admin: Lesezugriff auf alle Assessments der eigenen Firma, kein Schreibzugriff (S-11).
 * - Assessor, Befragter, Leser: nur Assessments, in denen sie Mitglied sind; sonst 403 (TC-MU-005).
 * - Assessor: Stammdaten, Team, Zuweisung, Quellen, Zusammenführung.
 * - Befragter (und Assessor mit Abteilung): Antworten seiner Abteilung in zugewiesenen Kernbereichen.
 * - Leser: nur lesen.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { catalog, type Checkpoint, type KeyArea } from '@ai-tpi/catalog';
import { checkpointInScope, type MethodModel } from '@ai-tpi/shared';
import type { SessionUser } from '../auth/sessions';
import type { Db } from '../db/client';
import {
  assessmentMembers,
  assessments,
  changeHistory,
  departments,
  keyAreaAssignments,
  users,
} from '../db/schema';

export type AssessmentRow = typeof assessments.$inferSelect;

export interface Access {
  assessment: AssessmentRow;
  user: SessionUser;
  isMember: boolean;
  /** Abteilung des Nutzers (für Befragte maßgeblich). */
  departmentId: string | null;
  departmentName: string | null;
  canManage: boolean;
  canAnswer: boolean;
  canComment: boolean;
  canConsolidate: boolean;
}

const uuid = z.string().uuid();

/**
 * Lädt das Assessment samt Rechten des angemeldeten Nutzers oder sendet 404/403.
 * Rückgabe `undefined` bedeutet: Antwort wurde bereits gesendet.
 */
export async function loadAccess(
  db: Db,
  req: FastifyRequest,
  reply: FastifyReply,
  id: unknown,
): Promise<Access | undefined> {
  const user = req.user!;
  if (!uuid.safeParse(id).success) {
    void reply.status(404).send({ error: 'not_found' });
    return undefined;
  }
  const [a] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.id, id as string), eq(assessments.companyId, user.companyId)))
    .limit(1);
  if (!a) {
    void reply.status(404).send({ error: 'not_found' });
    return undefined;
  }
  const [m] = await db
    .select({ userId: assessmentMembers.userId })
    .from(assessmentMembers)
    .where(and(eq(assessmentMembers.assessmentId, a.id), eq(assessmentMembers.userId, user.id)))
    .limit(1);
  const isMember = !!m;
  if (!isMember && user.role !== 'admin') {
    void reply.status(403).send({ error: 'forbidden' });
    return undefined;
  }
  const [u] = await db
    .select({ departmentId: users.departmentId, departmentName: departments.name })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, user.id))
    .limit(1);
  const assessor = isMember && user.role === 'assessor';
  /** Antworten für die eigene Abteilung: Befragte und Assessoren mit Abteilung. */
  const answerer = isMember && (user.role === 'respondent' || user.role === 'assessor') && !!u?.departmentId;
  const respondent = isMember && user.role === 'respondent' && !!u?.departmentId;
  return {
    assessment: a,
    user,
    isMember,
    departmentId: u?.departmentId ?? null,
    departmentName: u?.departmentName ?? null,
    canManage: assessor,
    canAnswer: answerer && a.status === 'collecting',
    canComment: (assessor || respondent) && a.status !== 'released',
    canConsolidate: assessor,
  };
}

/** Kontrollpunkte und Kernbereiche, die für das Vorgehensmodell des Assessments gelten (TC-ASM-008). */
export function scopeOf(a: { methodModel: MethodModel; includeAi: boolean }) {
  const areas: Array<KeyArea & { checkpoints: Checkpoint[] }> = [];
  for (const area of catalog.keyAreas) {
    const cps = area.checkpoints.filter((cp) => checkpointInScope(cp, area, a));
    if (cps.length) areas.push({ ...area, checkpoints: cps });
  }
  return areas;
}

export function findInScope(a: AssessmentRow, checkpointId: string) {
  for (const area of scopeOf(a)) {
    const cp = area.checkpoints.find((c) => c.id === checkpointId);
    if (cp) return { area, cp };
  }
  return undefined;
}

export async function assignedDepartments(
  db: Db,
  assessmentId: string,
  keyAreaId: string,
): Promise<string[]> {
  const rows = await db
    .select({ d: keyAreaAssignments.departmentId })
    .from(keyAreaAssignments)
    .where(
      and(eq(keyAreaAssignments.assessmentId, assessmentId), eq(keyAreaAssignments.keyAreaId, keyAreaId)),
    );
  return rows.map((r) => r.d);
}

/** Wert für die Historie lesbar machen: Objekte als JSON, leere Werte als null. */
const asText = (v: unknown): string | null =>
  v === undefined || v === null || v === '' ? null : typeof v === 'string' ? v : JSON.stringify(v);

/** Eintrag in die append-only Änderungshistorie (N-03). */
export async function recordHistory(
  db: Db,
  acc: Pick<Access, 'assessment' | 'user' | 'departmentId' | 'departmentName'>,
  entry: {
    entityType: string;
    action: string;
    entityId?: string | null;
    checkpointId?: string | null;
    keyAreaId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    rationale?: string | null;
    /** Abweichende Abteilung (z. B. Abteilungsantwort); Standard: Abteilung des Nutzers. */
    department?: { id: string; name: string } | null;
  },
): Promise<void> {
  const keyAreaId =
    entry.keyAreaId ??
    (entry.checkpointId ? (findInScope(acc.assessment, entry.checkpointId)?.area.id ?? null) : null);
  await db.insert(changeHistory).values({
    companyId: acc.assessment.companyId,
    assessmentId: acc.assessment.id,
    assessmentName: acc.assessment.project,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    keyAreaId,
    checkpointId: entry.checkpointId ?? null,
    action: entry.action,
    oldValue: asText(entry.oldValue),
    newValue: asText(entry.newValue),
    rationale: entry.rationale ?? null,
    userId: acc.user.id,
    userNameSnapshot: acc.user.name,
    userRoleSnapshot: acc.user.role,
    departmentId: entry.department ? entry.department.id : acc.departmentId,
    departmentSnapshot: entry.department ? entry.department.name : acc.departmentName,
  });
}
