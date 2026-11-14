/**
 * Regel-Engine für Handlungsempfehlungen (Phase 7).
 * Konzept: docs/04_architektur/05_ki-empfehlungen.md, Abschnitt 2.
 *
 * - Kandidaten: alle Kontrollpunkte mit „nein“ oder „teilweise“ in Kernbereichen im Umfang.
 * - Priorität (absteigend): nächsthöhere, noch nicht erreichte Ebene des Kernbereichs → niedriger
 *   Cluster-Buchstabe → KP, von denen andere abhängen (`dependsOn`) → Kernbereich mit größtem Abstand
 *   zum Branchen-Median bzw. niedrigstem Erfüllungsgrad → geringerer Aufwand.
 * - Zeithorizont: Aufwand S → kurzfristig, M/L → langfristig; „teilweise“ mit Aufwand M wird
 *   aufgeteilt in einen kurzfristigen ersten Schritt und die langfristige vollständige Umsetzung.
 * - Verwandte KP (gleicher Kernbereich, gleiche Ebene, gleicher Horizont) werden gebündelt;
 *   höchstens `maxShort` kurzfristige und `maxLong` langfristige Empfehlungen.
 */
import type { Answer } from './assessment';
import { computeScores, LEVELS, type AchievedLevel, type ScoreArea, type ScoreLevel } from './score';

export type Effort = 'S' | 'M' | 'L';
export type Horizon = 'short' | 'long';
/** `first_step`/`full` nur bei der Aufteilung „teilweise“ + Aufwand M. */
export type RecPart = 'whole' | 'first_step' | 'full';
export const HORIZONS: readonly Horizon[] = ['short', 'long'];
export const REC_STATUSES = ['proposed', 'accepted', 'in_progress', 'done', 'rejected'] as const;
export type RecStatus = (typeof REC_STATUSES)[number];

export interface RecCheckpoint {
  id: string;
  level: ScoreLevel;
  effort: Effort;
  tags: string[];
  view?: 'P' | 'T' | 'O';
  cluster?: string;
  dependsOn?: string[];
}
export interface RecArea extends ScoreArea {
  checkpoints: RecCheckpoint[];
}

export interface RuleCandidate {
  checkpointId: string;
  keyAreaId: string;
  level: ScoreLevel;
  effort: Effort;
  value: 'no' | 'partial';
  horizon: Horizon;
  part: RecPart;
}

export interface RuleRecommendation {
  /** Stabiler Schlüssel: Kernbereich, Ebene, Horizont, Teil. */
  key: string;
  keyAreaId: string;
  level: ScoreLevel;
  horizon: Horizon;
  part: RecPart;
  /** Größter Aufwand der gebündelten KP. */
  effort: Effort;
  /** 1 = wichtigste Empfehlung innerhalb des Horizonts. */
  priority: number;
  checkpointIds: string[];
  /** Erfüllungsgrad des Kernbereichs (0–100) oder null. */
  fulfillment: number | null;
  /** Abstand zum Branchen-Median in Prozentpunkten (positiv = unter dem Median) oder null. */
  benchmarkGap: number | null;
}

export interface RuleResult {
  recommendations: RuleRecommendation[];
  /** Alle Kandidaten in Prioritätsreihenfolge (Grundlage für die KI-Stufe). */
  candidates: RuleCandidate[];
  /** Anzahl offener (noch nicht konsolidierter) KP im Umfang. */
  openCount: number;
  /** Anzahl gebündelter Empfehlungen, die wegen der Obergrenze entfallen sind. */
  truncated: { short: number; long: number };
}

export interface RuleOptions {
  /** Branchen-Median des Erfüllungsgrads je Kernbereich (aus dem Benchmark), falls verfügbar. */
  benchmarkMedian?: Record<string, number | null | undefined>;
  maxShort?: number;
  maxLong?: number;
}

const EFFORT_RANK: Record<Effort, number> = { S: 0, M: 1, L: 2 };
const ACHIEVED_RANK: Record<Exclude<AchievedLevel, 'na'>, number> = {
  initial: 0,
  controlled: 1,
  efficient: 2,
  optimizing: 3,
};
const levelRankOf = (l: ScoreLevel) => LEVELS.indexOf(l) + 1;

/** Zeithorizont(e) eines Kandidaten nach Aufwand und Antwort. */
export function horizonsFor(
  effort: Effort,
  value: 'no' | 'partial',
): Array<{ horizon: Horizon; part: RecPart }> {
  if (effort === 'S') return [{ horizon: 'short', part: 'whole' }];
  if (effort === 'M' && value === 'partial')
    return [
      { horizon: 'short', part: 'first_step' },
      { horizon: 'long', part: 'full' },
    ];
  return [{ horizon: 'long', part: 'whole' }];
}

type SortKey = [number, string, number, number, number, number];
const cmpKey = (a: SortKey, b: SortKey) => {
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
};

export function ruleRecommendations(
  areas: RecArea[],
  answers: Map<string, Answer> | Record<string, Answer>,
  opts: RuleOptions = {},
): RuleResult {
  const get = (id: string): Answer => (answers instanceof Map ? answers.get(id) : answers[id]) ?? 'open';
  const maxShort = opts.maxShort ?? 10;
  const maxLong = opts.maxLong ?? 10;
  const scores = computeScores(areas, answers);
  const byArea = new Map(scores.areas.map((s) => [s.keyAreaId, s]));

  // Wie viele KP hängen von einem KP ab?
  const dependents = new Map<string, number>();
  for (const a of areas)
    for (const cp of a.checkpoints)
      for (const d of cp.dependsOn ?? []) dependents.set(d, (dependents.get(d) ?? 0) + 1);

  let openCount = 0;
  let order = 0;
  const entries: Array<{
    cand: RuleCandidate;
    sort: SortKey;
    gap: number | null;
    fulfillment: number | null;
  }> = [];
  for (const area of areas) {
    const s = byArea.get(area.id);
    const achieved = s && s.level !== 'na' ? ACHIEVED_RANK[s.level] : 0;
    const f = s?.fulfillment ?? null;
    const median = opts.benchmarkMedian?.[area.id];
    const gap = median != null && f != null ? Math.round((median - f) * 10) / 10 : null;
    // Größter Abstand zum Median bzw. – ohne Benchmark – niedrigster Erfüllungsgrad zuerst.
    const areaKey = -(gap ?? 100 - (f ?? 0));
    for (const cp of area.checkpoints) {
      order += 1;
      const value = get(cp.id);
      if (value === 'open') openCount += 1;
      if (value !== 'no' && value !== 'partial') continue;
      for (const h of horizonsFor(cp.effort, value)) {
        entries.push({
          cand: {
            checkpointId: cp.id,
            keyAreaId: area.id,
            level: cp.level,
            effort: cp.effort,
            value,
            horizon: h.horizon,
            part: h.part,
          },
          sort: [
            Math.max(0, levelRankOf(cp.level) - achieved - 1),
            cp.cluster ?? '~',
            -(dependents.get(cp.id) ?? 0),
            areaKey,
            EFFORT_RANK[cp.effort],
            order,
          ],
          gap,
          fulfillment: f,
        });
      }
    }
  }
  entries.sort((a, b) => cmpKey(a.sort, b.sort));

  // Bündeln: gleicher Kernbereich, gleiche Ebene, gleicher Horizont und Teil.
  const bundles = new Map<string, RuleRecommendation & { rank: number }>();
  entries.forEach((e, rank) => {
    const c = e.cand;
    const key = `${c.keyAreaId}|${c.level}|${c.horizon}|${c.part}`;
    const b = bundles.get(key);
    if (b) {
      b.checkpointIds.push(c.checkpointId);
      if (EFFORT_RANK[c.effort] > EFFORT_RANK[b.effort]) b.effort = c.effort;
      return;
    }
    bundles.set(key, {
      key,
      keyAreaId: c.keyAreaId,
      level: c.level,
      horizon: c.horizon,
      part: c.part,
      effort: c.effort,
      priority: 0,
      checkpointIds: [c.checkpointId],
      fulfillment: e.fulfillment,
      benchmarkGap: e.gap,
      rank,
    });
  });

  const recommendations: RuleRecommendation[] = [];
  const truncated = { short: 0, long: 0 };
  for (const horizon of HORIZONS) {
    const limit = horizon === 'short' ? maxShort : maxLong;
    const list = [...bundles.values()].filter((b) => b.horizon === horizon).sort((a, b) => a.rank - b.rank);
    truncated[horizon] = Math.max(0, list.length - limit);
    list.slice(0, limit).forEach(({ rank: _r, ...b }, i) => recommendations.push({ ...b, priority: i + 1 }));
  }

  return { recommendations, candidates: entries.map((e) => e.cand), openCount, truncated };
}
