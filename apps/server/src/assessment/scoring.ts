/**
 * Auswertung eines Assessments (Phase 6) und Benchmark-Schnappschüsse.
 * Grundlage sind ausschließlich die konsolidierten Antworten (N-03).
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import { computeScores, type Answer, type Scores } from '@ai-tpi/shared';
import type { Db } from '../db/client';
import { assessmentScores, companies, consolidatedAnswers } from '../db/schema';
import { scopeOf, type AssessmentRow } from './access';

export async function consolidatedMap(db: Db, assessmentId: string) {
  const rows = await db
    .select({ checkpointId: consolidatedAnswers.checkpointId, value: consolidatedAnswers.value })
    .from(consolidatedAnswers)
    .where(eq(consolidatedAnswers.assessmentId, assessmentId));
  return new Map<string, Answer>(rows.map((r) => [r.checkpointId, r.value]));
}

export async function scoreAssessment(db: Db, a: AssessmentRow): Promise<Scores> {
  return computeScores(scopeOf(a), await consolidatedMap(db, a.id));
}

/** Schnappschuss für den Benchmark anlegen bzw. erneuern (bei Freigabe und Änderungen danach). */
export async function saveSnapshot(db: Db, a: AssessmentRow): Promise<void> {
  const s = await scoreAssessment(db, a);
  const values = {
    companyId: a.companyId,
    catalogVersion: a.catalogVersion,
    releasedAt: a.releasedAt ?? new Date(),
    overallIndex: s.overall.index,
    aiIndex: s.ai.fulfillment,
    areas: s.areas.map((x) => ({ keyAreaId: x.keyAreaId, fulfillment: x.fulfillment, level: x.level })),
  };
  await db
    .insert(assessmentScores)
    .values({ assessmentId: a.id, ...values })
    .onConflictDoUpdate({ target: assessmentScores.assessmentId, set: values });
}

export async function removeSnapshot(db: Db, assessmentId: string): Promise<void> {
  await db.delete(assessmentScores).where(eq(assessmentScores.assessmentId, assessmentId));
}

export interface SnapshotArea {
  keyAreaId: string;
  fulfillment: number | null;
  level: string;
}

/**
 * Je teilnehmender Firma der jüngste Schnappschuss mit passender Katalogversion.
 * Firmen mit Opt-out oder deaktivierte Firmen fließen nicht ein (R-04).
 */
export async function latestSnapshots(db: Db, catalogVersion: string) {
  return db
    .selectDistinctOn([assessmentScores.companyId], {
      companyId: assessmentScores.companyId,
      industryId: companies.industryId,
      overallIndex: assessmentScores.overallIndex,
      aiIndex: assessmentScores.aiIndex,
      areas: assessmentScores.areas,
    })
    .from(assessmentScores)
    .innerJoin(companies, eq(companies.id, assessmentScores.companyId))
    .where(
      and(
        eq(companies.benchmarkOptIn, true),
        eq(companies.active, true),
        eq(assessmentScores.catalogVersion, catalogVersion),
      ),
    )
    .orderBy(
      assessmentScores.companyId,
      desc(assessmentScores.releasedAt),
      sql`${assessmentScores.assessmentId}`,
    );
}
