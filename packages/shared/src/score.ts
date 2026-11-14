/**
 * Scoring Engine (Phase 6): Kennzahlen aus den konsolidierten Antworten.
 * Regeln: docs/02_analyse/02_reifegradmodell-und-bewertung.md, Abschnitt 3.
 *
 * - Erreichte Ebene je Kernbereich (TPI NEXT): höchste Ebene, bis zu der alle anwendbaren
 *   Kontrollpunkte (dieser und aller darunter liegenden Ebenen) „erfüllt“ sind. „n. a.“ zählt nicht mit,
 *   „teilweise“ und „offen“ gelten als nicht erfüllt.
 * - Erfüllungsgrad: (#erfüllt + w · #teilweise) / (#KP − #n. a.) · 100, w = 0,5 (konfigurierbar).
 *   Ohne anwendbare Kontrollpunkte gibt es keinen Wert (null) – keine Division durch 0 (TC-REP-005).
 * - Gesamtindex (F-06, Variante C): Mittelwert der Erfüllungsgrade der Kernbereiche (gleiche Gewichte).
 *   Zusätzlich werden niedrigste (Variante A) und mittlere erreichte Ebene (Variante B) ausgewiesen.
 * - KI-Index (F-10): Erfüllungsgrad über KI-Kernbereiche und KI-markierte Kontrollpunkte.
 */
import type { Answer } from './assessment';

export const LEVELS = ['controlled', 'efficient', 'optimizing'] as const;
export type ScoreLevel = (typeof LEVELS)[number];
/** Erreichte Ebene; `na` = alle Kontrollpunkte des Kernbereichs nicht anwendbar. */
export type AchievedLevel = 'initial' | ScoreLevel | 'na';
export const VIEWS = ['P', 'T', 'O'] as const;
export type View = (typeof VIEWS)[number];

export const DEFAULT_PARTIAL_WEIGHT = 0.5;

/** Mindestangaben je Kontrollpunkt bzw. Kernbereich (unabhängig vom Katalogpaket). */
export interface ScoreCheckpoint {
  id: string;
  level: ScoreLevel;
  tags: string[];
  view?: View;
}
export interface ScoreArea {
  id: string;
  isAiArea: boolean;
  checkpoints: ScoreCheckpoint[];
}

export interface Counts {
  yes: number;
  partial: number;
  no: number;
  na: number;
  open: number;
  total: number;
}
export interface Stat extends Counts {
  /** Erfüllungsgrad 0–100 oder null, wenn kein anwendbarer Kontrollpunkt vorhanden ist. */
  fulfillment: number | null;
}
export interface AreaScore extends Stat {
  keyAreaId: string;
  isAiArea: boolean;
  level: AchievedLevel;
  byLevel: Record<ScoreLevel, Stat>;
}
export interface Scores {
  areas: AreaScore[];
  overall: Stat & {
    /** Gesamtindex 0–100 (Mittelwert der Kernbereiche) oder null. */
    index: number | null;
    minLevel: AchievedLevel | null;
    medianLevel: AchievedLevel | null;
    progress: number;
  };
  byLevel: Record<ScoreLevel, Stat>;
  byView: Record<View, Stat>;
  ai: Stat;
  /** Mindestens ein Kontrollpunkt ist bewertet. */
  hasData: boolean;
}

const emptyCounts = (): Counts => ({ yes: 0, partial: 0, no: 0, na: 0, open: 0, total: 0 });

function add(c: Counts, v: Answer) {
  c[v] += 1;
  c.total += 1;
}

export function fulfillment(c: Counts, partialWeight = DEFAULT_PARTIAL_WEIGHT): number | null {
  const applicable = c.total - c.na;
  if (applicable <= 0) return null;
  return round1(((c.yes + partialWeight * c.partial) / applicable) * 100);
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const stat = (c: Counts, w: number): Stat => ({ ...c, fulfillment: fulfillment(c, w) });

/** Erreichte Ebene nach TPI NEXT (Abschnitt 3.1). */
export function achievedLevel(cps: { level: ScoreLevel; value: Answer }[]): AchievedLevel {
  if (cps.length > 0 && cps.every((c) => c.value === 'na')) return 'na';
  let reached: AchievedLevel = 'initial';
  for (const level of LEVELS) {
    const upTo = LEVELS.slice(0, LEVELS.indexOf(level) + 1);
    const ok = cps.filter((c) => upTo.includes(c.level) && c.value !== 'na').every((c) => c.value === 'yes');
    if (!ok) break;
    reached = level;
  }
  return reached;
}

const LEVEL_RANK: Record<Exclude<AchievedLevel, 'na'>, number> = {
  initial: 0,
  controlled: 1,
  efficient: 2,
  optimizing: 3,
};
const RANK_LEVEL = ['initial', 'controlled', 'efficient', 'optimizing'] as const;

/** Rang einer Ebene (0 = Initial … 3 = Optimierend), z. B. für Diagramme. */
export const levelRank = (l: AchievedLevel): number | null => (l === 'na' ? null : LEVEL_RANK[l]);

/**
 * Berechnet alle Kennzahlen. `answers` enthält nur bewertete Kontrollpunkte; fehlende gelten als offen.
 * `areas` sind die Kernbereiche im Umfang des Assessments (Vorgehensmodell, KI ein/aus bereits angewendet).
 */
export function computeScores(
  areas: ScoreArea[],
  answers: Map<string, Answer> | Record<string, Answer>,
  partialWeight = DEFAULT_PARTIAL_WEIGHT,
): Scores {
  const get = (id: string): Answer => (answers instanceof Map ? answers.get(id) : answers[id]) ?? 'open';
  const total = emptyCounts();
  const ai = emptyCounts();
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, emptyCounts()])) as Record<ScoreLevel, Counts>;
  const byView = Object.fromEntries(VIEWS.map((v) => [v, emptyCounts()])) as Record<View, Counts>;

  const areaScores = areas.map((area): AreaScore => {
    const c = emptyCounts();
    const lv = Object.fromEntries(LEVELS.map((l) => [l, emptyCounts()])) as Record<ScoreLevel, Counts>;
    const values = area.checkpoints.map((cp) => ({ level: cp.level, value: get(cp.id) }));
    area.checkpoints.forEach((cp, i) => {
      const v = values[i]!.value;
      add(c, v);
      add(lv[cp.level], v);
      add(total, v);
      add(byLevel[cp.level], v);
      if (cp.view) add(byView[cp.view], v);
      if (area.isAiArea || cp.tags.includes('AI')) add(ai, v);
    });
    return {
      keyAreaId: area.id,
      isAiArea: area.isAiArea,
      ...stat(c, partialWeight),
      level: achievedLevel(values),
      byLevel: Object.fromEntries(LEVELS.map((l) => [l, stat(lv[l], partialWeight)])) as Record<
        ScoreLevel,
        Stat
      >,
    };
  });

  const fulfilled = areaScores.map((a) => a.fulfillment).filter((x): x is number => x !== null);
  const ranks = areaScores.map((a) => levelRank(a.level)).filter((x): x is number => x !== null);
  const hasData = total.total > total.open;
  // Bei gerader Anzahl die niedrigere der beiden mittleren Ebenen (vorsichtige Einstufung).
  const sortedRanks = [...ranks].sort((a, b) => a - b);
  const med = sortedRanks.length ? sortedRanks[Math.floor((sortedRanks.length - 1) / 2)]! : null;
  return {
    areas: areaScores,
    overall: {
      ...stat(total, partialWeight),
      index: fulfilled.length ? round1(fulfilled.reduce((s, x) => s + x, 0) / fulfilled.length) : null,
      minLevel: ranks.length ? RANK_LEVEL[Math.min(...ranks)]! : null,
      medianLevel: med === null ? null : RANK_LEVEL[med]!,
      progress: total.total ? round1(((total.total - total.open) / total.total) * 100) : 0,
    },
    byLevel: Object.fromEntries(LEVELS.map((l) => [l, stat(byLevel[l], partialWeight)])) as Record<
      ScoreLevel,
      Stat
    >,
    byView: Object.fromEntries(VIEWS.map((v) => [v, stat(byView[v], partialWeight)])) as Record<View, Stat>,
    ai: stat(ai, partialWeight),
    hasData,
  };
}

/** Quartile (lineare Interpolation) für den Benchmark. */
export function quartiles(xs: number[]): { q1: number; median: number; q3: number } | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (s.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return round1(s[lo]! + (s[hi]! - s[lo]!) * (pos - lo));
  };
  return { q1: q(0.25), median: q(0.5), q3: q(0.75) };
}

/** In welchem Viertel liegt ein Wert relativ zu den Quartilen? 1 = unteres, 4 = oberes Viertel. */
export function quartileOf(value: number, q: { q1: number; median: number; q3: number }): 1 | 2 | 3 | 4 {
  if (value >= q.q3) return 4;
  if (value >= q.median) return 3;
  if (value >= q.q1) return 2;
  return 1;
}
