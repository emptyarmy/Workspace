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
});
