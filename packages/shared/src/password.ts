/**
 * Passwortrichtlinie (F-07, N-09) – wird identisch im Browser und auf dem Server verwendet.
 * Standard: mind. 6 Zeichen, 1 Zahl, 1 Großbuchstabe, 1 Sonderzeichen. Werte sind je Installation konfigurierbar.
 */

export type PasswordRuleId = 'minLength' | 'digit' | 'uppercase' | 'special';

export interface PasswordPolicy {
  minLength: number;
  requireDigit: boolean;
  requireUppercase: boolean;
  requireSpecial: boolean;
  /** Mindeststärke, ab der ein Passwort akzeptiert wird (N-09: Vorschlag „mittel“). */
  minStrength: StrengthLevel;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  requireDigit: true,
  requireUppercase: true,
  requireSpecial: true,
  minStrength: 'medium',
};

export interface PasswordRuleResult {
  id: PasswordRuleId;
  met: boolean;
  /** Parameter für den Anzeigetext, z. B. { min: 6 } */
  params?: Record<string, number>;
}

/** Prüft alle aktiven Regeln. Die Reihenfolge entspricht der Anzeige unter dem Passwortfeld. */
export function evaluatePasswordRules(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordRuleResult[] {
  const results: PasswordRuleResult[] = [
    { id: 'minLength', met: [...password].length >= policy.minLength, params: { min: policy.minLength } },
  ];
  if (policy.requireDigit) results.push({ id: 'digit', met: /\p{Nd}/u.test(password) });
  if (policy.requireUppercase) results.push({ id: 'uppercase', met: /\p{Lu}/u.test(password) });
  // Sonderzeichen = alles, was weder Buchstabe, Ziffer noch Leerraum ist (z. B. ! § & # @).
  if (policy.requireSpecial) results.push({ id: 'special', met: /[^\p{L}\p{N}\s]/u.test(password) });
  return results;
}

export function allRulesMet(results: PasswordRuleResult[]): boolean {
  return results.every((r) => r.met);
}

export type StrengthLevel = 'weak' | 'medium' | 'strong';

export const STRENGTH_ORDER: Record<StrengthLevel, number> = { weak: 0, medium: 1, strong: 2 };

/**
 * Bildet zxcvbn-Score (0–4) und Regelerfüllung auf die drei Anzeigestufen ab.
 * Score 0–2 (< 10^8 Rateversuche, z. B. „Qwertz1!“, „Mustermann2026!“) = schwach,
 * Score 3 = mittel, Score 4 = stark. Solange nicht alle Regeln erfüllt sind, ist die Stärke immer „schwach“.
 */
export function strengthLevelFromScore(score: number, rulesMet: boolean): StrengthLevel {
  if (!rulesMet || score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

export function meetsMinStrength(
  level: StrengthLevel,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): boolean {
  return STRENGTH_ORDER[level] >= STRENGTH_ORDER[policy.minStrength];
}
