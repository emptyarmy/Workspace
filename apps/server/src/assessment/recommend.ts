/**
 * Handlungsempfehlungen erzeugen (Phase 7): Regel-Engine, optional KI-Stufe mit Fallback.
 * Konzept: docs/04_architektur/05_ki-empfehlungen.md.
 */
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { catalog, type Checkpoint, type KeyArea, type Lang } from '@ai-tpi/catalog';
import { ruleRecommendations, type RuleRecommendation } from '@ai-tpi/shared';
import type { Db } from '../db/client';
import { aiModules, comments, recommendations, users } from '../db/schema';
import { industryAreaMedians } from '../routes/report';
import { scopeOf, type AssessmentRow } from './access';
import { AiError, callLlm, parseAiResponse, type AiFailure, type LlmMessages } from './llm';
import { consolidatedMap } from './scoring';

export type AiModuleRow = typeof aiModules.$inferSelect;
export type RecommendationRow = typeof recommendations.$inferSelect;
type NewRec = typeof recommendations.$inferInsert;

const LABELS = {
  de: {
    firstStep: 'Erster Schritt: ',
    full: 'Vollständige Umsetzung: ',
    bundle: (area: string, n: number, level: string) => `${area}: ${n} Kontrollpunkte der Ebene „${level}“`,
  },
  en: {
    firstStep: 'First step: ',
    full: 'Full implementation: ',
    bundle: (area: string, n: number, level: string) => `${area}: ${n} checkpoints of level “${level}”`,
  },
} as const;

const levelName = (id: string, lang: Lang) => catalog.levels.find((l) => l.id === id)?.name[lang] ?? id;

/** Erster Satz bzw. gekürzter Text als Titel. */
function shortTitle(text: string, max = 140): string {
  const first = /^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text;
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

interface ScopeIndex {
  areas: Map<string, KeyArea & { checkpoints: Checkpoint[] }>;
  cps: Map<string, Checkpoint>;
}
function indexScope(a: AssessmentRow): ScopeIndex {
  const areas = new Map<string, KeyArea & { checkpoints: Checkpoint[] }>();
  const cps = new Map<string, Checkpoint>();
  for (const area of scopeOf(a)) {
    areas.set(area.id, area);
    for (const cp of area.checkpoints) cps.set(cp.id, cp);
  }
  return { areas, cps };
}

/** Titel und Text einer regelbasierten Empfehlung aus den Textbausteinen des Katalogs. */
export function formatRule(r: RuleRecommendation, idx: ScopeIndex, lang: Lang) {
  const L = LABELS[lang];
  const prefix = r.part === 'first_step' ? L.firstStep : r.part === 'full' ? L.full : '';
  const recs = r.checkpointIds.map((id) => ({ id, text: idx.cps.get(id)?.recommendation[lang] ?? id }));
  const areaName = idx.areas.get(r.keyAreaId)?.name[lang] ?? r.keyAreaId;
  const title =
    prefix +
    (recs.length === 1
      ? shortTitle(recs[0]!.text)
      : L.bundle(areaName, recs.length, levelName(r.level, lang)));
  const text = recs.length === 1 ? recs[0]!.text : recs.map((x) => `• ${x.id}: ${x.text}`).join('\n');
  return { title, text };
}

export interface RecContext {
  assessment: AssessmentRow;
  lang: Lang;
}

/** Regel-Ergebnis für ein Assessment (Kandidaten, Bündel, Benchmark-Abstände). */
export async function computeRules(db: Db, a: AssessmentRow) {
  const [answers, medians] = await Promise.all([
    consolidatedMap(db, a.id),
    industryAreaMedians(db, a.companyId, a.catalogVersion),
  ]);
  const scope = scopeOf(a);
  const result = ruleRecommendations(scope, answers, { benchmarkMedian: medians });
  return { result, answers, medians, idx: indexScope(a) };
}

/** Kommentare pseudonymisieren: Namen und E-Mail-Adressen von Personen der Firma ersetzen. */
export function pseudonymizeText(text: string, names: string[]): string {
  let t = text.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[E-Mail]');
  const parts = new Set<string>();
  for (const n of names) {
    if (n.trim().length >= 3) parts.add(n.trim());
    for (const p of n.split(/\s+/)) if (p.length >= 3) parts.add(p);
  }
  for (const p of [...parts].sort((x, y) => y.length - x.length))
    t = t.replace(new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'giu'), '[Person]');
  return t;
}

const SYSTEM_PROMPT: Record<Lang, string> = {
  de: `Du bist Berater für Testprozessverbesserung nach TPI NEXT und Agile TPI.
Formuliere aus den übergebenen Kandidaten konkrete, umsetzbare Handlungsempfehlungen auf Deutsch.
Bündele verwandte Kontrollpunkte, nenne den nächsten Schritt, den erwarteten Nutzen, eine Messgröße und die verantwortliche Rolle.
Behalte den Zeithorizont der Regel-Engine bei (short = kurzfristig < 1 Monat, long = langfristig ≥ 1 Monat), außer es gibt einen klaren Grund.
Verwende ausschließlich die übergebenen checkpointIds.`,
  en: `You are a consultant for test process improvement based on TPI NEXT and Agile TPI.
Turn the given candidates into concrete, actionable recommendations in English.
Bundle related checkpoints and state the next step, the expected benefit, a metric and the responsible role.
Keep the horizon proposed by the rule engine (short = < 1 month, long = ≥ 1 month) unless there is a clear reason.
Use only the given checkpointIds.`,
};
const OUTPUT_SPEC = `Antwortformat / response format: ausschließlich JSON, kein Fließtext / JSON only:
{"recommendations":[{"horizon":"short|long","checkpointIds":["KB01.K.01"],"title":"…","text":"…","nextStep":"…","benefit":"…","metric":"…","ownerRole":"…"}]}
Max. 10 Einträge je Horizont / max. 10 items per horizon.`;

/**
 * Daten, die an das KI-Modul gesendet würden. Dieselbe Funktion liefert die Datenschutz-Vorschau,
 * damit die Vorschau genau dem tatsächlichen Versand entspricht.
 */
export async function buildAiMessages(
  db: Db,
  a: AssessmentRow,
  module: Pick<AiModuleRow, 'sendComments' | 'pseudonymize' | 'promptTemplate'>,
  lang: Lang,
  rules: Awaited<ReturnType<typeof computeRules>>,
): Promise<{ messages: LlmMessages; checkpointIds: string[] }> {
  const { result, idx, medians } = rules;
  const ids = [...new Set(result.recommendations.flatMap((r) => r.checkpointIds))];
  const idSet = new Set(ids);
  const candidates = result.candidates
    .filter((c) => idSet.has(c.checkpointId))
    .map((c) => {
      const cp = idx.cps.get(c.checkpointId)!;
      return {
        checkpointId: c.checkpointId,
        keyAreaId: c.keyAreaId,
        text: cp.text[lang],
        level: c.level,
        effort: c.effort,
        answer: c.value,
        horizon: c.horizon,
        part: c.part,
        ruleRecommendation: cp.recommendation[lang],
      };
    });
  const areaIds = [...new Set(candidates.map((c) => c.keyAreaId))];
  const areaStats = new Map(result.recommendations.map((r) => [r.keyAreaId, r]));
  let commentList: { checkpointId: string; text: string }[] | undefined;
  if (module.sendComments && ids.length) {
    const rows = await db
      .select({ checkpointId: comments.checkpointId, text: comments.text })
      .from(comments)
      .where(and(eq(comments.assessmentId, a.id), inArray(comments.checkpointId, ids)));
    let names: string[] = [];
    if (module.pseudonymize)
      names = (await db.select({ n: users.name }).from(users).where(eq(users.companyId, a.companyId))).map(
        (r) => r.n,
      );
    commentList = rows.map((r) => ({
      checkpointId: r.checkpointId,
      text: module.pseudonymize ? pseudonymizeText(r.text, names) : r.text,
    }));
  }
  const context = {
    language: lang,
    project: {
      domain: a.domain || null,
      methodModel: a.methodModel,
      includeAi: a.includeAi,
    },
    keyAreas: areaIds.map((id) => ({
      id,
      name: idx.areas.get(id)?.name[lang] ?? id,
      fulfillment: areaStats.get(id)?.fulfillment ?? null,
      industryMedian: medians?.[id] ?? null,
    })),
    candidates,
    ...(commentList ? { comments: commentList } : {}),
  };
  const system = `${module.promptTemplate?.trim() || SYSTEM_PROMPT[lang]}\n\n${OUTPUT_SPEC}`;
  return { messages: { system, user: JSON.stringify(context, null, 2) }, checkpointIds: ids };
}

export type GenerateNotice = 'nothing_to_do' | `ai_${AiFailure}`;

export interface GenerateResult {
  origin: 'rule' | 'ai';
  notice: GenerateNotice | null;
  /** Detail bei verworfener KI-Antwort: invalid_json | schema | unknown_checkpoint | empty | body_not_json. */
  noticeDetail?: string;
  status?: number;
  created: number;
  openCount: number;
}

/**
 * Erzeugt Empfehlungen und ersetzt alle noch nicht bearbeiteten Vorschläge (Status „vorgeschlagen“).
 * Bereits angenommene, begonnene, erledigte oder abgelehnte Empfehlungen bleiben erhalten;
 * neue Vorschläge, deren Kontrollpunkte dort schon abgedeckt sind, entfallen.
 */
export async function generateRecommendations(
  db: Db,
  a: AssessmentRow,
  opts: {
    lang: Lang;
    userId: string;
    module: AiModuleRow | null;
    apiKey: string | null;
  },
): Promise<GenerateResult> {
  const rules = await computeRules(db, a);
  const { result, idx } = rules;
  const base = {
    aiModuleId: opts.module?.id ?? null,
    aiModuleName: opts.module?.name ?? null,
    aiProvider: opts.module && opts.module.mode !== 'rules' ? opts.module.provider : null,
    aiModel: opts.module && opts.module.mode !== 'rules' ? opts.module.model : null,
    assessmentId: a.id,
    lang: opts.lang,
    createdByUserId: opts.userId,
  };
  const gapOf = (kb: string) => result.recommendations.find((r) => r.keyAreaId === kb)?.benchmarkGap ?? null;

  const ruleRows = (): NewRec[] =>
    result.recommendations.map((r) => {
      const { title, text } = formatRule(r, idx, opts.lang);
      return {
        ...base,
        keyAreaId: r.keyAreaId,
        checkpointIds: r.checkpointIds,
        horizon: r.horizon,
        part: r.part,
        effort: r.effort,
        priority: r.priority,
        title,
        text,
        ruleText: text,
        origin: 'rule' as const,
        benchmarkGap: r.benchmarkGap,
      };
    });

  let rows: NewRec[] = [];
  let origin: 'rule' | 'ai' = 'rule';
  let notice: GenerateNotice | null = null;
  let noticeDetail: string | undefined;
  let status: number | undefined;

  if (result.recommendations.length === 0) notice = 'nothing_to_do';
  else if (opts.module && opts.module.mode !== 'rules') {
    try {
      const { messages, checkpointIds } = await buildAiMessages(db, a, opts.module, opts.lang, rules);
      const text = await callLlm(opts.module, opts.apiKey, messages);
      const ai = parseAiResponse(text, new Set(checkpointIds));
      const effortRank = { S: 0, M: 1, L: 2 } as const;
      const counter = { short: 0, long: 0 };
      const ruleText = (ids: string[]) =>
        ids.map((id) => `• ${id}: ${idx.cps.get(id)?.recommendation[opts.lang] ?? id}`).join('\n');
      for (const r of ai) {
        if (counter[r.horizon] >= 10) continue;
        counter[r.horizon] += 1;
        const cps = r.checkpointIds.map((id) => idx.cps.get(id)!);
        let effort: Checkpoint['effort'] = 'S';
        for (const c of cps) if (effortRank[c.effort] > effortRank[effort]) effort = c.effort;
        rows.push({
          ...base,
          keyAreaId: cps[0]!.keyArea,
          checkpointIds: [...new Set(r.checkpointIds)],
          horizon: r.horizon,
          part: 'whole',
          effort,
          priority: counter[r.horizon],
          title: r.title,
          text: r.text,
          ruleText: ruleText(r.checkpointIds),
          nextStep: r.nextStep ?? null,
          benefit: r.benefit ?? null,
          metric: r.metric ?? null,
          ownerRole: r.ownerRole ?? null,
          origin: 'ai',
          benchmarkGap: gapOf(cps[0]!.keyArea),
        });
      }
      origin = 'ai';
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      notice = `ai_${err.code}`;
      noticeDetail = err.code === 'invalid_response' ? err.message : undefined;
      status = err.status;
      rows = ruleRows();
    }
  } else rows = ruleRows();

  // Bereits bearbeitete Empfehlungen behalten; deren Kontrollpunkte nicht erneut vorschlagen.
  const kept = await db
    .select({ horizon: recommendations.horizon, checkpointIds: recommendations.checkpointIds })
    .from(recommendations)
    .where(and(eq(recommendations.assessmentId, a.id), ne(recommendations.status, 'proposed')));
  const covered = { short: new Set<string>(), long: new Set<string>() };
  for (const k of kept) for (const id of k.checkpointIds) covered[k.horizon].add(id);
  rows = rows.filter((r) => !r.checkpointIds.every((id) => covered[r.horizon].has(id)));

  await db.transaction(async (tx) => {
    await tx
      .delete(recommendations)
      .where(and(eq(recommendations.assessmentId, a.id), eq(recommendations.status, 'proposed')));
    if (rows.length) await tx.insert(recommendations).values(rows);
  });
  return {
    origin,
    notice,
    ...(noticeDetail ? { noticeDetail } : {}),
    ...(status ? { status } : {}),
    created: rows.length,
    openCount: result.openCount,
  };
}

/** Empfehlungen eines Assessments mit Namen der Verantwortlichen. */
export async function listRecommendations(db: Db, assessmentId: string) {
  return db
    .select({
      rec: recommendations,
      ownerName: users.name,
    })
    .from(recommendations)
    .leftJoin(users, eq(users.id, recommendations.ownerUserId))
    .where(eq(recommendations.assessmentId, assessmentId))
    .orderBy(
      recommendations.horizon,
      sql`case when ${recommendations.status} = 'rejected' then 1 else 0 end`,
      recommendations.priority,
      recommendations.createdAt,
    )
    .then((rows) => rows.map((r) => ({ ...r.rec, ownerName: r.ownerName })));
}
