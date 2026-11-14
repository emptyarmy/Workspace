/**
 * Erfassung (Phase 5): Antwortwerte, Vorschlag für die Zusammenführung, Stammdaten eines Assessments.
 * Gemeinsam für Client und Server, damit Vorschlag und Validierung überall gleich sind.
 * Siehe docs/02_analyse/03_zusammenfuehrung-und-historie.md.
 */
import { z } from 'zod';

/** Antwortwerte je Kontrollpunkt (F-05). `open` = noch nicht bewertet. */
export const ANSWER_VALUES = ['yes', 'partial', 'no', 'na', 'open'] as const;
export type Answer = (typeof ANSWER_VALUES)[number];
export const answerSchema = z.enum(ANSWER_VALUES);

/** Werte, die als Antwort gespeichert werden können (open = Antwort zurücknehmen). */
export const SETTABLE_ANSWERS = ['yes', 'partial', 'no', 'na'] as const;

export const ASSESSMENT_STATUS = ['collecting', 'consolidating', 'released'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUS)[number];

/** Vorgehensmodell: „klassisch“ blendet agile Kontrollpunkte aus (TC-ASM-008). */
export const METHOD_MODELS = ['classic', 'agile'] as const;
export type MethodModel = (typeof METHOD_MODELS)[number];

export const COMMENT_MAX = 2000;

/**
 * Systemvorschlag für die konsolidierte Antwort (R-11, „die strengere Bewertung“):
 * - offene Antworten zählen nicht; ohne Antworten bleibt der KP offen,
 * - „nicht anwendbar“ zählt nur, wenn alle Abteilungen so antworten,
 * - gleiche Antworten → diese Antwort,
 * - „Erfüllt“ und „Nicht erfüllt“ gemischt → „Teilweise“ (Beispiel aus N-03),
 * - sonst die strengere: Erfüllt + Teilweise → Teilweise, Teilweise + Nicht erfüllt → Nicht erfüllt.
 */
export function suggestConsolidated(values: Answer[]): Answer {
  const given = values.filter((v) => v !== 'open');
  if (given.length === 0) return 'open';
  const rated = given.filter((v) => v !== 'na');
  if (rated.length === 0) return 'na';
  const set = new Set(rated);
  if (set.size === 1) return rated[0]!;
  if (set.has('yes') && set.has('no')) return 'partial';
  if (set.has('no')) return 'no';
  return 'partial';
}

/** Uneinig = mindestens zwei verschiedene abgegebene Antworten (ohne „offen“). Grundlage der Konsenslücken. */
export function departmentsDisagree(values: Answer[]): boolean {
  return new Set(values.filter((v) => v !== 'open')).size > 1;
}

/** Begründung ist Pflicht, wenn vom Vorschlag abgewichen wird oder die Abteilungen uneinig sind. */
export function rationaleRequired(value: Answer, values: Answer[]): boolean {
  return value !== suggestConsolidated(values) || departmentsDisagree(values);
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date');
const optText = (max: number) => z.string().trim().max(max).optional().default('');

/** Stammdaten wie im Excel-Blatt „Information“ (FA-1.1, US-1.1). */
export const assessmentMasterSchema = z
  .object({
    project: z.string().trim().min(2).max(120),
    assessorName: z.string().trim().min(2).max(100),
    domain: optText(120),
    organizationUnit: optText(120),
    mainStakeholder: optText(120),
    contact: optText(200),
    assessmentType: optText(60),
    startDate: isoDate,
    endDate: isoDate.nullable().optional().default(null),
    interviewCount: z.number().int().min(0).max(10000).nullable().optional().default(null),
    scope: optText(2000),
    methodModel: z.enum(METHOD_MODELS).default('agile'),
    includeAi: z.boolean().default(true),
  })
  .refine((a) => !a.endDate || a.endDate >= a.startDate, { path: ['endDate'], message: 'end_before_start' });
export type AssessmentMaster = z.output<typeof assessmentMasterSchema>;

/** Gilt ein Kontrollpunkt mit diesen Tags für das gewählte Vorgehensmodell? */
export function checkpointInScope(
  cp: { tags: string[] },
  area: { isAiArea: boolean },
  opts: { methodModel: MethodModel; includeAi: boolean },
): boolean {
  if (opts.methodModel === 'classic' && cp.tags.includes('agile')) return false;
  if (!opts.includeAi && (area.isAiArea || cp.tags.includes('AI'))) return false;
  return true;
}
