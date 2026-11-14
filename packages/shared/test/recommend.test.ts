import { describe, expect, it } from 'vitest';
import type { Answer } from '../src/assessment';
import { horizonsFor, ruleRecommendations, type RecArea, type RecCheckpoint } from '../src/recommend';

const cp = (
  id: string,
  level: RecCheckpoint['level'],
  effort: RecCheckpoint['effort'],
  extra: Partial<RecCheckpoint> = {},
): RecCheckpoint => ({ id, level, effort, tags: [], ...extra });

const areas: RecArea[] = [
  {
    id: 'KB01',
    isAiArea: false,
    checkpoints: [
      cp('1K1', 'controlled', 'S'),
      cp('1K2', 'controlled', 'L'),
      cp('1E1', 'efficient', 'S'),
      cp('1O1', 'optimizing', 'S'),
    ],
  },
  {
    id: 'KB02',
    isAiArea: false,
    checkpoints: [
      cp('2K1', 'controlled', 'S'),
      cp('2K2', 'controlled', 'M'),
      cp('2E1', 'efficient', 'S'),
      cp('2E2', 'efficient', 'M'),
    ],
  },
];
const answers = (o: Record<string, Answer>) => new Map(Object.entries(o));

describe('horizonsFor (TC-REC-002)', () => {
  it('ordnet S kurzfristig und M/L langfristig zu', () => {
    expect(horizonsFor('S', 'no')).toEqual([{ horizon: 'short', part: 'whole' }]);
    expect(horizonsFor('S', 'partial')).toEqual([{ horizon: 'short', part: 'whole' }]);
    expect(horizonsFor('M', 'no')).toEqual([{ horizon: 'long', part: 'whole' }]);
    expect(horizonsFor('L', 'no')).toEqual([{ horizon: 'long', part: 'whole' }]);
    expect(horizonsFor('L', 'partial')).toEqual([{ horizon: 'long', part: 'whole' }]);
  });
  it('teilt „teilweise“ mit Aufwand M in ersten Schritt und vollständige Umsetzung', () => {
    expect(horizonsFor('M', 'partial')).toEqual([
      { horizon: 'short', part: 'first_step' },
      { horizon: 'long', part: 'full' },
    ]);
  });
});

describe('ruleRecommendations', () => {
  it('erzeugt kurz- und langfristige Empfehlungen nur für „nein“/„teilweise“ (TC-REC-001)', () => {
    const r = ruleRecommendations(
      areas,
      answers({ '1K1': 'no', '1K2': 'no', '1E1': 'yes', '2K1': 'yes', '2K2': 'partial', '2E1': 'na' }),
    );
    const ids = r.recommendations.flatMap((x) => x.checkpointIds);
    expect(ids).not.toContain('1E1');
    expect(ids).not.toContain('2K1');
    expect(ids).not.toContain('2E1');
    expect(r.recommendations.filter((x) => x.horizon === 'short').length).toBeGreaterThan(0);
    expect(r.recommendations.filter((x) => x.horizon === 'long').length).toBeGreaterThan(0);
    // 2K2 teilweise + M → beide Horizonte
    const parts = r.recommendations.filter((x) => x.checkpointIds.includes('2K2')).map((x) => x.part);
    expect(parts.sort()).toEqual(['first_step', 'full']);
    // offen: 1O1, 2E2
    expect(r.openCount).toBe(2);
  });

  it('liefert keine Empfehlungen, wenn alles erfüllt ist (TC-REC-009)', () => {
    const all = Object.fromEntries(areas.flatMap((a) => a.checkpoints.map((c) => [c.id, 'yes' as Answer])));
    const r = ruleRecommendations(areas, answers(all));
    expect(r.recommendations).toEqual([]);
    expect(r.candidates).toEqual([]);
    expect(r.openCount).toBe(0);
  });

  it('priorisiert die nächsthöhere, noch nicht erreichte Ebene vor höheren Ebenen', () => {
    const r = ruleRecommendations(
      areas,
      answers({ '1K1': 'yes', '1K2': 'yes', '1E1': 'no', '1O1': 'no', '2K1': 'no' }),
    );
    const short = r.recommendations.filter((x) => x.horizon === 'short');
    // KB01 hat „Kontrolliert“ erreicht → 1E1 (nächste Ebene) und 2K1 (nächste Ebene von KB02) vor 1O1
    expect(short.map((x) => x.checkpointIds[0])).toEqual(['2K1', '1E1', '1O1']);
    expect(short.map((x) => x.priority)).toEqual([1, 2, 3]);
  });

  it('berücksichtigt Cluster, Abhängigkeiten und Aufwand', () => {
    const a: RecArea[] = [
      {
        id: 'KB09',
        isAiArea: false,
        checkpoints: [
          cp('9a', 'controlled', 'S', { cluster: 'C' }),
          cp('9b', 'controlled', 'S', { cluster: 'A' }),
        ],
      },
      {
        id: 'KB08',
        isAiArea: false,
        checkpoints: [
          cp('8a', 'controlled', 'S'),
          cp('8b', 'controlled', 'S', { dependsOn: ['8c'] }),
          cp('8c', 'controlled', 'S'),
        ],
      },
    ];
    const r = ruleRecommendations(a, answers({ '9a': 'no', '9b': 'no', '8a': 'no', '8b': 'no', '8c': 'no' }));
    expect(r.candidates.map((c) => c.checkpointId)).toEqual(['9b', '9a', '8c', '8a', '8b']);
  });

  it('bevorzugt Kernbereiche mit größerem Abstand zum Branchen-Median', () => {
    const ans = answers({ '1K1': 'no', '2K1': 'no', '2K2': 'yes', '1K2': 'yes' });
    // ohne Benchmark: gleicher Erfüllungsgrad je KB (25 % vs. 25 %) → Katalogreihenfolge
    expect(ruleRecommendations(areas, ans).candidates.map((c) => c.checkpointId)).toEqual(['1K1', '2K1']);
    const r = ruleRecommendations(areas, ans, { benchmarkMedian: { KB01: 30, KB02: 80 } });
    expect(r.candidates.map((c) => c.checkpointId)).toEqual(['2K1', '1K1']);
    const kb2 = r.recommendations.find((x) => x.keyAreaId === 'KB02')!;
    expect(kb2.benchmarkGap).toBe(55);
  });

  it('bündelt KP gleicher Ebene im Kernbereich und begrenzt auf max. 10 + 10', () => {
    const big: RecArea[] = Array.from({ length: 14 }, (_, i) => ({
      id: `KB${i + 10}`,
      isAiArea: false,
      checkpoints: [
        cp(`${i}a`, 'controlled', 'S'),
        cp(`${i}b`, 'controlled', 'S'),
        cp(`${i}c`, 'controlled', 'L'),
      ],
    }));
    const all = Object.fromEntries(big.flatMap((a) => a.checkpoints.map((c) => [c.id, 'no' as Answer])));
    const r = ruleRecommendations(big, answers(all));
    const short = r.recommendations.filter((x) => x.horizon === 'short');
    const long = r.recommendations.filter((x) => x.horizon === 'long');
    expect(short).toHaveLength(10);
    expect(long).toHaveLength(10);
    expect(short[0]!.checkpointIds).toEqual(['0a', '0b']);
    expect(r.truncated).toEqual({ short: 4, long: 4 });
    expect(new Set(r.recommendations.map((x) => x.key)).size).toBe(20);
  });

  it('respektiert eigene Obergrenzen', () => {
    const r = ruleRecommendations(areas, answers({ '1K1': 'no', '2K1': 'no', '1K2': 'no' }), {
      maxShort: 1,
      maxLong: 0,
    });
    expect(r.recommendations).toHaveLength(1);
    expect(r.truncated).toEqual({ short: 1, long: 1 });
  });
});
