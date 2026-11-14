<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { catalog, type Checkpoint } from '@ai-tpi/catalog';
import { LEVELS, levelRank, VIEWS, type AchievedLevel, type Answer, type Scores } from '@ai-tpi/shared';
import BenchmarkPanel from '../../components/BenchmarkPanel.vue';
import RadarChart from '../../components/charts/RadarChart.vue';
import StackedBars from '../../components/charts/StackedBars.vue';
import { apiGet } from '../../api/client';
import { formatDate } from '../../utils/format';

/**
 * Bericht (04_auswertung-und-bericht.md): Deckblatt, Summary, Kennzahlen, Reifegradmatrix, Netz- und Balkendiagramm,
 * Ebenen-Treppe, KI-Reifegrad, Benchmark, Konsenslücken, Anhang. Druckansicht über das Druck-Stylesheet (TC-REP-006).
 */
interface Report {
  assessment: {
    id: string;
    project: string;
    assessorName: string;
    startDate: string;
    endDate: string | null;
    status: 'collecting' | 'consolidating' | 'released';
    catalogVersion: string;
    methodModel: 'classic' | 'agile';
    includeAi: boolean;
  };
  company: {
    name: string;
    logoUrl: string | null;
    logoAlt: string | null;
    industryCode: string | null;
    industryDe: string | null;
    industryEn: string | null;
  } | null;
  departments: string[];
  scores: Scores;
  answers: { checkpointId: string; value: Answer; rationale: string | null }[];
  comments: {
    checkpointId: string;
    text: string;
    createdAt: string;
    authorName: string;
    departmentName: string | null;
    sourceName: string | null;
  }[];
  consensusGaps:
    | {
        keyAreaId: string;
        checkpointId: string;
        departments: { department: string; value: Answer }[];
        consolidated: Answer;
      }[]
    | null;
}

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const lang = computed(() => locale.value as 'de' | 'en');
const r = ref<Report | null>(null);
const loadError = ref<'not_found' | 'forbidden' | null>(null);
const selected = ref<Checkpoint | null>(null);
const logoBroken = ref(false);
/** Maßnahmenplan: angenommene, begonnene und erledigte Empfehlungen (Phase 7). */
interface PlanItem {
  id: string;
  horizon: 'short' | 'long';
  title: string;
  checkpointIds: string[];
  status: string;
  ownerName: string | null;
  dueDate: string | null;
}
const plan = ref<PlanItem[]>([]);

onMounted(async () => {
  const [res, recs] = await Promise.all([
    apiGet<Report>(`/api/assessments/${props.id}/report`),
    apiGet<{ items: PlanItem[] }>(`/api/assessments/${props.id}/recommendations`),
  ]);
  if (!res.ok || !res.data) loadError.value = res.status === 403 ? 'forbidden' : 'not_found';
  else r.value = res.data;
  plan.value = (recs.data?.items ?? []).filter((x) => ['accepted', 'in_progress', 'done'].includes(x.status));
});

const areaName = (id: string) => catalog.keyAreas.find((k) => k.id === id)?.name[lang.value] ?? id;
const scoredAreas = computed(() =>
  (r.value?.scores.areas ?? []).map((a) => ({
    ...a,
    area: catalog.keyAreas.find((k) => k.id === a.keyAreaId)!,
  })),
);
const answerOf = (cpId: string): Answer =>
  r.value?.answers.find((a) => a.checkpointId === cpId)?.value ?? 'open';
const rationaleOf = (cpId: string) =>
  r.value?.answers.find((a) => a.checkpointId === cpId)?.rationale ?? null;
const commentsOf = (cpId: string) => r.value?.comments.filter((c) => c.checkpointId === cpId) ?? [];
/** Kontrollpunkte im Umfang des Assessments (gleiche Regeln wie im Fragebogen). */
const inScope = (cp: Checkpoint, isAi: boolean) =>
  !!r.value &&
  !(r.value.assessment.methodModel === 'classic' && cp.tags.includes('agile')) &&
  !(!r.value.assessment.includeAi && (isAi || cp.tags.includes('AI')));
const cpsOf = (areaId: string, level: (typeof LEVELS)[number]) => {
  const area = catalog.keyAreas.find((k) => k.id === areaId)!;
  return area.checkpoints.filter((cp) => cp.level === level && inScope(cp, area.isAiArea));
};
const allCps = computed(() =>
  scoredAreas.value.flatMap((a) => a.area.checkpoints.filter((cp) => inScope(cp, a.area.isAiArea))),
);
const symbol: Record<Answer, string> = { yes: '✔', partial: '◐', no: '✖', na: '–', open: '' };
const levelName = (l: AchievedLevel | null) => (l ? t(`levels.${l}`) : '–');
const pct = (v: number | null | undefined) =>
  v == null ? t('report.na') : `${v.toLocaleString(locale.value)} %`;

const ranked = computed(() =>
  scoredAreas.value.filter((a) => a.fulfillment !== null).sort((a, b) => b.fulfillment! - a.fulfillment!),
);
const strengths = computed(() => ranked.value.slice(0, 3));
const weaknesses = computed(() => [...ranked.value].reverse().slice(0, 3));
const radarAreas = computed(() => scoredAreas.value.filter((a) => a.fulfillment !== null));
const aiAreas = computed(() => radarAreas.value.filter((a) => a.isAiArea));
const barRows = computed(() => {
  const s = r.value!.scores;
  return [
    { label: t('report.total'), ...s.overall },
    ...LEVELS.map((l) => ({ label: t(`levels.${l}`), ...s.byLevel[l] })),
    ...VIEWS.map((v) => ({ label: t(`report.views.${v}`), ...s.byView[v] })).filter((x) => x.total > 0),
  ];
});
const today = computed(() => formatDate(locale.value, new Date().toISOString().slice(0, 10)));
const print = () => window.print();
</script>

<template>
  <section class="report" data-testid="report">
    <RouterLink :to="{ name: 'assessment', params: { id } }" class="no-print"
      >← {{ r?.assessment.project ?? t('common.back') }}</RouterLink
    >
    <div v-if="loadError" class="alert alert-error" role="alert" data-testid="report-error">
      {{ loadError === 'forbidden' ? t('assessment.forbidden') : t('assessment.notFound') }}
    </div>
    <template v-else-if="r">
      <div class="head no-print">
        <h1>{{ t('report.heading') }}</h1>
        <button type="button" class="btn btn-primary-inline" data-testid="report-print" @click="print">
          {{ t('report.print') }}
        </button>
      </div>

      <!-- 1. Deckblatt -->
      <header class="cover sheet" data-testid="report-cover">
        <img
          v-if="r.company?.logoUrl && !logoBroken"
          :src="r.company.logoUrl"
          :alt="r.company.logoAlt || r.company.name"
          class="logo"
          @error="logoBroken = true"
        />
        <h2 class="cover-title">{{ r.assessment.project }}</h2>
        <dl class="facts">
          <dt>{{ t('report.cover.company') }}</dt>
          <dd data-testid="cover-company">{{ r.company?.name }}</dd>
          <dt>{{ t('report.cover.industry') }}</dt>
          <dd>{{ (lang === 'de' ? r.company?.industryDe : r.company?.industryEn) || '–' }}</dd>
          <dt>{{ t('report.cover.assessor') }}</dt>
          <dd>{{ r.assessment.assessorName }}</dd>
          <dt>{{ t('report.cover.departments') }}</dt>
          <dd>{{ r.departments.join(', ') || '–' }}</dd>
          <dt>{{ t('report.cover.period') }}</dt>
          <dd>
            {{ formatDate(locale, r.assessment.startDate) }}
            <template v-if="r.assessment.endDate"> – {{ formatDate(locale, r.assessment.endDate) }}</template>
          </dd>
          <dt>{{ t('report.cover.status') }}</dt>
          <dd data-testid="cover-status">{{ t(`assessment.status.${r.assessment.status}`) }}</dd>
          <dt>{{ t('report.cover.method') }}</dt>
          <dd>{{ t(`assessment.method.${r.assessment.methodModel}`) }}</dd>
          <dt>{{ t('report.cover.catalog') }}</dt>
          <dd>{{ r.assessment.catalogVersion }}</dd>
        </dl>
        <p class="hint">{{ t('report.cover.generated', { date: today }) }}</p>
        <p
          v-if="r.assessment.status !== 'released'"
          class="alert alert-info"
          data-testid="report-preliminary"
        >
          {{ t('report.notReleased') }}
        </p>
      </header>

      <p v-if="!r.scores.hasData" class="alert alert-info" data-testid="report-no-data">
        {{ t('report.noData') }}
      </p>
      <template v-else>
        <!-- 2./3. Summary und Kennzahlen -->
        <section class="sheet" data-testid="report-summary">
          <h2>{{ t('report.summary') }}</h2>
          <div class="tiles">
            <div class="tile" data-testid="tile-index">
              <span class="tv">{{ pct(r.scores.overall.index) }}</span>
              <span class="tl">{{ t('report.overallIndex') }}</span>
            </div>
            <div class="tile" data-testid="tile-ai">
              <span class="tv">{{ pct(r.scores.ai.fulfillment) }}</span>
              <span class="tl">{{ t('report.aiIndex') }}</span>
            </div>
            <div class="tile" data-testid="tile-min-level">
              <span class="tv">{{ levelName(r.scores.overall.minLevel) }}</span>
              <span class="tl">{{ t('report.minLevel') }}</span>
            </div>
            <div class="tile" data-testid="tile-median-level">
              <span class="tv">{{ levelName(r.scores.overall.medianLevel) }}</span>
              <span class="tl">{{ t('report.medianLevel') }}</span>
            </div>
            <div class="tile" data-testid="tile-progress">
              <span class="tv">{{ pct(r.scores.overall.progress) }}</span>
              <span class="tl">{{ t('report.progress') }}</span>
            </div>
            <div
              v-for="v in ['yes', 'partial', 'no', 'na'] as const"
              :key="v"
              class="tile"
              :data-testid="`tile-${v}`"
            >
              <span class="tv">{{ r.scores.overall[v] }}</span>
              <span class="tl">{{ t(`answers.${v}`) }}</span>
            </div>
          </div>
          <div class="sw">
            <div>
              <h3>{{ t('report.strengths') }}</h3>
              <ol data-testid="report-strengths">
                <li v-for="a in strengths" :key="a.keyAreaId">
                  {{ a.keyAreaId }} {{ a.area.name[lang] }} – {{ pct(a.fulfillment) }}
                </li>
              </ol>
            </div>
            <div>
              <h3>{{ t('report.weaknesses') }}</h3>
              <ol data-testid="report-weaknesses">
                <li v-for="a in weaknesses" :key="a.keyAreaId">
                  {{ a.keyAreaId }} {{ a.area.name[lang] }} – {{ pct(a.fulfillment) }}
                </li>
              </ol>
            </div>
          </div>
        </section>

        <!-- 4. Reifegradmatrix -->
        <section class="sheet landscape" data-testid="report-matrix">
          <h2>{{ t('report.matrix') }}</h2>
          <p class="hint no-print">{{ t('report.matrixHint') }}</p>
          <div class="matrix" role="table" :aria-label="t('report.matrix')">
            <div class="mrow mhead" role="row">
              <!-- Auf dem Smartphone Kurzformen (K/E/O), damit sich die Spaltenköpfe nicht überlappen. -->
              <span role="columnheader"
                ><span class="long">{{ t('report.area') }}</span
                ><span class="short">KB</span></span
              >
              <span v-for="l in LEVELS" :key="l" role="columnheader" :title="t(`levels.${l}`)"
                ><span class="long">{{ t(`levels.${l}`) }}</span
                ><span class="short">{{ t(`levels.${l}`).charAt(0) }}</span></span
              >
              <span role="columnheader"
                ><span class="long">{{ t('report.level') }}</span
                ><span class="short">{{ t('report.levelShort') }}</span></span
              >
            </div>
            <div
              v-for="a in scoredAreas"
              :key="a.keyAreaId"
              class="mrow"
              role="row"
              :data-testid="`matrix-${a.keyAreaId}`"
            >
              <span role="rowheader" class="marea"
                ><strong>{{ a.keyAreaId }}</strong> <span class="mname">{{ a.area.name[lang] }}</span></span
              >
              <span v-for="l in LEVELS" :key="l" role="cell" class="mcell">
                <button
                  v-for="cp in cpsOf(a.keyAreaId, l)"
                  :key="cp.id"
                  type="button"
                  :class="['cell', `c-${answerOf(cp.id)}`]"
                  :aria-label="`${cp.id}: ${t(`answers.${answerOf(cp.id)}`)}`"
                  :title="`${cp.id}: ${t(`answers.${answerOf(cp.id)}`)}`"
                  :data-testid="`cell-${cp.id}`"
                  @click="selected = cp"
                >
                  {{ symbol[answerOf(cp.id)] }}
                </button>
              </span>
              <span role="cell" class="mlevel" :data-testid="`level-${a.keyAreaId}`">{{
                levelName(a.level)
              }}</span>
            </div>
          </div>
        </section>

        <!-- 5./6./7. Diagramme -->
        <section class="sheet" data-testid="report-charts">
          <h2>{{ t('report.radar') }}</h2>
          <div class="charts">
            <RadarChart
              :axes="radarAreas.map((a) => a.keyAreaId)"
              :series="[
                {
                  name: t('report.fulfillment'),
                  values: radarAreas.map((a) => a.fulfillment),
                  color: '#1d5fa8',
                },
              ]"
              :label="t('report.radarLabel')"
              data-testid="report-radar"
            />
            <details class="tbl">
              <summary>{{ t('report.table') }}</summary>
              <table>
                <tbody>
                  <tr v-for="a in scoredAreas" :key="a.keyAreaId">
                    <th scope="row">{{ a.keyAreaId }} {{ a.area.name[lang] }}</th>
                    <td>{{ pct(a.fulfillment) }}</td>
                    <td>{{ levelName(a.level) }}</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </div>
          <h2>{{ t('report.bars') }}</h2>
          <StackedBars :rows="barRows" :label="t('report.barsLabel')" data-testid="report-bars" />
          <h2>{{ t('report.stairs') }}</h2>
          <ul class="stairs" data-testid="report-stairs">
            <li v-for="a in scoredAreas" :key="a.keyAreaId">
              <span class="sname">{{ a.keyAreaId }}</span>
              <span class="steps" :aria-label="`${a.keyAreaId}: ${levelName(a.level)}`" role="img">
                <span
                  v-for="n in 3"
                  :key="n"
                  :class="['step', { on: (levelRank(a.level) ?? 0) >= n, na: a.level === 'na' }]"
                ></span>
              </span>
              <span class="slevel">{{ levelName(a.level) }}</span>
            </li>
          </ul>
        </section>

        <!-- 8. KI-Reifegrad -->
        <section class="sheet" data-testid="report-ai">
          <h2>{{ t('report.ai') }}</h2>
          <p v-if="r.scores.ai.total === 0" class="hint">{{ t('report.aiNone') }}</p>
          <template v-else>
            <p>
              <strong>{{ t('report.aiIndex') }}: {{ pct(r.scores.ai.fulfillment) }}</strong>
            </p>
            <RadarChart
              v-if="aiAreas.length >= 3"
              :axes="aiAreas.map((a) => a.keyAreaId)"
              :series="[
                { name: t('report.aiIndex'), values: aiAreas.map((a) => a.fulfillment), color: '#6a3fb5' },
              ]"
              :label="t('report.aiRadarLabel')"
              :size="300"
            />
            <ul v-else>
              <li v-for="a in aiAreas" :key="a.keyAreaId">
                {{ a.keyAreaId }} {{ a.area.name[lang] }}: {{ pct(a.fulfillment) }}
              </li>
            </ul>
          </template>
        </section>
      </template>

      <!-- 8a. Benchmark -->
      <section class="sheet" data-testid="report-benchmark">
        <h2>{{ t('benchmark.heading') }}</h2>
        <BenchmarkPanel :assessment-id="id" />
      </section>

      <!-- 8b. Konsenslücken -->
      <section v-if="r.consensusGaps" class="sheet" data-testid="report-gaps">
        <h2>{{ t('report.gaps') }}</h2>
        <p class="hint">{{ t('report.gapsHint') }}</p>
        <p v-if="r.consensusGaps.length === 0" data-testid="gaps-none">{{ t('report.gapsNone') }}</p>
        <table v-else class="list-table">
          <thead>
            <tr>
              <th scope="col">{{ t('report.checkpoint') }}</th>
              <th scope="col">{{ t('questionnaire.department') }}</th>
              <th scope="col">{{ t('consolidation.consolidated') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in r.consensusGaps" :key="g.checkpointId" :data-testid="`gap-${g.checkpointId}`">
              <th scope="row">{{ g.checkpointId }}</th>
              <td>
                <span v-for="d in g.departments" :key="d.department" class="gapdep"
                  >{{ d.department }}: <strong>{{ t(`answers.${d.value}`) }}</strong></span
                >
              </td>
              <td>{{ t(`answers.${g.consolidated}`) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 9. Maßnahmenplan -->
      <section class="sheet" data-testid="report-plan">
        <h2>{{ t('report.plan') }}</h2>
        <p v-if="plan.length === 0" data-testid="plan-empty">{{ t('report.planEmpty') }}</p>
        <div v-else class="table-wrap" tabindex="0" role="region" :aria-label="t('report.plan')">
          <table class="list-table">
            <thead>
              <tr>
                <th scope="col">{{ t('recommendations.fields.title') }}</th>
                <th scope="col">{{ t('report.checkpoint') }}</th>
                <th scope="col">{{ t('recommendations.fields.status') }}</th>
                <th scope="col">{{ t('recommendations.fields.owner') }}</th>
                <th scope="col">{{ t('recommendations.fields.due') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in plan" :key="p.id" data-testid="plan-row">
                <th scope="row">
                  <span class="tag">{{ t(`recommendations.horizon.${p.horizon}`) }}</span> {{ p.title }}
                </th>
                <td>{{ p.checkpointIds.join(', ') }}</td>
                <td>{{ t(`recommendations.status.${p.status}`) }}</td>
                <td>{{ p.ownerName ?? '–' }}</td>
                <td>{{ p.dueDate ? formatDate(locale, p.dueDate) : '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <RouterLink
          :to="{ name: 'recommendations', params: { id } }"
          class="no-print"
          data-testid="plan-link"
          >{{ t('report.planOpen') }}</RouterLink
        >
      </section>

      <!-- 10. Anhang -->
      <section class="sheet" data-testid="report-appendix">
        <h2>{{ t('report.appendix') }}</h2>
        <p class="hint">{{ t('report.method') }}</p>
        <table class="list-table appendix">
          <thead>
            <tr>
              <th scope="col">{{ t('report.checkpoint') }}</th>
              <th scope="col">{{ t('report.answer') }}</th>
              <th scope="col">{{ t('report.comments') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cp in allCps" :key="cp.id" :data-testid="`appendix-${cp.id}`">
              <th scope="row">
                <span class="cpid">{{ cp.id }}</span> {{ cp.text[lang] }}
              </th>
              <td>
                <span :class="['badge', `c-${answerOf(cp.id)}`]">{{ symbol[answerOf(cp.id)] }}</span>
                {{ t(`answers.${answerOf(cp.id)}`) }}
                <span v-if="rationaleOf(cp.id)" class="muted"> – {{ rationaleOf(cp.id) }}</span>
              </td>
              <td>
                <span v-for="(c, i) in commentsOf(cp.id)" :key="i" class="cmt" data-testid="appendix-comment"
                  >„{{ c.text }}“ ({{ c.authorName
                  }}<template v-if="c.sourceName">, {{ c.sourceName }}</template
                  >)</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Detail zu einer Matrixzelle (TC-REP-003) -->
      <div v-if="selected" class="overlay no-print" @click.self="selected = null">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="selected.id"
          data-testid="cell-detail"
          @keydown.esc="selected = null"
        >
          <h3>{{ selected.id }} · {{ areaName(selected.keyArea) }}</h3>
          <p>{{ selected.text[lang] }}</p>
          <p>
            <span :class="['badge', `c-${answerOf(selected.id)}`]">{{ symbol[answerOf(selected.id)] }}</span>
            <strong data-testid="cell-detail-answer">{{ t(`answers.${answerOf(selected.id)}`) }}</strong>
          </p>
          <p v-if="rationaleOf(selected.id)">
            <em>{{ t('report.rationale') }}:</em> {{ rationaleOf(selected.id) }}
          </p>
          <h4>{{ t('report.comments') }}</h4>
          <p v-if="!commentsOf(selected.id).length" class="hint">{{ t('comments.none') }}</p>
          <ul v-else>
            <li v-for="(c, i) in commentsOf(selected.id)" :key="i" data-testid="cell-detail-comment">
              {{ c.text }}
              <span class="muted"
                >– {{ c.authorName }}<template v-if="c.departmentName">, {{ c.departmentName }}</template
                ><template v-if="c.sourceName">, {{ c.sourceName }}</template></span
              >
            </li>
          </ul>
          <button
            type="button"
            class="btn btn-primary-inline"
            data-testid="cell-detail-close"
            @click="selected = null"
          >
            {{ t('report.close') }}
          </button>
        </div>
      </div>
    </template>
    <p v-else class="empty-text">{{ t('common.loading') }}</p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
}
.sheet {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}
.sheet h2 {
  margin-top: 0;
  font-size: 1.2rem;
}
.cover-title {
  font-size: 1.6rem;
  margin: 0.25rem 0 0.75rem;
}
.logo {
  max-height: 64px;
  max-width: 240px;
}
.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}
.facts dt {
  color: var(--c-muted);
}
.facts dd {
  margin: 0;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
}
.tile {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
}
.tv {
  font-size: 1.35rem;
  font-weight: 700;
}
.tl {
  font-size: 0.85rem;
  color: var(--c-muted);
}
.sw {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}
@media (min-width: 768px) {
  .sw {
    grid-template-columns: 1fr 1fr;
  }
}
.sw h3 {
  font-size: 1rem;
  margin: 0 0 0.25rem;
}
.table-wrap {
  overflow-x: auto;
}
.matrix {
  display: grid;
  gap: 2px;
  overflow-x: auto;
}
.mrow {
  display: grid;
  grid-template-columns: minmax(7rem, 16rem) repeat(3, minmax(0, 1fr)) minmax(5.5rem, auto);
  gap: 4px;
  align-items: center;
  border-bottom: 1px solid var(--c-border);
  padding: 2px 0;
}
.mhead {
  font-weight: 700;
  font-size: 0.85rem;
}
.marea {
  font-size: 0.9rem;
}
.mcell {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.mlevel {
  font-size: 0.85rem;
  font-weight: 600;
}
.short {
  display: none;
}
@media (max-width: 599px) {
  /* Kompakte Matrix auf dem Smartphone (TC-REP-007): Name ausblenden, Kurzformen in den Spaltenköpfen. */
  .mname,
  .long {
    display: none;
  }
  .short {
    display: inline;
  }
  .mrow {
    grid-template-columns: 3.2rem repeat(3, minmax(0, 1fr)) 4.2rem;
  }
}
.cell {
  width: 1.9rem;
  height: 1.9rem;
  min-width: 1.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
}
@media (pointer: coarse) {
  .cell {
    width: 2.2rem;
    height: 2.2rem;
  }
}
.c-yes {
  background: #1e7a3c;
  color: #fff;
}
.c-partial {
  background: #f2c037;
  color: #1b1f24;
}
.c-no {
  background: #b3261e;
  color: #fff;
}
.c-na {
  background: repeating-linear-gradient(45deg, #8a94a3, #8a94a3 4px, #6b7584 4px, #6b7584 8px);
  color: #fff;
}
.c-open {
  background: #fff;
  border: 1px dashed #6b7584;
  color: #1b1f24;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  border-radius: 4px;
  margin-right: 0.3rem;
  font-size: 0.8rem;
}
.charts {
  display: grid;
  gap: 1rem;
  align-items: start;
}
@media (min-width: 900px) {
  .charts {
    grid-template-columns: minmax(0, 460px) 1fr;
  }
}
.tbl table {
  border-collapse: collapse;
  font-size: 0.9rem;
}
.tbl th,
.tbl td {
  text-align: left;
  padding: 0.2rem 0.5rem;
  border-bottom: 1px solid var(--c-border);
}
.stairs {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.25rem;
}
.stairs li {
  display: grid;
  grid-template-columns: 3.5rem auto 1fr;
  gap: 0.5rem;
  align-items: center;
}
.steps {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
}
.step {
  width: 1.4rem;
  background: var(--c-border);
  border-radius: 2px;
}
.step:nth-child(1) {
  height: 0.6rem;
}
.step:nth-child(2) {
  height: 1rem;
}
.step:nth-child(3) {
  height: 1.4rem;
}
.step.on {
  background: #1d5fa8;
}
.slevel {
  font-size: 0.9rem;
}
.list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.list-table th,
.list-table td {
  text-align: left;
  vertical-align: top;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--c-border);
}
.list-table th[scope='row'] {
  font-weight: 400;
}
.cpid {
  font-weight: 700;
  color: var(--c-accent);
  white-space: nowrap;
}
.gapdep,
.cmt {
  display: block;
  overflow-wrap: anywhere;
}
.muted {
  color: var(--c-muted);
}
@media (max-width: 599px) {
  .appendix thead {
    display: none;
  }
  .appendix tr {
    display: grid;
    border-bottom: 1px solid var(--c-border);
  }
  .appendix th,
  .appendix td {
    border: 0;
  }
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 40%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}
.dialog {
  background: var(--c-surface);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  max-width: 560px;
  width: 100%;
  max-height: 85dvh;
  overflow-y: auto;
}
.dialog h3 {
  margin-top: 0;
}
@media print {
  .no-print {
    display: none !important;
  }
  .sheet {
    border: 0;
    padding: 0;
    break-inside: avoid-page;
    break-after: page;
  }
  .appendix tr {
    break-inside: avoid;
  }
  .cell {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<style>
/* Druck: A4, Kopfzeile und Navigation der Anwendung ausblenden (TC-REP-006). */
@media print {
  @page {
    size: A4 landscape;
    margin: 12mm;
  }
  body {
    background: #fff;
  }
  .topbar,
  .skip-link {
    display: none !important;
  }
}
</style>
