<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { catalog, type Checkpoint, type CheckpointLevel } from '@ai-tpi/catalog';
import { checkpointInScope, SETTABLE_ANSWERS, type Answer } from '@ai-tpi/shared';
import CommentThread from '../../components/CommentThread.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet, apiPost, apiPut } from '../../api/client';
import type { AssessmentDetail, CommentItem, DepartmentAnswer } from '../../api/assessments';
import { useLiveAssessment } from '../../composables/useLiveAssessment';
import { useNotice } from '../../composables/useNotice';
import { useAuthStore } from '../../stores/auth';

/**
 * Fragebogen (EP-2, FA-2): Kontrollpunkte je Kernbereich, Antworten der eigenen Abteilung,
 * Speichern je Klick mit Versionsprüfung (TC-MU-002), Fortschritt, Filter, Kommentare.
 * Andere Rollen sehen die Antworten einer gewählten Abteilung nur lesend.
 */
const props = defineProps<{ id: string; area?: string }>();
const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { notice, info, error } = useNotice('assessment.errors');
const lang = computed(() => locale.value as 'de' | 'en');

const a = ref<AssessmentDetail | null>(null);
const loadError = ref<'not_found' | 'forbidden' | null>(null);
const answers = reactive<Record<string, { value: Answer; version: number; updatedBy: string | null }>>({});
const state = reactive<Record<string, 'saving' | 'saved' | 'error' | undefined>>({});
const conflicts = reactive<
  Record<string, { wanted: Answer; value: Answer; version: number; name: string } | undefined>
>({});
const comments = ref<CommentItem[]>([]);
const openComments = reactive<Record<string, boolean>>({});
const onlyOpen = ref(false);
const typeFilter = ref<'all' | 'classic' | 'agile' | 'ai'>('all');
const onlyMine = ref(true);
const viewDepartment = ref<string>('');
const confirmSubmit = ref(false);

const isRespondent = computed(() => auth.user?.role === 'respondent');
const myDepartment = computed(() => a.value?.me.departmentId ?? null);
/** Abteilung, deren Antworten angezeigt werden. */
const department = computed(() => (isRespondent.value ? myDepartment.value : viewDepartment.value || null));

const scopedAreas = computed(() => {
  if (!a.value) return [];
  const opts = { methodModel: a.value.methodModel, includeAi: a.value.includeAi };
  return catalog.keyAreas
    .map((area) => ({
      ...area,
      checkpoints: area.checkpoints.filter((cp) => checkpointInScope(cp, area, opts)),
    }))
    .filter((area) => area.checkpoints.length);
});
const assigned = (areaId: string, dep: string | null) =>
  !!dep && !!a.value?.assignments.some((x) => x.keyAreaId === areaId && x.departmentId === dep);
const visibleAreas = computed(() =>
  isRespondent.value && onlyMine.value && scopedAreas.value.some((x) => assigned(x.id, myDepartment.value))
    ? scopedAreas.value.filter((x) => assigned(x.id, myDepartment.value))
    : scopedAreas.value,
);
const currentArea = computed(() => {
  const id = (props.area ?? '').toUpperCase();
  if (!id) return visibleAreas.value[0] ?? scopedAreas.value[0];
  return scopedAreas.value.find((x) => x.id === id);
});
const areaIndex = computed(() => visibleAreas.value.findIndex((x) => x.id === currentArea.value?.id));
const submitted = computed(
  () => !!myDepartment.value && !!a.value?.submissions.some((s) => s.departmentId === myDepartment.value),
);
/** Bearbeiten nur für die eigene Abteilung (Befragte; Assessoren mit Abteilung, wenn sie diese anzeigen). */
const ownView = computed(() => !!myDepartment.value && department.value === myDepartment.value);
const editable = computed(
  () =>
    !!a.value?.me.canAnswer &&
    ownView.value &&
    !submitted.value &&
    !!currentArea.value &&
    assigned(currentArea.value.id, myDepartment.value),
);
const departmentsForView = computed(() => {
  const ids = new Set(a.value?.assignments.map((x) => x.departmentId));
  return a.value?.departments.filter((d) => ids.has(d.id)) ?? [];
});

const valueOf = (cpId: string): Answer => answers[cpId]?.value ?? 'open';
const matchesType = (cp: Checkpoint, isAiArea: boolean) =>
  typeFilter.value === 'all' ||
  (typeFilter.value === 'agile' && cp.tags.includes('agile')) ||
  (typeFilter.value === 'ai' && (isAiArea || cp.tags.includes('AI'))) ||
  (typeFilter.value === 'classic' && !cp.tags.includes('agile') && !cp.tags.includes('AI') && !isAiArea);
const shown = computed(() => {
  const area = currentArea.value;
  if (!area) return [];
  return area.checkpoints.filter(
    (cp) => matchesType(cp, area.isAiArea) && (!onlyOpen.value || valueOf(cp.id) === 'open'),
  );
});
const byLevel = computed(() => {
  const groups: { level: CheckpointLevel; items: Checkpoint[] }[] = [];
  for (const cp of shown.value) {
    const g = groups.find((x) => x.level === cp.level);
    if (g) g.items.push(cp);
    else groups.push({ level: cp.level, items: [cp] });
  }
  return groups;
});
const progressOf = (areaId: string) => {
  const area = scopedAreas.value.find((x) => x.id === areaId);
  if (!area) return { done: 0, total: 0 };
  return {
    done: area.checkpoints.filter((cp) => valueOf(cp.id) !== 'open').length,
    total: area.checkpoints.length,
  };
};
const progress = computed(() =>
  currentArea.value ? progressOf(currentArea.value.id) : { done: 0, total: 0 },
);
const commentsOf = (cpId: string) => comments.value.filter((c) => c.checkpointId === cpId);

async function loadAnswers() {
  for (const k of Object.keys(answers)) delete answers[k];
  if (!department.value) return;
  const res = await apiGet<DepartmentAnswer[]>(
    `/api/assessments/${props.id}/answers?departmentId=${department.value}`,
  );
  for (const k of Object.keys(confirmed)) delete confirmed[k];
  for (const r of res.data ?? []) {
    answers[r.checkpointId] = { value: r.value, version: r.version, updatedBy: r.updatedBy };
    confirmed[r.checkpointId] = { value: r.value, version: r.version };
  }
}
async function loadComments() {
  comments.value = (await apiGet<CommentItem[]>(`/api/assessments/${props.id}/comments`)).data ?? [];
}
async function load() {
  const res = await apiGet<AssessmentDetail>(`/api/assessments/${props.id}`);
  if (!res.ok) {
    loadError.value = res.status === 403 ? 'forbidden' : 'not_found';
    return;
  }
  a.value = res.data;
  if (!isRespondent.value && !viewDepartment.value)
    viewDepartment.value =
      departmentsForView.value.find((d) => d.id === myDepartment.value)?.id ??
      departmentsForView.value[0]?.id ??
      '';
  await Promise.all([loadAnswers(), loadComments()]);
}
onMounted(load);
watch(viewDepartment, loadAnswers);

/** Änderungen anderer erscheinen ohne Neuladen (TC-MU-001); wer gerade wo arbeitet, zeigt die Präsenz (TC-MU-003). */
const { presence } = useLiveAssessment(props.id, {
  view: 'questionnaire',
  keyAreaId: () => currentArea.value?.id ?? null,
  on: {
    answer: (e) => {
      if (e.departmentId !== department.value || pending[e.checkpointId]) return;
      // Eigene Änderungen kommen nicht zurück (Herkunft je Fenster); fremde kommen in Serverreihenfolge an.
      const c = confirmed[e.checkpointId];
      if (c && c.version === e.version && c.value === e.value) return;
      confirmed[e.checkpointId] = { value: e.value as Answer, version: e.version };
      answers[e.checkpointId] = { value: e.value as Answer, version: e.version, updatedBy: e.updatedBy };
      state[e.checkpointId] = undefined;
    },
    comment: () => void loadComments(),
    submission: () => void load(),
    assessment: (e) => (e.deleted ? (loadError.value = 'not_found') : void load()),
  },
});
const others = computed(() => presence.value.filter((p) => p.userId !== auth.user?.id && p.keyAreaId));
const othersIn = (areaId: string) => others.value.filter((p) => p.keyAreaId === areaId);
const presenceText = computed(() => {
  const list = currentArea.value ? othersIn(currentArea.value.id) : [];
  if (!list.length) return '';
  const names = list.map((p) => p.name).join(', ');
  return t(list.length === 1 ? 'questionnaire.presenceOne' : 'questionnaire.presenceMany', {
    name: names,
    names,
    area: currentArea.value!.id,
  });
});

function go(areaId: string) {
  void router.push({ name: 'questionnaire', params: { id: props.id, area: areaId } });
}
function step(delta: number) {
  // Liegt der aktuelle Kernbereich außerhalb der gefilterten Liste, über alle Kernbereiche blättern.
  const list = areaIndex.value < 0 ? scopedAreas.value : visibleAreas.value;
  const found = list.findIndex((x) => x.id === currentArea.value?.id);
  const i = found < 0 ? 0 : found;
  const next = list[(i + delta + list.length) % list.length];
  if (next) go(next.id);
}

/** Wischen auf Mobilgeräten wechselt den Kernbereich (TC-ANS-009). */
let touchX = 0;
let touchY = 0;
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0]!.clientX;
  touchY = e.touches[0]!.clientY;
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - touchX;
  const dy = e.changedTouches[0]!.clientY - touchY;
  if (Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
}

/**
 * Speichern je Kontrollpunkt nacheinander (Warteschlange): Schnelle Folgeklicks oder Pfeiltasten
 * senden sonst eine veraltete Version und erzeugen einen Scheinkonflikt mit sich selbst (TC-ANS-010).
 * `confirmed` ist der zuletzt vom Server bestätigte Stand; angezeigt wird sofort die neue Auswahl.
 */
const confirmed: Record<string, { value: Answer; version: number }> = {};
const queue: Record<string, Promise<void>> = {};
const seq: Record<string, number> = {};
const pending: Record<string, number> = {};

function setAnswer(cpId: string, value: Answer, force = false) {
  if (!editable.value) return;
  const conflict = conflicts[cpId];
  conflicts[cpId] = undefined;
  const prev = answers[cpId];
  answers[cpId] = { value, version: prev?.version ?? 0, updatedBy: prev?.updatedBy ?? null };
  state[cpId] = 'saving';
  const mine = (seq[cpId] = (seq[cpId] ?? 0) + 1);
  const forcedVersion = force && conflict ? conflict.version : undefined;
  pending[cpId] = (pending[cpId] ?? 0) + 1;
  const run = () =>
    save(cpId, value, mine, forcedVersion).finally(() => (pending[cpId] = pending[cpId]! - 1));
  queue[cpId] = (queue[cpId] ?? Promise.resolve()).then(run, run);
  return queue[cpId];
}

async function save(cpId: string, value: Answer, mine: number, forcedVersion?: number) {
  const latest = () => seq[cpId] === mine;
  const res = await apiPut<{
    value: Answer;
    version: number;
    current?: { value: Answer; version: number; updatedBy: string | null };
  }>(`/api/assessments/${props.id}/answers/${cpId}`, {
    value,
    version: forcedVersion ?? confirmed[cpId]?.version ?? 0,
  });
  if (res.ok && res.data) {
    confirmed[cpId] = { value: res.data.value, version: res.data.version };
    if (latest()) {
      answers[cpId] = {
        value: res.data.value,
        version: res.data.version,
        updatedBy: auth.user?.name ?? null,
      };
      state[cpId] = 'saved';
    }
    return;
  }
  if (res.status === 409 && res.error === 'version_conflict') {
    const cur = (res.data as { current: { value: Answer; version: number; updatedBy: string | null } })
      .current;
    confirmed[cpId] = { value: cur.value, version: cur.version };
    if (latest()) {
      answers[cpId] = { value: cur.value, version: cur.version, updatedBy: cur.updatedBy };
      conflicts[cpId] = { wanted: value, value: cur.value, version: cur.version, name: cur.updatedBy ?? '?' };
      state[cpId] = undefined;
    }
    return;
  }
  if (!latest()) return;
  // Nicht gespeichert (z. B. Server nicht erreichbar): Auswahl sichtbar lassen, Wiederholung anbieten (TC-ANS-011).
  state[cpId] = 'error';
  if (res.status === 409) {
    const c = confirmed[cpId];
    answers[cpId] = { value: c?.value ?? 'open', version: c?.version ?? 0, updatedBy: null };
    error(res.error);
    await load();
  }
}
function retry(cpId: string) {
  void setAnswer(cpId, valueOf(cpId));
}

async function submit() {
  confirmSubmit.value = false;
  const res = await apiPost(`/api/assessments/${props.id}/submission`);
  if (!res.ok) return error(res.error);
  info(t('questionnaire.submittedOk'));
  await load();
}

/** Pfeiltasten innerhalb einer Antwortgruppe bewegen die Auswahl wie bei Radio-Buttons (TC-ANS-010). */
function onKey(e: KeyboardEvent, cpId: string) {
  const i = SETTABLE_ANSWERS.indexOf(valueOf(cpId) as (typeof SETTABLE_ANSWERS)[number]);
  const d =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0;
  if (!d) return;
  e.preventDefault();
  const next =
    SETTABLE_ANSWERS[(Math.max(i, d > 0 ? -1 : 0) + d + SETTABLE_ANSWERS.length) % SETTABLE_ANSWERS.length]!;
  void setAnswer(cpId, next);
  void Promise.resolve().then(() =>
    (document.getElementById(`ans-${cpId}-${next}`) as HTMLElement | null)?.focus(),
  );
}
</script>

<template>
  <section data-testid="questionnaire" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <RouterLink :to="{ name: 'assessment', params: { id } }"
      >← {{ a?.project ?? t('common.back') }}</RouterLink
    >
    <div v-if="loadError" class="alert alert-error" role="alert" data-testid="questionnaire-error">
      <p>{{ loadError === 'forbidden' ? t('assessment.forbidden') : t('assessment.notFound') }}</p>
      <RouterLink :to="{ name: 'home' }">{{ t('nav.home') }}</RouterLink>
    </div>
    <template v-else-if="a">
      <h1>{{ t('questionnaire.heading') }}</h1>
      <NoticeBar :notice="notice" testid="questionnaire-notice" />

      <p v-if="isRespondent && !myDepartment" class="alert alert-error" data-testid="no-department">
        {{ t('questionnaire.noDepartment') }}
      </p>
      <div v-if="!isRespondent" class="field narrow">
        <label for="q-dep">{{ t('questionnaire.viewDepartment') }}</label>
        <select id="q-dep" v-model="viewDepartment" data-testid="view-department">
          <option v-for="d in departmentsForView" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>

      <div class="layout">
        <nav class="areas" :aria-label="t('questionnaire.areas')">
          <label v-if="isRespondent" class="check small">
            <input v-model="onlyMine" type="checkbox" data-testid="only-mine" />
            {{ t('questionnaire.myAreas') }}
          </label>
          <ul data-testid="area-nav">
            <li v-for="x in visibleAreas" :key="x.id">
              <RouterLink
                :to="{ name: 'questionnaire', params: { id, area: x.id } }"
                :class="['area-link', { active: x.id === currentArea?.id }]"
                :aria-current="x.id === currentArea?.id ? 'page' : undefined"
                :data-testid="`area-link-${x.id}`"
              >
                <span class="aid">{{ x.id }}</span>
                <span class="aname">{{ x.name[lang] }}</span>
                <span
                  v-if="othersIn(x.id).length"
                  class="apres"
                  :title="
                    othersIn(x.id)
                      .map((p) => p.name)
                      .join(', ')
                  "
                  :data-testid="`area-presence-${x.id}`"
                  >👤{{ othersIn(x.id).length }}</span
                >
                <span class="aprog">{{ progressOf(x.id).done }}/{{ progressOf(x.id).total }}</span>
              </RouterLink>
            </li>
          </ul>
        </nav>

        <div class="main">
          <div v-if="!currentArea" class="alert alert-error" role="alert" data-testid="area-not-found">
            <p>{{ t('questionnaire.areaNotFound') }}</p>
            <RouterLink :to="{ name: 'questionnaire', params: { id } }">{{
              t('questionnaire.areas')
            }}</RouterLink>
          </div>
          <template v-else>
            <div class="area-head">
              <button
                type="button"
                class="btn btn-ghost"
                :aria-label="t('questionnaire.prev')"
                data-testid="area-prev"
                @click="step(-1)"
              >
                ‹
              </button>
              <div class="area-title">
                <h2 data-testid="area-heading">{{ currentArea.id }} · {{ currentArea.name[lang] }}</h2>
                <p class="hint">{{ currentArea.description[lang] }}</p>
              </div>
              <button
                type="button"
                class="btn btn-ghost"
                :aria-label="t('questionnaire.next')"
                data-testid="area-next"
                @click="step(1)"
              >
                ›
              </button>
            </div>

            <p v-if="presenceText" class="presence" role="status" data-testid="presence-banner">
              <span aria-hidden="true">●</span> {{ presenceText }}
            </p>
            <div class="progress" data-testid="progress">
              <div
                class="bar"
                role="progressbar"
                :aria-label="t('questionnaire.progress', progress)"
                :aria-valuenow="progress.done"
                :aria-valuemax="progress.total"
                aria-valuemin="0"
              >
                <span
                  :style="{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }"
                ></span>
              </div>
              <span data-testid="progress-text">{{ t('questionnaire.progress', progress) }}</span>
            </div>

            <p v-if="a.status !== 'collecting'" class="alert alert-info" data-testid="not-collecting">
              {{ t('questionnaire.notCollecting') }}
            </p>
            <p v-else-if="isRespondent && submitted" class="alert alert-info" data-testid="submitted-info">
              {{ t('questionnaire.submitted') }}
            </p>
            <p
              v-else-if="isRespondent && myDepartment && !assigned(currentArea.id, myDepartment)"
              class="hint"
              data-testid="not-assigned"
            >
              {{ t('questionnaire.notAssigned') }}
            </p>

            <div class="filters">
              <label class="check small">
                <input v-model="onlyOpen" type="checkbox" data-testid="filter-open" />
                {{ t('questionnaire.filterOpen') }}
              </label>
              <label class="visually-hidden" for="q-type">{{ t('questionnaire.filter.all') }}</label>
              <select id="q-type" v-model="typeFilter" class="type-filter" data-testid="filter-type">
                <option v-for="f in ['all', 'classic', 'agile', 'ai']" :key="f" :value="f">
                  {{ t(`questionnaire.filter.${f}`) }}
                </option>
              </select>
            </div>

            <p v-if="shown.length === 0" class="empty-text" data-testid="no-checkpoints">
              {{ t('questionnaire.empty') }}
            </p>
            <section v-for="g in byLevel" :key="g.level" class="level">
              <h3>{{ t('questionnaire.level', { level: t(`levels.${g.level}`) }) }}</h3>
              <article v-for="cp in g.items" :key="cp.id" class="cp" :data-testid="`cp-${cp.id}`">
                <header class="cp-head">
                  <span class="cp-id">{{ cp.id }}</span>
                  <span
                    v-if="currentArea.isAiArea || cp.tags.includes('AI')"
                    class="badge ai"
                    data-testid="badge-ai"
                    >{{ t('questionnaire.aiBadge') }}</span
                  >
                  <span v-if="cp.tags.includes('agile')" class="badge agile" data-testid="badge-agile">{{
                    t('questionnaire.agileBadge')
                  }}</span>
                </header>
                <p :id="`cpt-${cp.id}`" class="cp-text">{{ cp.text[lang] }}</p>
                <details v-if="cp.hint" class="cp-hint">
                  <summary>{{ t('questionnaire.hint') }}</summary>
                  <p>{{ cp.hint[lang] }}</p>
                </details>
                <div
                  class="answers"
                  role="radiogroup"
                  :aria-labelledby="`cpt-${cp.id}`"
                  :aria-disabled="!editable"
                  data-testid="answer-group"
                  @keydown="onKey($event, cp.id)"
                >
                  <button
                    v-for="v in SETTABLE_ANSWERS"
                    :id="`ans-${cp.id}-${v}`"
                    :key="v"
                    type="button"
                    role="radio"
                    :class="['ans', `ans-${v}`]"
                    :aria-checked="valueOf(cp.id) === v"
                    :tabindex="valueOf(cp.id) === v || (valueOf(cp.id) === 'open' && v === 'yes') ? 0 : -1"
                    :disabled="!editable"
                    :data-testid="`answer-${v}`"
                    @click="setAnswer(cp.id, valueOf(cp.id) === v ? 'open' : v)"
                  >
                    {{ t(`answers.${v}`) }}
                  </button>
                </div>
                <p class="save-state" aria-live="polite" data-testid="save-state">
                  <template v-if="state[cp.id] === 'saving'">{{ t('questionnaire.saving') }}</template>
                  <template v-else-if="state[cp.id] === 'saved'">✓ {{ t('questionnaire.saved') }}</template>
                  <template v-else-if="state[cp.id] === 'error'">
                    <span class="error-text" data-testid="not-saved">{{ t('questionnaire.notSaved') }}</span>
                    <button
                      type="button"
                      class="btn btn-ghost btn-small"
                      data-testid="answer-retry"
                      @click="retry(cp.id)"
                    >
                      {{ t('common.retry') }}
                    </button>
                  </template>
                  <template v-else-if="answers[cp.id]?.updatedBy && valueOf(cp.id) !== 'open'">
                    <span class="muted">{{
                      t('questionnaire.lastChange', { name: answers[cp.id]!.updatedBy })
                    }}</span>
                  </template>
                </p>
                <div
                  v-if="conflicts[cp.id]"
                  class="alert alert-error conflict"
                  role="alert"
                  data-testid="answer-conflict"
                >
                  <p>
                    {{
                      t('questionnaire.conflict', {
                        name: conflicts[cp.id]!.name,
                        value: t(`answers.${conflicts[cp.id]!.value}`),
                      })
                    }}
                  </p>
                  <div class="button-row">
                    <button
                      type="button"
                      class="btn btn-primary-inline btn-small"
                      data-testid="conflict-take-mine"
                      @click="setAnswer(cp.id, conflicts[cp.id]!.wanted, true)"
                    >
                      {{ t('questionnaire.conflictTake') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-small"
                      data-testid="conflict-keep"
                      @click="conflicts[cp.id] = undefined"
                    >
                      {{ t('questionnaire.conflictKeep') }}
                    </button>
                  </div>
                </div>
                <div class="cp-foot">
                  <button
                    type="button"
                    class="btn btn-ghost btn-small"
                    :aria-expanded="!!openComments[cp.id]"
                    data-testid="toggle-comments"
                    @click="openComments[cp.id] = !openComments[cp.id]"
                  >
                    💬 {{ t('comments.count', commentsOf(cp.id).length) }}
                  </button>
                  <RouterLink
                    :to="{ name: 'admin', query: { tab: 'history', assessmentId: id, checkpointId: cp.id } }"
                    class="small-link"
                    data-testid="cp-history"
                    >{{ t('questionnaire.history') }}</RouterLink
                  >
                </div>
                <CommentThread
                  v-if="openComments[cp.id]"
                  :assessment-id="id"
                  :checkpoint-id="cp.id"
                  :comments="commentsOf(cp.id)"
                  :sources="a.sources"
                  :can-comment="a.me.canComment && (a.me.canManage || assigned(currentArea.id, myDepartment))"
                  :can-moderate="a.me.canManage"
                  :current-user-id="auth.user?.id ?? ''"
                  @changed="loadComments"
                />
              </article>
            </section>

            <div v-if="a.me.canAnswer && ownView && !submitted" class="card-flat submit-box">
              <button
                type="button"
                class="btn btn-primary-inline"
                data-testid="department-submit"
                @click="confirmSubmit = true"
              >
                {{ t('questionnaire.submit') }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <ConfirmDialog
        :open="confirmSubmit"
        :title="t('questionnaire.submitTitle')"
        :text="t('questionnaire.submitText')"
        :confirm-label="t('questionnaire.submit')"
        @confirm="submit"
        @cancel="confirmSubmit = false"
      />
    </template>
    <p v-else class="empty-text">{{ t('common.loading') }}</p>
  </section>
</template>

<style scoped>
.narrow {
  max-width: 360px;
}
.layout {
  display: grid;
  gap: 1rem;
  /* minmax(0, …): Die waagerecht scrollbare Kernbereichsleiste darf die Seite nicht verbreitern (TC-RWD-001). */
  grid-template-columns: minmax(0, 1fr);
}
.areas,
.main {
  min-width: 0;
}
@media (min-width: 1024px) {
  .layout {
    grid-template-columns: 280px minmax(0, 1fr);
    align-items: start;
  }
  .areas {
    position: sticky;
    top: 72px;
    max-height: calc(100dvh - 90px);
    overflow-y: auto;
  }
}
.areas ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
}
@media (min-width: 1024px) {
  .areas ul {
    flex-direction: column;
    overflow-x: visible;
  }
}
.area-link {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-height: var(--touch);
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  text-decoration: none;
  color: var(--c-text);
  white-space: nowrap;
}
.area-link.active {
  border-color: var(--c-accent);
  box-shadow: inset 3px 0 0 var(--c-accent);
  font-weight: 700;
}
.aid {
  font-weight: 700;
  color: var(--c-accent);
}
.aname {
  display: none;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
@media (min-width: 1024px) {
  .aname {
    display: inline;
  }
}
.apres {
  font-size: 0.8rem;
  color: var(--c-accent);
}
.presence {
  margin: 0 0 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  background: #eef4fb;
  color: #1f3a5f;
  font-size: 0.95rem;
}
.presence span {
  color: var(--c-ok);
}
.aprog {
  font-size: 0.8rem;
  color: var(--c-muted);
  margin-left: auto;
}
.area-head {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}
.area-title {
  flex: 1;
  min-width: 0;
}
.area-title h2 {
  margin: 0.25rem 0;
  font-size: 1.2rem;
}
.progress {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin: 0.5rem 0 1rem;
}
.bar {
  flex: 1;
  height: 10px;
  background: var(--c-border);
  border-radius: 999px;
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  background: var(--c-ok);
  transition: width 0.2s;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
}
.type-filter {
  width: auto;
}
.check.small {
  font-weight: 400;
}
.level h3 {
  font-size: 1rem;
  margin: 1.25rem 0 0.5rem;
  color: var(--c-muted);
}
.cp {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}
.cp-head {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.cp-id {
  font-weight: 700;
  color: var(--c-accent);
  font-size: 0.9rem;
}
.badge {
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  color: #fff;
}
.badge.ai {
  background: #6a3fb5;
}
.badge.agile {
  background: #0f7b74;
}
.cp-text {
  margin: 0.35rem 0 0.5rem;
}
.cp-hint summary {
  cursor: pointer;
  color: var(--c-accent);
  min-height: var(--touch);
  display: flex;
  align-items: center;
}
.answers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}
@media (min-width: 600px) {
  .answers {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.ans {
  min-height: 48px;
  border-radius: 8px;
  border: 2px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.ans:disabled {
  cursor: default;
  opacity: 0.75;
}
.ans[aria-checked='true'].ans-yes {
  background: #1e7a3c;
  border-color: #1e7a3c;
  color: #fff;
}
.ans[aria-checked='true'].ans-partial {
  background: #f2c037;
  border-color: #c99a12;
  color: #1b1f24;
}
.ans[aria-checked='true'].ans-no {
  background: #b3261e;
  border-color: #b3261e;
  color: #fff;
}
.ans[aria-checked='true'].ans-na {
  background: repeating-linear-gradient(45deg, #8a94a3, #8a94a3 6px, #6b7584 6px, #6b7584 12px);
  border-color: #5b6573;
  color: #fff;
}
.ans[aria-checked='true']::before {
  content: '✓ ';
}
.save-state {
  margin: 0.35rem 0 0;
  min-height: 1.4em;
  font-size: 0.85rem;
  color: var(--c-ok);
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.muted {
  color: var(--c-muted);
}
.conflict {
  margin-top: 0.5rem;
}
.conflict p {
  margin: 0 0 0.5rem;
}
.cp-foot {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.4rem;
}
.small-link {
  font-size: 0.9rem;
  min-height: var(--touch);
  display: inline-flex;
  align-items: center;
}
.submit-box {
  margin-top: 1rem;
}
</style>
