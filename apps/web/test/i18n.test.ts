import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('Übersetzungen (TC-I18N-005)', () => {
  it('jeder deutsche Schlüssel existiert auf Englisch und umgekehrt', () => {
    const d = keys(de);
    const e = keys(en);
    expect(
      d.filter((k) => !e.includes(k)),
      'fehlt in en.json',
    ).toEqual([]);
    expect(
      e.filter((k) => !d.includes(k)),
      'fehlt in de.json',
    ).toEqual([]);
  });
  it('keine leeren Texte', () => {
    for (const [lang, obj] of [
      ['de', de],
      ['en', en],
    ] as const) {
      const flat = keys(obj).map((k) => [
        k,
        k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], obj),
      ]);
      for (const [k, v] of flat) expect(String(v).trim(), `${lang}:${k}`).not.toBe('');
    }
  });
  it('Platzhalter stimmen in beiden Sprachen überein', () => {
    const get = (obj: Record<string, unknown>, k: string) =>
      String(k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], obj));
    for (const k of keys(de)) {
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(ph(get(en, k)), k).toEqual(ph(get(de, k)));
    }
  });
});
