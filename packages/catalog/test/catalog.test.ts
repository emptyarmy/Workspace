import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../catalog.schema.json' with { type: 'json' };
import { allCheckpoints, catalog } from '../src/index';

describe('Fragenkatalog', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('ist gültig gemäß JSON-Schema (positiv)', () => {
    expect(validate(catalog), JSON.stringify(validate.errors)).toBe(true);
  });

  it('hat 19 Kernbereiche und eindeutige IDs', () => {
    expect(catalog.keyAreas).toHaveLength(19);
    const ids = allCheckpoints().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('enthält jeden Text auf Deutsch und Englisch', () => {
    for (const cp of allCheckpoints()) {
      expect(cp.text.de.trim(), cp.id).not.toBe('');
      expect(cp.text.en.trim(), cp.id).not.toBe('');
      expect(cp.recommendation.de.trim(), cp.id).not.toBe('');
      expect(cp.recommendation.en.trim(), cp.id).not.toBe('');
    }
  });

  it('weist fehlende Übersetzung zurück (negativ)', () => {
    const broken = structuredClone(catalog);
    delete (broken.keyAreas[0]!.checkpoints[0]!.text as Partial<Record<string, string>>).en;
    expect(validate(broken)).toBe(false);
  });

  it('weist ungültige ID und Aufwandsklasse zurück (negativ)', () => {
    const broken = structuredClone(catalog);
    broken.keyAreas[0]!.checkpoints[0]!.id = 'KB1.K.1';
    (broken.keyAreas[1]!.checkpoints[0] as { effort: string }).effort = 'XL';
    expect(validate(broken)).toBe(false);
  });

  it('Sicht P/T/O ist bei allen Kontrollpunkten gesetzt; „assigned“ nur ohne Agile-Gegenstück', () => {
    for (const cp of allCheckpoints()) {
      expect(cp.view, cp.id).toBeDefined();
      expect(cp.viewSource === 'assigned', cp.id).toBe(!cp.agileRefs?.length);
    }
  });

  describe('Abhängigkeiten (dependsOn)', () => {
    const cps = allCheckpoints();
    const byId = new Map(cps.map((c) => [c.id, c]));
    const rank = { controlled: 1, efficient: 2, optimizing: 3 } as const;
    const aiArea = new Map(catalog.keyAreas.map((a) => [a.id, a.isAiArea]));
    const isAi = (c: (typeof cps)[number]) => aiArea.get(c.keyArea) || c.tags.includes('AI');

    it('sind gepflegt und verweisen nur auf bekannte KP gleicher oder niedrigerer Ebene', () => {
      expect(cps.filter((c) => c.dependsOn?.length).length).toBeGreaterThan(100);
      for (const c of cps)
        for (const d of c.dependsOn ?? []) {
          const p = byId.get(d);
          expect(p, `${c.id} → ${d}`).toBeDefined();
          expect(rank[p!.level], `${c.id} → ${d}`).toBeLessThanOrEqual(rank[c.level]);
          expect(d).not.toBe(c.id);
        }
    });

    it('fallen nicht durch den Umfang weg (agil im klassischen Modell, KI bei „KI aus“)', () => {
      for (const c of cps)
        for (const d of c.dependsOn ?? []) {
          const p = byId.get(d)!;
          if (p.tags.includes('agile')) expect(c.tags.includes('agile'), `${c.id} → ${d}`).toBe(true);
          if (isAi(p)) expect(isAi(c), `${c.id} → ${d}`).toBe(true);
        }
    });

    it('enthalten keine Zyklen', () => {
      const state = new Map<string, 1 | 2>();
      const visit = (id: string, path: string[]): void => {
        if (state.get(id) === 1) throw new Error(`Zyklus: ${[...path, id].join(' → ')}`);
        if (state.get(id) === 2) return;
        state.set(id, 1);
        for (const d of byId.get(id)?.dependsOn ?? []) visit(d, [...path, id]);
        state.set(id, 2);
      };
      expect(() => cps.forEach((c) => visit(c.id, []))).not.toThrow();
    });
  });
});
