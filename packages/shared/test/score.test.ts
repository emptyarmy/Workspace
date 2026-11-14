import { describe, expect, it } from 'vitest';
import type { Answer } from '../src/assessment';
import {
  achievedLevel,
  computeScores,
  fulfillment,
  quartileOf,
  quartiles,
  type ScoreArea,
} from '../src/score';

/** Fixture: zwei Kernbereiche mit je 2 KP pro Ebene, ein KI-Kernbereich. */
const cp = (
  id: string,
  level: 'controlled' | 'efficient' | 'optimizing',
  view?: 'P' | 'T' | 'O',
  tags: string[] = [],
) => ({
  id,
  level,
  view,
  tags,
});
const areas: ScoreArea[] = [
  {
    id: 'KB01',
    isAiArea: false,
    checkpoints: [
      cp('1K1', 'controlled', 'P'),
      cp('1K2', 'controlled', 'T'),
      cp('1E1', 'efficient', 'O'),
      cp('1E2', 'efficient', undefined, ['AI']),
      cp('1O1', 'optimizing'),
      cp('1O2', 'optimizing'),
    ],
  },
  {
    id: 'KB02',
    isAiArea: false,
    checkpoints: [
      cp('2K1', 'controlled'),
      cp('2K2', 'controlled'),
      cp('2E1', 'efficient'),
      cp('2O1', 'optimizing'),
    ],
  },
  { id: 'KB17', isAiArea: true, checkpoints: [cp('17K1', 'controlled'), cp('17K2', 'controlled')] },
];
const answers: Record<string, Answer> = {
  '1K1': 'yes',
  '1K2': 'yes',
  '1E1': 'yes',
  '1E2': 'na',
  '1O1': 'partial',
  '1O2': 'no',
  '2K1': 'yes',
  '2K2': 'no',
  '2E1': 'yes',
  '17K1': 'na',
  '17K2': 'na',
};

describe('achievedLevel (TPI NEXT, TC-REP-002)', () => {
  it('alle KP bis Effizient erfüllt, n. a. neutral → Effizient', () => {
    expect(
      achievedLevel([
        { level: 'controlled', value: 'yes' },
        { level: 'efficient', value: 'na' },
        { level: 'efficient', value: 'yes' },
        { level: 'optimizing', value: 'partial' },
      ]),
    ).toBe('efficient');
  });
  it('ein nicht erfüllter KP auf Kontrolliert → Initial, auch wenn höhere erfüllt sind', () => {
    expect(
      achievedLevel([
        { level: 'controlled', value: 'no' },
        { level: 'efficient', value: 'yes' },
      ]),
    ).toBe('initial');
  });
  it('„teilweise“ und „offen“ zählen nicht als erfüllt', () => {
    expect(achievedLevel([{ level: 'controlled', value: 'partial' }])).toBe('initial');
    expect(achievedLevel([{ level: 'controlled', value: 'open' }])).toBe('initial');
  });
  it('alles erfüllt → Optimierend; alles n. a. → n. a.', () => {
    expect(
      achievedLevel([
        { level: 'controlled', value: 'yes' },
        { level: 'optimizing', value: 'yes' },
      ]),
    ).toBe('optimizing');
    expect(achievedLevel([{ level: 'controlled', value: 'na' }])).toBe('na');
  });
});

describe('computeScores', () => {
  const s = computeScores(areas, answers);
  const kb = (id: string) => s.areas.find((a) => a.keyAreaId === id)!;
  it('Erfüllungsgrad je KB: (yes + 0,5·partial) / (KP − n. a.)', () => {
    expect(kb('KB01').fulfillment).toBe(70); // (3 + 0,5) / 5
    expect(kb('KB02').fulfillment).toBe(50); // 2 / 4 (offen zählt als nicht erfüllt)
    expect(kb('KB01').level).toBe('efficient');
    expect(kb('KB02').level).toBe('initial');
  });
  it('TC-REP-005: alle KP n. a. → Ebene n. a., Erfüllungsgrad null', () => {
    expect(kb('KB17')).toMatchObject({ level: 'na', fulfillment: null, na: 2 });
  });
  it('Gesamtindex = Mittelwert der KB, niedrigste und mittlere Ebene, Fortschritt', () => {
    expect(s.overall.index).toBe(60);
    expect(s.overall.minLevel).toBe('initial');
    expect(s.overall.medianLevel).toBe('initial');
    expect(s.overall.progress).toBe(91.7); // 11 von 12 bewertet
    expect(s.overall).toMatchObject({ yes: 5, partial: 1, no: 2, na: 3, open: 1, total: 12 });
  });
  it('Ebenen und Sichten P/T/O wie im Excel-Blatt', () => {
    expect(s.byLevel.controlled).toMatchObject({ yes: 3, no: 1, na: 2, fulfillment: 75 });
    expect(s.byView.P).toMatchObject({ yes: 1, total: 1, fulfillment: 100 });
    expect(s.byView.O).toMatchObject({ yes: 1, total: 1 });
  });
  it('TC-REP-008: KI-Index über KI-Kernbereiche und KI-markierte KP', () => {
    expect(s.ai).toMatchObject({ total: 3, na: 3, fulfillment: null });
    const withAi = computeScores(areas, { ...answers, '17K1': 'yes', '17K2': 'partial' });
    expect(withAi.ai.fulfillment).toBe(75);
  });
  it('ohne Antworten: keine Daten (TC-REP-004)', () => {
    const empty = computeScores(areas, {});
    expect(empty.hasData).toBe(false);
    expect(empty.overall.progress).toBe(0);
    expect(empty.overall.index).toBe(0);
  });
  it('Gewicht für „teilweise“ konfigurierbar', () => {
    expect(fulfillment({ yes: 1, partial: 2, no: 1, na: 0, open: 0, total: 4 }, 0)).toBe(25);
    expect(fulfillment({ yes: 1, partial: 2, no: 1, na: 0, open: 0, total: 4 }, 1)).toBe(75);
  });
});

describe('Quartile für den Benchmark', () => {
  it('Median und Quartile mit Interpolation', () => {
    expect(quartiles([10, 20, 30, 40, 50])).toEqual({ q1: 20, median: 30, q3: 40 });
    expect(quartiles([1, 2, 3, 4])).toEqual({ q1: 1.8, median: 2.5, q3: 3.3 });
    expect(quartiles([])).toBeNull();
  });
  it('Einordnung in Viertel', () => {
    const q = { q1: 20, median: 30, q3: 40 };
    expect([5, 25, 35, 45].map((v) => quartileOf(v, q))).toEqual([1, 2, 3, 4]);
  });
});
