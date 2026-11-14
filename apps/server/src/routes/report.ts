import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { catalog } from '@ai-tpi/catalog';
import { departmentsDisagree, quartileOf, quartiles, type Answer, type Scores } from '@ai-tpi/shared';
import { fail, me } from '../admin/helpers';
import { loadAccess, scopeOf } from '../assessment/access';
import { latestSnapshots, scoreAssessment, type SnapshotArea } from '../assessment/scoring';
import {
  assessments,
  assessmentScores,
  comments,
  companies,
  consolidatedAnswers,
  departmentAnswers,
  departments,
  industries,
  keyAreaAssignments,
  sources,
  users,
} from '../db/schema';
import { requireAuth } from '../plugins/auth';
import type { Db } from '../db/client';

/** Mindestanzahl Firmen je Vergleichsgruppe (R-03), damit keine einzelne Firma zurückgerechnet werden kann. */
export const BENCHMARK_MIN_COMPANIES = 5;

const benchmarkQuery = z.object({ assessmentId: z.string().uuid().optional() });

interface Group {
  n: number;
  enough: boolean;
  overall: ReturnType<typeof quartiles>;
  ai: ReturnType<typeof quartiles>;
  areas: { keyAreaId: string; n: number; q1: number; median: number; q3: number }[];
}

/** Kennzahlen einer Vergleichsgruppe: nur Median und Quartile, keine Einzelwerte (R-03, TC-BM-003). */
function aggregate(rows: { overallIndex: number | null; aiIndex: number | null; areas: unknown }[]): Group {
  const n = rows.length;
  const enough = n >= BENCHMARK_MIN_COMPANIES;
  if (!enough) return { n, enough, overall: null, ai: null, areas: [] };
  const byArea = new Map<string, number[]>();
  for (const r of rows)
    for (const a of r.areas as SnapshotArea[])
      if (a.fulfillment !== null)
        byArea.set(a.keyAreaId, [...(byArea.get(a.keyAreaId) ?? []), a.fulfillment]);
  const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
  return {
    n,
    enough,
    overall: quartiles(nums(rows.map((r) => r.overallIndex))),
    ai:
      nums(rows.map((r) => r.aiIndex)).length >= BENCHMARK_MIN_COMPANIES
        ? quartiles(nums(rows.map((r) => r.aiIndex)))
        : null,
    areas: [...byArea.entries()]
      // Auch je Kernbereich gilt die Mindestanzahl (z. B. KI-Kernbereiche, die nicht alle Firmen bewerten).
      .filter(([, xs]) => xs.length >= BENCHMARK_MIN_COMPANIES)
      .map(([keyAreaId, xs]) => ({ keyAreaId, n: xs.length, ...quartiles(xs)! }))
      .sort((a, b) => a.keyAreaId.localeCompare(b.keyAreaId)),
  };
}

/**
 * Branchen-Median des Erfüllungsgrads je Kernbereich für die Priorisierung der Empfehlungen.
 * Nur wenn die Firma am Benchmark teilnimmt und die Branche genügend Firmen hat (R-03/R-04).
 */
export async function industryAreaMedians(
  db: Db,
  companyId: string,
  catalogVersion: string,
): Promise<Record<string, number> | undefined> {
  const [c] = await db
    .select({ optIn: companies.benchmarkOptIn, industryId: companies.industryId })
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!c?.optIn || !c.industryId) return undefined;
  const g = aggregate(
    (await latestSnapshots(db, catalogVersion)).filter((s) => s.industryId === c.industryId),
  );
  if (!g.enough) return undefined;
  return Object.fromEntries(g.areas.map((a) => [a.keyAreaId, a.median]));
}

/**
 * Bericht (04_auswertung-und-bericht.md) und Benchmark (08_mandanten-und-benchmark.md).
 */
export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth());
  const db = () => app.deps.db!.db;

  app.get<{ Params: { id: string } }>('/api/assessments/:id/report', async (req, reply) => {
    const acc = await loadAccess(db(), req, reply, req.params.id);
    if (!acc) return;
    const a = acc.assessment;
    const [[company], cons, cmts, assigns, deps, answers, scores] = await Promise.all([
      db()
        .select({
          name: companies.name,
          logoUrl: companies.logoUrl,
          logoAlt: companies.logoAlt,
          industryCode: industries.code,
          industryDe: industries.nameDe,
          industryEn: industries.nameEn,
        })
        .from(companies)
        .leftJoin(industries, eq(industries.id, companies.industryId))
        .where(eq(companies.id, a.companyId)),
      db()
        .select({
          checkpointId: consolidatedAnswers.checkpointId,
          value: consolidatedAnswers.value,
          rationale: consolidatedAnswers.rationale,
        })
        .from(consolidatedAnswers)
        .where(eq(consolidatedAnswers.assessmentId, a.id)),
      db()
        .select({
          checkpointId: comments.checkpointId,
          text: comments.text,
          createdAt: comments.createdAt,
          authorName: users.name,
          departmentName: departments.name,
          sourceName: sources.name,
          sourceRole: sources.role,
        })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.authorUserId))
        .leftJoin(departments, eq(departments.id, comments.departmentId))
        .leftJoin(sources, eq(sources.id, comments.sourceId))
        .where(eq(comments.assessmentId, a.id))
        .orderBy(asc(comments.createdAt)),
      db().select().from(keyAreaAssignments).where(eq(keyAreaAssignments.assessmentId, a.id)),
      db()
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.companyId, a.companyId)),
      db().select().from(departmentAnswers).where(eq(departmentAnswers.assessmentId, a.id)),
      scoreAssessment(db(), a),
    ]);
    const depName = new Map(deps.map((d) => [d.id, d.name]));
    const consMap = new Map(cons.map((c) => [c.checkpointId, c]));

    // Konsenslücken (TC-CONS-007): Abteilungen haben unterschiedlich geantwortet. Nicht für Befragte (US-9.1).
    const consensusGaps =
      acc.user.role === 'respondent'
        ? null
        : scopeOf(a).flatMap((area) => {
            const assigned = assigns.filter((x) => x.keyAreaId === area.id).map((x) => x.departmentId);
            return area.checkpoints.flatMap((cp) => {
              const per = assigned.map((d) => ({
                department: depName.get(d) ?? '',
                value: (answers.find((x) => x.departmentId === d && x.checkpointId === cp.id)?.value ??
                  'open') as Answer,
              }));
              if (!departmentsDisagree(per.map((p) => p.value))) return [];
              return [
                {
                  keyAreaId: area.id,
                  checkpointId: cp.id,
                  departments: per,
                  consolidated: (consMap.get(cp.id)?.value ?? 'open') as Answer,
                },
              ];
            });
          });

    return {
      assessment: {
        id: a.id,
        project: a.project,
        assessorName: a.assessorName,
        domain: a.domain,
        organizationUnit: a.organizationUnit,
        mainStakeholder: a.mainStakeholder,
        assessmentType: a.assessmentType,
        startDate: a.startDate,
        endDate: a.endDate,
        interviewCount: a.interviewCount,
        status: a.status,
        releasedAt: a.releasedAt,
        catalogVersion: a.catalogVersion,
        methodModel: a.methodModel,
        includeAi: a.includeAi,
      },
      company: company ?? null,
      departments: [...new Set(assigns.map((x) => depName.get(x.departmentId) ?? ''))].filter(Boolean).sort(),
      scores,
      answers: cons,
      comments: cmts,
      consensusGaps,
    };
  });

  /**
   * Benchmark für alle Rollen: eigene Werte (gewähltes oder jüngstes freigegebenes Assessment) gegen
   * Branche und alle Firmen. Nur Median und Quartile ab 5 Firmen, keine Namen oder Einzelwerte.
   */
  app.get('/api/benchmark', async (req, reply) => {
    const q = benchmarkQuery.safeParse(req.query);
    if (!q.success) return fail(reply, 400, 'invalid_input');
    const u = me(req);
    const [company] = await db()
      .select({
        optIn: companies.benchmarkOptIn,
        industryId: companies.industryId,
        code: industries.code,
        nameDe: industries.nameDe,
        nameEn: industries.nameEn,
      })
      .from(companies)
      .leftJoin(industries, eq(industries.id, companies.industryId))
      .where(eq(companies.id, u.companyId));
    // Wer nicht teilnimmt, sieht auch keinen Vergleich (R-04, TC-BM-005).
    if (!company?.optIn) return { optedOut: true, minCompanies: BENCHMARK_MIN_COMPANIES };

    let own: {
      assessmentId: string;
      project: string;
      released: boolean;
      scores: Pick<Scores, 'overall' | 'ai'> & { areas: SnapshotArea[] };
    } | null = null;
    let catalogVersion = catalog.catalogVersion;
    if (q.data.assessmentId) {
      const acc = await loadAccess(db(), req, reply, q.data.assessmentId);
      if (!acc) return;
      const s = await scoreAssessment(db(), acc.assessment);
      catalogVersion = acc.assessment.catalogVersion;
      own = {
        assessmentId: acc.assessment.id,
        project: acc.assessment.project,
        released: acc.assessment.status === 'released',
        scores: {
          overall: s.overall,
          ai: s.ai,
          areas: s.areas.map((x) => ({ keyAreaId: x.keyAreaId, fulfillment: x.fulfillment, level: x.level })),
        },
      };
    } else {
      const [snap] = await db()
        .select({
          assessmentId: assessmentScores.assessmentId,
          project: assessments.project,
          catalogVersion: assessmentScores.catalogVersion,
          overallIndex: assessmentScores.overallIndex,
          aiIndex: assessmentScores.aiIndex,
          areas: assessmentScores.areas,
        })
        .from(assessmentScores)
        .innerJoin(assessments, eq(assessments.id, assessmentScores.assessmentId))
        .where(and(eq(assessmentScores.companyId, u.companyId)))
        .orderBy(desc(assessmentScores.releasedAt))
        .limit(1);
      if (snap) {
        catalogVersion = snap.catalogVersion;
        own = {
          assessmentId: snap.assessmentId,
          project: snap.project,
          released: true,
          scores: {
            overall: { index: snap.overallIndex } as Scores['overall'],
            ai: { fulfillment: snap.aiIndex } as Scores['ai'],
            areas: snap.areas as SnapshotArea[],
          },
        };
      }
    }

    const snaps = await latestSnapshots(db(), catalogVersion);
    const all = aggregate(snaps);
    const industry = aggregate(
      snaps.filter((s) => company.industryId && s.industryId === company.industryId),
    );
    const position = (g: Group) =>
      own && g.enough
        ? g.areas.flatMap((x) => {
            const v = own!.scores.areas.find((o) => o.keyAreaId === x.keyAreaId)?.fulfillment;
            return v == null
              ? []
              : [
                  {
                    keyAreaId: x.keyAreaId,
                    quartile: quartileOf(v, x),
                    delta: Math.round((v - x.median) * 10) / 10,
                  },
                ];
          })
        : [];
    const overallPosition = (g: Group) =>
      own?.scores.overall.index != null && g.overall ? quartileOf(own.scores.overall.index, g.overall) : null;
    return {
      optedOut: false,
      minCompanies: BENCHMARK_MIN_COMPANIES,
      catalogVersion,
      industry: company.code ? { code: company.code, nameDe: company.nameDe, nameEn: company.nameEn } : null,
      own,
      groups: {
        industry: { ...industry, position: position(industry), overallQuartile: overallPosition(industry) },
        all: { ...all, position: position(all), overallQuartile: overallPosition(all) },
      },
    };
  });
};
