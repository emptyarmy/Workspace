<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { catalog } from '@ai-tpi/catalog';
import RadarChart from './charts/RadarChart.vue';
import { apiGet } from '../api/client';

/**
 * Benchmark (08_mandanten-und-benchmark.md, 3.2): eigene Firma gegen Branche und alle Firmen.
 * Nur Median und Quartile ab der Mindestanzahl; die Werte stehen zusätzlich als Tabelle (TC-BM-006).
 */
interface Q {
  q1: number;
  median: number;
  q3: number;
}
interface Group {
  n: number;
  enough: boolean;
  overall: Q | null;
  ai: Q | null;
  areas: (Q & { keyAreaId: string; n: number })[];
  position: { keyAreaId: string; quartile: number; delta: number }[];
  overallQuartile: number | null;
}
interface Benchmark {
  optedOut: boolean;
  minCompanies: number;
  industry: { code: string; nameDe: string; nameEn: string } | null;
  own: {
    assessmentId: string;
    project: string;
    released: boolean;
    scores: {
      overall: { index: number | null };
      ai: { fulfillment: number | null };
      areas: { keyAreaId: string; fulfillment: number | null }[];
    };
  } | null;
  groups: { industry: Group; all: Group };
}

const props = defineProps<{ assessmentId?: string }>();
const { t, locale } = useI18n();
const data = ref<Benchmark | null>(null);
const failed = ref(false);

onMounted(async () => {
  const res = await apiGet<Benchmark>(
    props.assessmentId ? `/api/benchmark?assessmentId=${props.assessmentId}` : '/api/benchmark',
  );
  if (!res.ok || !res.data) failed.value = true;
  else data.value = res.data;
});

const lang = computed(() => locale.value as 'de' | 'en');
const industryName = computed(() =>
  data.value?.industry ? (lang.value === 'de' ? data.value.industry.nameDe : data.value.industry.nameEn) : '',
);
/** Kernbereiche, für die es eigene Werte oder Vergleichswerte gibt. */
const areaIds = computed(() => {
  const d = data.value;
  if (!d) return [];
  const ids = new Set<string>([
    ...(d.own?.scores.areas.filter((a) => a.fulfillment !== null).map((a) => a.keyAreaId) ?? []),
    ...d.groups.industry.areas.map((a) => a.keyAreaId),
    ...d.groups.all.areas.map((a) => a.keyAreaId),
  ]);
  return catalog.keyAreas.map((k) => k.id).filter((id) => ids.has(id));
});
const ownOf = (id: string) =>
  data.value?.own?.scores.areas.find((a) => a.keyAreaId === id)?.fulfillment ?? null;
const statOf = (g: Group, id: string) => g.areas.find((a) => a.keyAreaId === id) ?? null;
const posOf = (g: Group, id: string) => g.position.find((a) => a.keyAreaId === id) ?? null;
const series = computed(() => {
  const d = data.value!;
  const s: { name: string; values: (number | null)[]; color: string; dashed?: boolean }[] = [];
  if (d.own) s.push({ name: t('benchmark.own'), values: areaIds.value.map(ownOf), color: '#1d5fa8' });
  if (d.groups.industry.enough)
    s.push({
      name: `${t('benchmark.industry')} (${t('benchmark.median')})`,
      values: areaIds.value.map((id) => statOf(d.groups.industry, id)?.median ?? null),
      color: '#c27a00',
      dashed: true,
    });
  if (d.groups.all.enough)
    s.push({
      name: `${t('benchmark.all')} (${t('benchmark.median')})`,
      values: areaIds.value.map((id) => statOf(d.groups.all, id)?.median ?? null),
      color: '#6b7584',
      dashed: true,
    });
  return s;
});
const fmt = (v: number | null | undefined) => (v == null ? '–' : `${v.toLocaleString(locale.value)} %`);
const arrow = (d: number) => (d > 0 ? '▲' : d < 0 ? '▼' : '＝');
const num = (v: number) => v.toLocaleString(locale.value);
</script>

<template>
  <div class="benchmark" data-testid="benchmark">
    <p v-if="failed" class="alert alert-error" role="alert">{{ t('common.error') }}</p>
    <p v-else-if="!data" class="empty-text">{{ t('common.loading') }}</p>
    <p v-else-if="data.optedOut" class="alert alert-info" data-testid="benchmark-opted-out">
      {{ t('benchmark.optedOut') }}
    </p>
    <template v-else>
      <p class="hint">{{ t('benchmark.hint', { min: data.minCompanies }) }}</p>
      <p v-if="!data.own" class="alert alert-info" data-testid="benchmark-no-own">
        {{ t('benchmark.noOwn') }}
      </p>
      <p v-else class="hint" data-testid="benchmark-basis">
        {{ t('benchmark.basis', { project: data.own.project }) }}
        <template v-if="!data.own.released"> {{ t('benchmark.draft') }}</template>
      </p>

      <div class="groups">
        <div
          v-for="key in ['industry', 'all'] as const"
          :key="key"
          class="card-flat group"
          :data-testid="`benchmark-group-${key}`"
        >
          <h3>
            {{
              key === 'industry' ? `${t('benchmark.industry')}: ${industryName || '–'}` : t('benchmark.all')
            }}
          </h3>
          <p v-if="!data.groups[key].enough" class="hint" data-testid="benchmark-too-few">
            {{ t('benchmark.tooFew', { n: data.groups[key].n, min: data.minCompanies }) }}
          </p>
          <template v-else>
            <p class="hint" data-testid="benchmark-sample">
              {{ t('benchmark.sample', { n: data.groups[key].n }) }}
            </p>
            <p v-if="data.groups[key].overallQuartile" data-testid="benchmark-rank">
              <strong>{{
                t(`benchmark.rank.${data.groups[key].overallQuartile}`, {
                  group: key === 'industry' ? industryName : t('benchmark.all'),
                })
              }}</strong>
            </p>
            <p>
              {{ t('report.overallIndex') }}: {{ t('benchmark.median') }}
              {{ fmt(data.groups[key].overall?.median) }} ({{ t('benchmark.iqr') }}
              {{ fmt(data.groups[key].overall?.q1) }} – {{ fmt(data.groups[key].overall?.q3) }})
            </p>
          </template>
        </div>
      </div>

      <template v-if="areaIds.length && series.length">
        <RadarChart
          :axes="areaIds"
          :series="series"
          :label="t('benchmark.radarLabel')"
          data-testid="benchmark-radar"
        />
        <div class="table-wrap" tabindex="0" role="region" :aria-label="t('benchmark.heading')">
          <table class="bm-table" data-testid="benchmark-table">
            <caption class="visually-hidden">
              {{
                t('benchmark.heading')
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('report.area') }}</th>
                <th scope="col">{{ t('benchmark.own') }}</th>
                <th scope="col">
                  {{ t('benchmark.industry') }} {{ t('benchmark.median') }} ({{ t('benchmark.iqr') }})
                </th>
                <th scope="col">{{ t('benchmark.delta') }}</th>
                <th scope="col">{{ t('benchmark.quartile') }}</th>
                <th scope="col">{{ t('benchmark.all') }} {{ t('benchmark.median') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="id in areaIds" :key="id" :data-testid="`benchmark-row-${id}`">
                <th scope="row">{{ id }}</th>
                <td>{{ fmt(ownOf(id)) }}</td>
                <td>
                  <template v-if="statOf(data.groups.industry, id)">
                    {{ fmt(statOf(data.groups.industry, id)!.median) }}
                    <span class="muted"
                      >({{ num(statOf(data.groups.industry, id)!.q1) }}–{{
                        num(statOf(data.groups.industry, id)!.q3)
                      }})</span
                    >
                  </template>
                  <template v-else>–</template>
                </td>
                <td>
                  <template v-if="posOf(data.groups.industry, id)">
                    <span :class="posOf(data.groups.industry, id)!.delta >= 0 ? 'up' : 'down'"
                      >{{ arrow(posOf(data.groups.industry, id)!.delta) }}
                      {{ num(posOf(data.groups.industry, id)!.delta) }}</span
                    >
                  </template>
                  <template v-else>–</template>
                </td>
                <td>{{ posOf(data.groups.industry, id)?.quartile ?? '–' }}</td>
                <td>{{ fmt(statOf(data.groups.all, id)?.median) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p data-testid="benchmark-ai">
          {{ t('benchmark.aiCompare') }}: {{ t('benchmark.own') }}
          {{ fmt(data.own?.scores.ai.fulfillment) }} · {{ t('benchmark.industry') }}
          {{ fmt(data.groups.industry.ai?.median) }} · {{ t('benchmark.all') }}
          {{ fmt(data.groups.all.ai?.median) }}
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.groups {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 768px) {
  .groups {
    grid-template-columns: 1fr 1fr;
  }
}
.group h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}
.table-wrap {
  overflow-x: auto;
}
.bm-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;
}
.bm-table th,
.bm-table td {
  border-bottom: 1px solid var(--c-border);
  padding: 0.3rem 0.5rem;
  text-align: left;
  white-space: nowrap;
}
.muted {
  color: var(--c-muted);
}
.up {
  color: var(--c-ok);
}
.down {
  color: var(--c-error);
}
</style>
