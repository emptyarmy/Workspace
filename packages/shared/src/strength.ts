/**
 * Passwortstärke inkl. Originalität (F-07): Wörterbücher DE/EN, häufige Passwörter, Tastaturmuster,
 * Wiederholungen, Sequenzen, Jahreszahlen, Leetspeak sowie Bezug zu Nutzerdaten (E-Mail, Name, Firma).
 */
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as de from '@zxcvbn-ts/language-de';
import * as en from '@zxcvbn-ts/language-en';
import {
  allRulesMet,
  DEFAULT_PASSWORD_POLICY,
  evaluatePasswordRules,
  meetsMinStrength,
  strengthLevelFromScore,
  type PasswordPolicy,
  type PasswordRuleResult,
  type StrengthLevel,
} from './password';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  // Sprachwörterbücher haben gleichnamige Listen (commonWords, firstnames, lastnames, wikipedia) –
  // daher mit Sprachpräfix zusammenführen, sonst überschreibt Englisch die deutschen Listen.
  const prefixed = (lang: string, dict: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(dict).map(([k, v]) => [`${lang}-${k}`, v]));
  zxcvbnOptions.setOptions({
    graphs: common.adjacencyGraphs,
    dictionary: {
      ...common.dictionary,
      ...prefixed('de', de.dictionary),
      ...prefixed('en', en.dictionary),
    } as typeof common.dictionary,
  });
  configured = true;
}

export interface PasswordAssessment {
  rules: PasswordRuleResult[];
  rulesMet: boolean;
  score: number;
  strength: StrengthLevel;
  /** true, wenn das Passwort gespeichert werden darf (alle Regeln + Mindeststärke). */
  acceptable: boolean;
}

/** Zerlegt Nutzerdaten in Wörter, die im Passwort nicht vorkommen sollen (E-Mail-Teile, Namen, Firma). */
export function userInputsFrom(values: Array<string | undefined | null>): string[] {
  const words = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    for (const part of v.toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (part.length >= 3) words.add(part);
  }
  return [...words];
}

export function assessPassword(
  password: string,
  userInputs: string[] = [],
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordAssessment {
  ensureConfigured();
  const rules = evaluatePasswordRules(password, policy);
  const rulesMet = allRulesMet(rules);
  const score = password.length === 0 ? 0 : zxcvbn(password, userInputs).score;
  const strength = strengthLevelFromScore(score, rulesMet);
  return { rules, rulesMet, score, strength, acceptable: rulesMet && meetsMinStrength(strength, policy) };
}

export { DEFAULT_PASSWORD_POLICY };
