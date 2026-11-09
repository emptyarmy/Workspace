import { describe, expect, it } from 'vitest';
import {
  allRulesMet,
  assessPassword,
  DEFAULT_PASSWORD_POLICY,
  evaluatePasswordRules,
  strengthLevelFromScore,
  userInputsFrom,
} from '../src/index';

const met = (pw: string) => Object.fromEntries(evaluatePasswordRules(pw).map((r) => [r.id, r.met]));

describe('Passwortregeln (TC-PWD-001 … 014)', () => {
  it.each([
    ['', { minLength: false, digit: false, uppercase: false, special: false }],
    ['abc', { minLength: false, digit: false, uppercase: false, special: false }],
    ['abcdef', { minLength: true, digit: false, uppercase: false, special: false }],
    ['abcde1', { minLength: true, digit: true, uppercase: false, special: false }],
    ['Abcde1', { minLength: true, digit: true, uppercase: true, special: false }],
    ['Ab1!', { minLength: false, digit: true, uppercase: true, special: true }],
    ['ABCDEF!', { minLength: true, digit: false, uppercase: true, special: true }],
    ['abcdef1!', { minLength: true, digit: true, uppercase: false, special: true }],
    ['Passw0rt!', { minLength: true, digit: true, uppercase: true, special: true }],
    ['Äpfel9§Birne', { minLength: true, digit: true, uppercase: true, special: true }],
  ])('„%s“ → Teilerfüllung korrekt', (pw, expected) => {
    expect(met(pw)).toEqual(expected);
  });

  it('Leerzeichen zählt nicht als Sonderzeichen (negativ)', () => {
    expect(met('Abcdef 1').special).toBe(false);
  });

  it('Mindestlänge ist konfigurierbar (TC-PWD-028)', () => {
    const policy = { ...DEFAULT_PASSWORD_POLICY, minLength: 10 };
    expect(allRulesMet(evaluatePasswordRules('Abcdef1!', policy))).toBe(false);
    expect(allRulesMet(evaluatePasswordRules('Abcdefgh1!', policy))).toBe(true);
  });
});

describe('Passwortstärke', () => {
  it('ist „schwach“, solange Regeln fehlen – unabhängig vom Score', () => {
    expect(strengthLevelFromScore(4, false)).toBe('weak');
  });

  it('bildet Scores auf drei Stufen ab', () => {
    expect(strengthLevelFromScore(1, true)).toBe('weak');
    expect(strengthLevelFromScore(2, true)).toBe('weak');
    expect(strengthLevelFromScore(3, true)).toBe('medium');
    expect(strengthLevelFromScore(4, true)).toBe('strong');
  });

  it('bewertet bekannte Muster trotz erfüllter Regeln als schwach (TC-PWD-009/010)', () => {
    for (const pw of ['Passw0rt!', 'Qwertz1!', 'Password1!', 'Hallo123!', 'Sommer2026!', 'Schmetterling7!']) {
      const a = assessPassword(pw);
      expect(a.rulesMet, pw).toBe(true);
      expect(a.strength, pw).toBe('weak');
      expect(a.acceptable, pw).toBe(false);
    }
  });

  it('erkennt Bezug zu Nutzerdaten (TC-PWD-011)', () => {
    const inputs = userInputsFrom(['max.mustermann@brunata.com', 'Max Mustermann']);
    const withUser = assessPassword('Mustermann2026!', inputs);
    const without = assessPassword('Mustermann2026!');
    expect(without.acceptable).toBe(true); // für andere Nutzer originell genug
    expect(withUser.score).toBeLessThan(without.score);
    expect(withUser.strength).toBe('weak');
    expect(withUser.acceptable).toBe(false);
  });

  it('stuft „Kaffee7Mond!“ als mittel ein und akzeptiert es (Mindeststärke mittel)', () => {
    const a = assessPassword('Kaffee7Mond!');
    expect(a.strength).toBe('medium');
    expect(a.acceptable).toBe(true);
  });

  it('akzeptiert originelle Passwörter (TC-PWD-012/013/014)', () => {
    expect(assessPassword('Tisch7&Laterne').strength).toBe('strong');
    expect(assessPassword('Äpfel9§Birne').acceptable).toBe(true);
    const strong = assessPassword('vK8#qLz2!mWr9$Tb');
    expect(strong.strength).toBe('strong');
    expect(strong.acceptable).toBe(true);
  });
});
