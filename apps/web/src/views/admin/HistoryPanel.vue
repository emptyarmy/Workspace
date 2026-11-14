<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { catalog } from '@ai-tpi/catalog';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet } from '../../api/client';
import type { AssessmentSummary } from '../../api/assessments';
import { useNotice } from '../../composables/useNotice';
import { formatDateTime } from '../../utils/format';

/**
 * Änderungshistorie (N-03, US-9.3) für alle Rollen, nur eigene Firma; append-only.
 * Filter nach Assessment, Kernbereich, Kontrollpunkt, Person, Abteilung und Zeitraum; CSV-Export.
 */
interface HistoryItem {
  id: string;
  createdAt: string;
  assessmentId: string | null;
  assessmentName: string | null;
  keyAreaId: string | null;
  checkpointId: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  rationale: string | null;
  userName: string;
  userRole: string;
  departmentName: string | null;
}

const PAGE = 50;
const ANSWER_ACTIONS = new Set(['answer.changed', 'consolidated.changed']);
const { t, te, locale } = useI18n();
const route = useRoute();
const { notice, error, clear } = useNotice('admin.audit.errors');
const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '');
const filter = reactive({
  assessmentId: q('assessmentId'),
  keyAreaId: q('keyAreaId'),
  checkpointId: q('checkpointId'),
  userId: '',
  departmentId: '',
  from: '',
  to: '',
});
const items = ref<HistoryItem[]>([]);
const total = ref(0);
const assessments = ref<AssessmentSummary[]>([]);
const facets = ref<{ users: { id: string; name: string }[]; departments: { id: string; name: string }[] }>({
  users: [],
  departments: [],
});

const query = (extra: Record<string, string | number> = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v.trim()) p.set(k, v.trim());
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
};
const csvHref = computed(() => `/api/history.csv?${query()}`);

async function load(append = false) {
  clear();
  if (filter.from && filter.to && filter.from > filter.to) return error('range');
  const res = await apiGet<{ total: number; items: HistoryItem[] }>(
    `/api/history?${query({ limit: PAGE, offset: append ? items.value.length : 0 })}`,
  );
  if (!res.ok || !res.data) return error(res.error);
  items.value = append ? [...items.value, ...res.data.items] : res.data.items;
  total.value = res.data.total;
}
onMounted(async () => {
  const [as, f] = await Promise.all([
    apiGet<AssessmentSummary[]>('/api/assessments'),
    apiGet<typeof facets.value>('/api/history/facets'),
  ]);
  assessments.value = as.data ?? [];
  if (f.data) facets.value = f.data;
  await load();
});
function reset() {
  Object.assign(filter, {
    assessmentId: '',
    keyAreaId: '',
    checkpointId: '',
    userId: '',
    departmentId: '',
    from: '',
    to: '',
  });
  void load();
}

const actionLabel = (a: string) => {
  const key = `history.actions.${a.replace(/\./g, '_')}`;
  return te(key) ? t(key) : a;
};
/** Antwortwerte übersetzen, alles andere unverändert anzeigen. */
const valueLabel = (item: HistoryItem, v: string | null) =>
  v == null
    ? t('common.none')
    : ANSWER_ACTIONS.has(item.action) && te(`answers.${v}`)
      ? t(`answers.${v}`)
      : v;
</script>

<template>
  <div data-testid="history-panel">
    <p class="hint">{{ t('history.hint') }}</p>
    <NoticeBar :notice="notice" />
    <form class="card-flat" novalidate data-testid="history-filter" @submit.prevent="load()">
      <div class="form-grid">
        <div class="field">
          <label for="h-asm">{{ t('history.assessment') }}</label>
          <select id="h-asm" v-model="filter.assessmentId" data-testid="history-assessment">
            <option value="">{{ t('history.allAssessments') }}</option>
            <option v-for="a in assessments" :key="a.id" :value="a.id">{{ a.project }}</option>
          </select>
        </div>
        <div class="field">
          <label for="h-kb">{{ t('history.keyArea') }}</label>
          <select id="h-kb" v-model="filter.keyAreaId" data-testid="history-keyarea">
            <option value="">–</option>
            <option v-for="k in catalog.keyAreas" :key="k.id" :value="k.id">{{ k.id }}</option>
          </select>
        </div>
        <div class="field">
          <label for="h-cp">{{ t('history.checkpoint') }}</label>
          <input
            id="h-cp"
            v-model="filter.checkpointId"
            type="text"
            maxlength="20"
            placeholder="KB01.K.01"
            data-testid="history-checkpoint"
          />
        </div>
        <div class="field">
          <label for="h-user">{{ t('history.user') }}</label>
          <select id="h-user" v-model="filter.userId" data-testid="history-user">
            <option value="">{{ t('history.allUsers') }}</option>
            <option v-for="u in facets.users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="h-dep">{{ t('history.department') }}</label>
          <select id="h-dep" v-model="filter.departmentId" data-testid="history-department">
            <option value="">{{ t('history.allDepartments') }}</option>
            <option v-for="d in facets.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="h-from">{{ t('history.from') }}</label>
          <input id="h-from" v-model="filter.from" type="date" data-testid="history-from" />
        </div>
        <div class="field">
          <label for="h-to">{{ t('history.to') }}</label>
          <input id="h-to" v-model="filter.to" type="date" data-testid="history-to" />
        </div>
      </div>
      <div class="button-row">
        <button type="submit" class="btn btn-primary-inline" data-testid="history-apply">
          {{ t('history.apply') }}
        </button>
        <button type="button" class="btn btn-ghost" @click="reset">{{ t('history.reset') }}</button>
        <a :href="csvHref" class="btn btn-ghost linkbtn" download data-testid="history-export">{{
          t('history.export')
        }}</a>
      </div>
    </form>
    <p data-testid="history-total">{{ t('history.total', { n: total }) }}</p>
    <p v-if="items.length === 0" class="empty-text" data-testid="history-empty">{{ t('history.empty') }}</p>
    <ul v-else class="row-list" data-testid="history-list">
      <li v-for="h in items" :key="h.id" class="row-item" data-testid="history-row">
        <div class="row-main">
          <strong data-testid="history-action">{{ actionLabel(h.action) }}</strong>
          <span class="row-sub">
            {{ formatDateTime(locale, h.createdAt) }} ·
            <span data-testid="history-user-name">{{ h.userName }}</span> ({{ t(`roles.${h.userRole}`)
            }}<template v-if="h.departmentName">, {{ h.departmentName }}</template
            >)
          </span>
          <span class="row-sub">
            {{ h.assessmentName }}<template v-if="h.checkpointId"> · {{ h.checkpointId }}</template
            ><template v-else-if="h.keyAreaId"> · {{ h.keyAreaId }}</template>
          </span>
          <span v-if="h.oldValue != null || h.newValue != null" class="change" data-testid="history-change">
            {{ t('history.oldNew', { old: valueLabel(h, h.oldValue), new: valueLabel(h, h.newValue) }) }}
          </span>
          <span v-if="h.rationale" class="row-sub" data-testid="history-rationale">„{{ h.rationale }}“</span>
        </div>
      </li>
    </ul>
    <button
      v-if="items.length < total"
      type="button"
      class="btn btn-ghost"
      data-testid="history-more"
      @click="load(true)"
    >
      {{ t('history.more') }}
    </button>
  </div>
</template>

<style scoped>
.linkbtn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.change {
  overflow-wrap: anywhere;
}
</style>
