<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { catalog } from '@ai-tpi/catalog';
import { rationaleRequired, SETTABLE_ANSWERS, type Answer } from '@ai-tpi/shared';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet, apiPut } from '../../api/client';
import type { AssessmentDetail, CommentItem, ConsolidationItem } from '../../api/assessments';
import { useLiveAssessment } from '../../composables/useLiveAssessment';
import { useNotice } from '../../composables/useNotice';
import { useAuthStore } from '../../stores/auth';
import { formatDateTime } from '../../utils/format';

/**
 * Zusammenführung (US-9.2, docs/02_analyse/03_zusammenfuehrung-und-historie.md):
 * je Kontrollpunkt die Abteilungsantworten mit Kommentaren, Systemvorschlag und konsolidierte Antwort.
 * Assessoren legen fest; Leser und Admins sehen die Ansicht nur lesend.
 */
const props = defineProps<{ id: string; area?: string }>();
const { t, locale } = useI18n();
const { notice, info, error } = useNotice('consolidation.errors');
const auth = useAuthStore();
const lang = computed(() => locale.value as 'de' | 'en');

const a = ref<AssessmentDetail | null>(null);
const items = ref<ConsolidationItem[]>([]);
const comments = ref<CommentItem[]>([]);
const loadError = ref<'not_found' | 'forbidden' | null>(null);
const onlyDisagree = ref(false);
const onlyOpen = ref(false);
const draft = reactive<Record<string, { value: Answer; rationale: string; error?: boolean }>>({});

const areaIds = computed(() => [...new Set(items.value.map((i) => i.keyAreaId))]);
const currentArea = computed(() => {
  // Optionaler Parameter kann leer ('') statt undefined sein.
  const id = (props.area || areaIds.value[0] || '').toUpperCase();
  return catalog.keyAreas.find((k) => k.id === id && areaIds.value.includes(id));
});
const cpText = (id: string) =>
  catalog.keyAreas.flatMap((k) => k.checkpoints).find((c) => c.id === id)?.text[lang.value] ?? id;
const shown = computed(() =>
  items.value.filter(
    (i) =>
      i.keyAreaId === currentArea.value?.id &&
      (!onlyDisagree.value || i.disagree) &&
      (!onlyOpen.value || !i.consolidated),
  ),
);
const doneOf = (areaId: string) => {
  const list = items.value.filter((i) => i.keyAreaId === areaId);
  return { done: list.filter((i) => i.consolidated).length, total: list.length };
};
const commentsOf = (cpId: string) => comments.value.filter((c) => c.checkpointId === cpId);
const needsRationale = (i: ConsolidationItem) =>
  rationaleRequired(
    draft[i.checkpointId]!.value,
    i.departments.map((d) => d.value),
  );

async function load() {
  const res = await apiGet<AssessmentDetail>(`/api/assessments/${props.id}`);
  if (!res.ok) {
    loadError.value = res.status === 403 ? 'forbidden' : 'not_found';
    return;
  }
  a.value = res.data;
  const c = await apiGet<{ items: ConsolidationItem[] }>(`/api/assessments/${props.id}/consolidation`);
  if (!c.ok) {
    loadError.value = c.status === 403 ? 'forbidden' : 'not_found';
    return;
  }
  const list = c.data?.items ?? [];
  // Entwürfe vor der Anzeige anlegen, damit jede Zeile ihr Eingabefeld hat.
  // Begonnene Eingaben (dirty) bleiben bei Live-Aktualisierungen erhalten.
  for (const i of list)
    if (!dirty.has(i.checkpointId))
      draft[i.checkpointId] = {
        value: i.consolidated?.value ?? i.suggestion,
        rationale: i.consolidated?.rationale ?? '',
      };
  comments.value = (await apiGet<CommentItem[]>(`/api/assessments/${props.id}/comments`)).data ?? [];
  items.value = list;
}
onMounted(load);

/** Neue Antworten, Kommentare und Festlegungen anderer erscheinen ohne Neuladen (TC-MU-001). */
const dirty = new Set<string>();
let reloadTimer: ReturnType<typeof setTimeout> | undefined;
const reloadSoon = () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => void load(), 300);
};
const { presence } = useLiveAssessment(props.id, {
  view: 'consolidation',
  keyAreaId: () => currentArea.value?.id ?? null,
  on: {
    answer: reloadSoon,
    comment: reloadSoon,
    consolidated: reloadSoon,
    assessment: (e) => (e.deleted ? (loadError.value = 'not_found') : reloadSoon()),
  },
});
const othersHere = computed(() =>
  presence.value.filter((p) => p.userId !== auth.user?.id && p.keyAreaId === currentArea.value?.id),
);

async function save(i: ConsolidationItem) {
  const d = draft[i.checkpointId]!;
  d.error = d.value !== 'open' && needsRationale(i) && !d.rationale.trim();
  if (d.error) return;
  const res = await apiPut(`/api/assessments/${props.id}/consolidation/${i.checkpointId}`, {
    value: d.value,
    rationale: d.rationale.trim(),
    version: i.consolidated?.version ?? 0,
  });
  if (!res.ok) {
    if (res.error === 'rationale_required') d.error = true;
    error(res.error);
    if (res.error === 'version_conflict') await load();
    return;
  }
  dirty.delete(i.checkpointId);
  info(t('consolidation.saved'));
  await load();
}
</script>

<template>
  <section data-testid="consolidation">
    <RouterLink :to="{ name: 'assessment', params: { id } }"
      >← {{ a?.project ?? t('common.back') }}</RouterLink
    >
    <div v-if="loadError" class="alert alert-error" role="alert" data-testid="consolidation-error">
      {{ loadError === 'forbidden' ? t('consolidation.forbidden') : t('assessment.notFound') }}
    </div>
    <template v-else-if="a">
      <h1>{{ t('consolidation.heading') }}</h1>
      <p class="hint">{{ t('consolidation.hint') }}</p>
      <NoticeBar :notice="notice" testid="consolidation-notice" />
      <nav class="area-tabs" :aria-label="t('questionnaire.areas')">
        <RouterLink
          v-for="aid in areaIds"
          :key="aid"
          :to="{ name: 'consolidation', params: { id, area: aid } }"
          :class="['chip', { active: aid === currentArea?.id }]"
          :aria-current="aid === currentArea?.id ? 'page' : undefined"
          :data-testid="`cons-area-${aid}`"
          >{{ aid }} <small>{{ doneOf(aid).done }}/{{ doneOf(aid).total }}</small></RouterLink
        >
      </nav>
      <template v-if="currentArea">
        <h2>{{ currentArea.id }} · {{ currentArea.name[lang] }}</h2>
        <p v-if="othersHere.length" class="presence" role="status" data-testid="presence-banner">
          ●
          {{
            t(othersHere.length === 1 ? 'questionnaire.presenceOne' : 'questionnaire.presenceMany', {
              name: othersHere.map((p) => p.name).join(', '),
              names: othersHere.map((p) => p.name).join(', '),
              area: currentArea.id,
            })
          }}
        </p>
        <p data-testid="cons-progress">{{ t('consolidation.progress', doneOf(currentArea.id)) }}</p>
        <div class="filters">
          <label class="check small"
            ><input v-model="onlyDisagree" type="checkbox" data-testid="filter-disagree" />
            {{ t('consolidation.filterDisagree') }}</label
          >
          <label class="check small"
            ><input v-model="onlyOpen" type="checkbox" data-testid="filter-unset" />
            {{ t('consolidation.filterOpen') }}</label
          >
        </div>
        <article
          v-for="i in shown"
          :key="i.checkpointId"
          class="item"
          :data-testid="`cons-${i.checkpointId}`"
        >
          <header class="item-head">
            <strong class="cp-id">{{ i.checkpointId }}</strong>
            <span v-if="i.disagree" class="tag tag-warn" data-testid="cons-disagree">{{
              t('consolidation.disagree')
            }}</span>
            <span v-if="i.consolidated" class="tag tag-ok" data-testid="cons-done">{{
              t('consolidation.done')
            }}</span>
          </header>
          <p>{{ cpText(i.checkpointId) }}</p>
          <p v-if="i.departments.length === 0" class="hint">{{ t('consolidation.noDepartments') }}</p>
          <table v-else class="dep-table">
            <thead>
              <tr>
                <th scope="col">{{ t('questionnaire.department') }}</th>
                <th scope="col">{{ t('consolidation.answer') }}</th>
                <th scope="col">{{ t('comments.heading') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in i.departments"
                :key="d.departmentId"
                :data-testid="`cons-dep-${d.departmentName}`"
              >
                <th scope="row">{{ d.departmentName }}</th>
                <td>
                  <span :class="['val', `val-${d.value}`]" data-testid="cons-dep-value">{{
                    t(`answers.${d.value}`)
                  }}</span>
                </td>
                <td>
                  <span
                    v-for="c in commentsOf(i.checkpointId).filter((x) => x.departmentId === d.departmentId)"
                    :key="c.id"
                    class="cmt"
                    data-testid="cons-comment"
                    >„{{ c.text }}“ ({{ c.authorName }})</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
          <div class="decide">
            <p class="sugg" data-testid="cons-suggestion">
              {{ t('consolidation.suggestion') }}: <strong>{{ t(`answers.${i.suggestion}`) }}</strong>
            </p>
            <template v-if="a.me.canConsolidate">
              <div class="field">
                <label :for="`cv-${i.checkpointId}`">{{ t('consolidation.consolidated') }}</label>
                <select
                  :id="`cv-${i.checkpointId}`"
                  v-model="draft[i.checkpointId]!.value"
                  data-testid="cons-value"
                  @change="dirty.add(i.checkpointId)"
                >
                  <option v-for="v in [...SETTABLE_ANSWERS, 'open']" :key="v" :value="v">
                    {{ t(`answers.${v}`) }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label :for="`cr-${i.checkpointId}`">{{
                  needsRationale(i) ? t('consolidation.rationaleRequired') : t('consolidation.rationale')
                }}</label>
                <textarea
                  :id="`cr-${i.checkpointId}`"
                  v-model="draft[i.checkpointId]!.rationale"
                  maxlength="2000"
                  :aria-invalid="!!draft[i.checkpointId]!.error"
                  data-testid="cons-rationale"
                  @input="dirty.add(i.checkpointId)"
                ></textarea>
                <p
                  v-if="draft[i.checkpointId]!.error"
                  class="error-text"
                  role="alert"
                  data-testid="cons-rationale-error"
                >
                  {{ t('consolidation.errors.rationale_required') }}
                </p>
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-primary-inline" data-testid="cons-save" @click="save(i)">
                  {{ t('consolidation.save') }}
                </button>
              </div>
            </template>
            <p v-else-if="i.consolidated" data-testid="cons-readonly">
              {{ t('consolidation.consolidated') }}:
              <strong>{{ t(`answers.${i.consolidated.value}`) }}</strong>
              <template v-if="i.consolidated.rationale"> – {{ i.consolidated.rationale }}</template>
            </p>
            <p v-if="i.consolidated" class="hint">
              {{ i.consolidated.consolidatedBy }} ·
              {{ formatDateTime(locale, i.consolidated.consolidatedAt) }}
            </p>
          </div>
        </article>
        <p v-if="shown.length === 0" class="empty-text">{{ t('questionnaire.empty') }}</p>
      </template>
    </template>
    <p v-else class="empty-text">{{ t('common.loading') }}</p>
  </section>
</template>

<style scoped>
.presence {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  background: #eef4fb;
  color: #1f3a5f;
}
.area-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.75rem 0;
}
.chip {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  min-height: var(--touch);
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-surface);
  text-decoration: none;
  color: var(--c-text);
}
.chip.active {
  border-color: var(--c-accent);
  font-weight: 700;
}
.chip small {
  color: var(--c-muted);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}
.check.small {
  font-weight: 400;
}
.item {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}
.item-head {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.cp-id {
  color: var(--c-accent);
}
.dep-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.dep-table th,
.dep-table td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--c-border);
  vertical-align: top;
}
.cmt {
  display: block;
  color: var(--c-muted);
  overflow-wrap: anywhere;
}
.val {
  font-weight: 700;
}
.val-yes {
  color: var(--c-ok);
}
.val-no {
  color: var(--c-error);
}
.val-partial {
  color: #8a5a00;
}
.val-na,
.val-open {
  color: var(--c-muted);
}
.decide {
  margin-top: 0.75rem;
}
.sugg {
  margin: 0 0 0.5rem;
}
@media (max-width: 599px) {
  .dep-table thead {
    display: none;
  }
  .dep-table tr {
    display: grid;
    grid-template-columns: 1fr auto;
    border-bottom: 1px solid var(--c-border);
    padding: 0.25rem 0;
  }
  .dep-table th,
  .dep-table td {
    border: 0;
  }
  .dep-table td:last-child {
    grid-column: span 2;
  }
}
</style>
