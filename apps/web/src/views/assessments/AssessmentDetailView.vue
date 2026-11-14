<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { catalog } from '@ai-tpi/catalog';
import type { AssessmentStatus } from '@ai-tpi/shared';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import MasterDataForm from '../../components/MasterDataForm.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../api/client';
import type { AssessmentDetail, AssessmentMaster, Member, Source } from '../../api/assessments';
import { useLiveAssessment } from '../../composables/useLiveAssessment';
import { useNotice } from '../../composables/useNotice';
import { useAuthStore } from '../../stores/auth';
import { formatDateTime } from '../../utils/format';

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { notice, info, error } = useNotice('assessment.errors');
const auth = useAuthStore();

const a = ref<AssessmentDetail | null>(null);
const loadError = ref<'not_found' | 'forbidden' | null>(null);
const tabs = ['overview', 'team', 'sources'] as const;
type Tab = (typeof tabs)[number];
const tab = ref<Tab>(tabs.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'overview');
watch(tab, (v) => void router.replace({ query: { ...route.query, tab: v, created: undefined } }));

const busy = ref(false);
const serverFields = ref<string[]>();
const candidates = ref<Member[]>([]);
const chosen = ref('');
const confirmDelete = ref(false);
const newSource = reactive({ name: '', role: '', unit: '', type: 'person' as Source['type'] });
const sourceError = ref(false);

async function load() {
  const res = await apiGet<AssessmentDetail>(`/api/assessments/${props.id}`);
  if (!res.ok) {
    loadError.value = res.status === 403 ? 'forbidden' : 'not_found';
    return;
  }
  a.value = res.data;
  if (res.data?.me.canManage)
    candidates.value = (await apiGet<Member[]>(`/api/assessments/${props.id}/candidates`)).data ?? [];
}
onMounted(async () => {
  await load();
  if (route.query.created) info(t('assessment.created'));
});

/** Formularstand nur beim ersten Laden und nach eigenem Speichern setzen – Live-Aktualisierungen überschreiben keine Eingaben. */
const master = ref<AssessmentMaster | null>(null);
watch(a, (v, old) => {
  if (v && (!old || !master.value)) master.value = { ...v };
});
const copyName = ref('');
const copied = ref<{ id: string; project: string } | null>(null);
const exportHref = computed(() => `/api/assessments/${props.id}/export`);

useLiveAssessment(props.id, {
  view: 'overview',
  on: {
    assessment: (e) => (e.deleted ? (loadError.value = 'not_found') : void load()),
    submission: () => void load(),
  },
});

async function duplicate() {
  const project = (
    copyName.value || t('assessment.duplicateDefault', { name: a.value?.project ?? '' })
  ).trim();
  const res = await apiPost<{ id: string; project: string }>(`/api/assessments/${props.id}/duplicate`, {
    project,
  });
  if (!res.ok || !res.data) return error(res.error);
  copied.value = { id: res.data.id, project: res.data.project };
  copyName.value = '';
  info(t('assessment.duplicated'));
}
const depName = (id: string | null) => a.value?.departments.find((d) => d.id === id)?.name ?? '';
const nextStatus = computed<AssessmentStatus[]>(() => {
  const s = a.value?.status;
  return s === 'collecting'
    ? ['consolidating']
    : s === 'consolidating'
      ? ['collecting', 'released']
      : ['consolidating'];
});
const assignedTo = (areaId: string) =>
  a.value?.assignments.filter((x) => x.keyAreaId === areaId).map((x) => x.departmentId) ?? [];
const respondentDepartments = computed(() => {
  const ids = new Set(
    a.value?.members.filter((m) => m.role === 'respondent' && m.departmentId).map((m) => m.departmentId!),
  );
  return (
    a.value?.departments.filter(
      (d) => ids.has(d.id) || a.value!.assignments.some((x) => x.departmentId === d.id),
    ) ?? []
  );
});

async function save(data: AssessmentMaster) {
  busy.value = true;
  const res = await apiPatch<AssessmentDetail>(`/api/assessments/${props.id}`, data);
  busy.value = false;
  if (!res.ok) {
    serverFields.value = (res.data as { fields?: string[] } | null)?.fields;
    return error(res.error);
  }
  info(t('common.saved'));
  await load();
  if (a.value) master.value = { ...a.value };
}

async function setStatus(status: AssessmentStatus) {
  const res = await apiPost(`/api/assessments/${props.id}/status`, { status });
  if (!res.ok) return error(res.error);
  info(t('assessment.statusChanged'));
  await load();
}

async function remove() {
  confirmDelete.value = false;
  const res = await apiDelete(`/api/assessments/${props.id}`);
  if (!res.ok) return error(res.error);
  await router.push({ name: 'assessments', query: { deleted: '1' } });
}

async function addMember() {
  if (!chosen.value) return;
  const res = await apiPost(`/api/assessments/${props.id}/members`, { userId: chosen.value });
  if (!res.ok) return error(res.error);
  chosen.value = '';
  info(t('assessment.team.added'));
  await load();
}

async function removeMember(m: Member) {
  const res = await apiDelete(`/api/assessments/${props.id}/members/${m.id}`);
  if (!res.ok) return error(res.error);
  info(t('assessment.team.removed'));
  await load();
}

async function toggleAssignment(areaId: string, departmentId: string, on: boolean) {
  const current = assignedTo(areaId);
  const departmentIds = on ? [...current, departmentId] : current.filter((d) => d !== departmentId);
  const res = await apiPut(`/api/assessments/${props.id}/assignments/${areaId}`, { departmentIds });
  if (!res.ok) return error(res.error);
  info(t('assessment.assign.saved'));
  await load();
}

async function reopen(departmentId: string) {
  const res = await apiDelete(`/api/assessments/${props.id}/submissions/${departmentId}`);
  if (!res.ok) return error(res.error);
  info(t('assessment.submissions.reopened'));
  await load();
}

async function addSource() {
  sourceError.value = !newSource.name.trim();
  if (sourceError.value) return;
  const res = await apiPost(`/api/assessments/${props.id}/sources`, { ...newSource });
  if (!res.ok) return error(res.error);
  Object.assign(newSource, { name: '', role: '', unit: '', type: 'person' });
  info(t('assessment.sources.created'));
  await load();
}

async function toggleSource(s: Source) {
  const res = await apiPatch(`/api/assessments/${props.id}/sources/${s.id}`, { active: !s.active });
  if (!res.ok) return error(res.error);
  info(t('common.saved'));
  await load();
}

async function deleteSource(s: Source) {
  const res = await apiDelete(`/api/assessments/${props.id}/sources/${s.id}`);
  if (!res.ok) return error(res.error);
  info(t('assessment.sources.deleted'));
  await load();
}

const lang = computed(() => locale.value as 'de' | 'en');
</script>

<template>
  <section data-testid="assessment-detail">
    <RouterLink :to="{ name: 'assessments' }">← {{ t('assessment.toList') }}</RouterLink>
    <div v-if="loadError" class="alert alert-error" role="alert" data-testid="assessment-load-error">
      {{ loadError === 'forbidden' ? t('assessment.forbidden') : t('assessment.notFound') }}
    </div>
    <template v-else-if="a">
      <div class="head">
        <h1 data-testid="assessment-title">{{ a.project }}</h1>
        <span class="tag" data-testid="assessment-status">{{ t(`assessment.status.${a.status}`) }}</span>
      </div>
      <nav class="actions" :aria-label="t('assessment.listHeading')">
        <RouterLink
          :to="{ name: 'questionnaire', params: { id: a.id } }"
          class="btn btn-primary-inline linkbtn"
          data-testid="to-questionnaire"
          >{{ t('assessment.actions.questionnaire') }}</RouterLink
        >
        <RouterLink
          v-if="auth.user?.role !== 'respondent'"
          :to="{ name: 'consolidation', params: { id: a.id } }"
          class="btn btn-ghost linkbtn"
          data-testid="to-consolidation"
          >{{ t('assessment.actions.consolidation') }}</RouterLink
        >
        <RouterLink
          :to="{ name: 'report', params: { id: a.id } }"
          class="btn btn-ghost linkbtn"
          data-testid="to-report"
          >{{ t('assessment.actions.report') }}</RouterLink
        >
        <RouterLink
          :to="{ name: 'admin', query: { tab: 'history', assessmentId: a.id } }"
          class="btn btn-ghost linkbtn"
          data-testid="to-history"
          >{{ t('assessment.actions.history') }}</RouterLink
        >
      </nav>
      <NoticeBar :notice="notice" testid="assessment-notice" />
      <p v-if="!a.me.canManage" class="hint" data-testid="assessment-readonly">
        {{ t('assessment.readOnly') }}
      </p>

      <div class="tabs" role="tablist">
        <button
          v-for="tb in tabs"
          :id="`atab-${tb}`"
          :key="tb"
          type="button"
          role="tab"
          class="tab"
          :aria-selected="tab === tb"
          :aria-controls="`apanel-${tb}`"
          :data-testid="`atab-${tb}`"
          @click="tab = tb"
        >
          {{ t(`assessment.tabs.${tb}`) }}
        </button>
      </div>

      <div v-if="tab === 'overview'" id="apanel-overview" role="tabpanel" aria-labelledby="atab-overview">
        <MasterDataForm
          v-if="master"
          :initial="master"
          :readonly="!a.me.canManage"
          :busy="busy"
          :server-fields="serverFields"
          :submit-label="t('common.save')"
          @submit="save"
        />
        <div v-if="a.me.canManage" class="card-flat">
          <div class="button-row">
            <button
              v-for="s in nextStatus"
              :key="s"
              type="button"
              class="btn btn-ghost"
              :data-testid="`status-${s}`"
              @click="setStatus(s)"
            >
              {{ t(`assessment.statusChange.${s}`) }}
            </button>
            <button
              type="button"
              class="btn btn-danger"
              data-testid="assessment-delete"
              @click="confirmDelete = true"
            >
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
        <div v-if="a.me.canManage" class="card-flat" data-testid="duplicate-box">
          <h2>{{ t('assessment.duplicate') }}</h2>
          <p class="hint">{{ t('assessment.duplicateHint') }}</p>
          <div class="inline-form">
            <div class="field">
              <label for="dup-name">{{ t('assessment.duplicateName') }}</label>
              <input
                id="dup-name"
                v-model="copyName"
                type="text"
                maxlength="120"
                :placeholder="t('assessment.duplicateDefault', { name: a.project })"
                data-testid="duplicate-name"
              />
            </div>
            <button type="button" class="btn btn-primary-inline" data-testid="duplicate" @click="duplicate">
              {{ t('assessment.duplicate') }}
            </button>
          </div>
          <p v-if="copied" class="hint">
            <RouterLink :to="{ name: 'assessment', params: { id: copied.id } }" data-testid="duplicate-link"
              >{{ t('assessment.toCopy') }}: {{ copied.project }}</RouterLink
            >
          </p>
        </div>
        <div class="card-flat">
          <h2>{{ t('assessment.export') }}</h2>
          <p class="hint">{{ t('assessment.exportHint') }}</p>
          <a :href="exportHref" download class="btn btn-ghost linkbtn" data-testid="assessment-export">{{
            t('assessment.export')
          }}</a>
        </div>
      </div>

      <div v-else-if="tab === 'team'" id="apanel-team" role="tabpanel" aria-labelledby="atab-team">
        <div class="card-flat">
          <h2>{{ t('assessment.team.heading') }}</h2>
          <p class="hint">{{ t('assessment.team.hint') }}</p>
          <ul class="row-list" data-testid="member-list">
            <li v-for="m in a.members" :key="m.id" class="row-item" :data-testid="`member-${m.email}`">
              <div class="row-main">
                <strong>{{ m.name }}</strong>
                <span class="row-sub"
                  >{{ t(`roles.${m.role}`) }} ·
                  {{ depName(m.departmentId) || t('assessment.team.noDepartment') }}</span
                >
              </div>
              <button
                v-if="a.me.canManage && m.role !== 'assessor'"
                type="button"
                class="btn btn-ghost btn-small"
                data-testid="member-remove"
                @click="removeMember(m)"
              >
                {{ t('assessment.team.remove') }}
              </button>
            </li>
          </ul>
          <div v-if="a.me.canManage" class="inline-form add-member">
            <div class="field">
              <label for="member-choose">{{ t('assessment.team.choose') }}</label>
              <select id="member-choose" v-model="chosen" data-testid="member-choose">
                <option value="" disabled>
                  {{ candidates.length ? t('assessment.team.choose') : t('assessment.team.noCandidates') }}
                </option>
                <option v-for="c in candidates" :key="c.id" :value="c.id">
                  {{ c.name }} – {{ t(`roles.${c.role}`)
                  }}{{ c.departmentId ? ` (${depName(c.departmentId)})` : '' }}
                </option>
              </select>
            </div>
            <button type="button" class="btn btn-primary-inline" data-testid="member-add" @click="addMember">
              {{ t('assessment.team.add') }}
            </button>
          </div>
        </div>

        <div class="card-flat">
          <h2>{{ t('assessment.assign.heading') }}</h2>
          <p class="hint">{{ t('assessment.assign.hint') }}</p>
          <p v-if="a.departments.length === 0" class="empty-text">
            {{ t('assessment.assign.noDepartments') }}
          </p>
          <ul v-else class="assign-list" data-testid="assignment-list">
            <li v-for="area in catalog.keyAreas" :key="area.id" :data-testid="`assign-${area.id}`">
              <span class="area"
                ><strong>{{ area.id }}</strong> {{ area.name[lang] }}</span
              >
              <span class="deps">
                <template v-if="a.me.canManage">
                  <label
                    v-for="d in a.departments.filter((x) => x.active || assignedTo(area.id).includes(x.id))"
                    :key="d.id"
                    class="chip"
                  >
                    <input
                      type="checkbox"
                      :checked="assignedTo(area.id).includes(d.id)"
                      :data-testid="`assign-${area.id}-${d.name}`"
                      @change="toggleAssignment(area.id, d.id, ($event.target as HTMLInputElement).checked)"
                    />
                    {{ d.name }}
                  </label>
                </template>
                <template v-else>
                  {{ assignedTo(area.id).map(depName).join(', ') || t('assessment.assign.none') }}
                </template>
              </span>
            </li>
          </ul>
        </div>

        <div class="card-flat">
          <h2>{{ t('assessment.submissions.heading') }}</h2>
          <ul class="row-list" data-testid="submission-list">
            <li
              v-for="d in respondentDepartments"
              :key="d.id"
              class="row-item"
              :data-testid="`submission-${d.name}`"
            >
              <div class="row-main">
                <strong>{{ d.name }}</strong>
                <span class="row-sub">
                  <template v-if="a.submissions.find((s) => s.departmentId === d.id)">
                    <span class="tag tag-ok">{{ t('assessment.submissions.submitted') }}</span>
                    {{
                      formatDateTime(locale, a.submissions.find((s) => s.departmentId === d.id)!.submittedAt)
                    }}
                  </template>
                  <span v-else class="tag">{{ t('assessment.submissions.draft') }}</span>
                </span>
              </div>
              <button
                v-if="a.me.canManage && a.submissions.some((s) => s.departmentId === d.id)"
                type="button"
                class="btn btn-ghost btn-small"
                data-testid="submission-reopen"
                @click="reopen(d.id)"
              >
                {{ t('assessment.submissions.reopen') }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div v-else id="apanel-sources" role="tabpanel" aria-labelledby="atab-sources">
        <form
          v-if="a.me.canManage"
          class="card-flat"
          novalidate
          data-testid="source-form"
          @submit.prevent="addSource"
        >
          <h2>{{ t('assessment.sources.heading') }}</h2>
          <p class="hint">{{ t('assessment.sources.hint') }}</p>
          <div class="form-grid">
            <div class="field">
              <label for="src-name">{{ t('assessment.sources.name') }} *</label>
              <input
                id="src-name"
                v-model="newSource.name"
                type="text"
                maxlength="120"
                :aria-invalid="sourceError"
                data-testid="source-name"
              />
              <p v-if="sourceError" class="error-text" data-testid="source-name-error">
                {{ t('assessment.errors.name') }}
              </p>
            </div>
            <div class="field">
              <label for="src-role">{{ t('assessment.sources.role') }}</label>
              <input
                id="src-role"
                v-model="newSource.role"
                type="text"
                maxlength="120"
                data-testid="source-role"
              />
            </div>
            <div class="field">
              <label for="src-unit">{{ t('assessment.sources.unit') }}</label>
              <input id="src-unit" v-model="newSource.unit" type="text" maxlength="120" />
            </div>
            <div class="field">
              <label for="src-type">{{ t('assessment.sources.type') }}</label>
              <select id="src-type" v-model="newSource.type" data-testid="source-type">
                <option v-for="ty in ['person', 'document', 'tool', 'other']" :key="ty" :value="ty">
                  {{ t(`assessment.sources.types.${ty}`) }}
                </option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary-inline" data-testid="source-add">
            {{ t('assessment.sources.add') }}
          </button>
        </form>
        <ul class="row-list" data-testid="source-list">
          <li v-if="a.sources.length === 0" class="empty-text">{{ t('assessment.sources.empty') }}</li>
          <li v-for="s in a.sources" :key="s.id" class="row-item" :data-testid="`source-row-${s.name}`">
            <div class="row-main">
              <strong>{{ s.name }}</strong>
              <span class="row-sub">
                {{ [s.role, s.unit, t(`assessment.sources.types.${s.type}`)].filter(Boolean).join(' · ') }}
                <span v-if="!s.active" class="tag tag-error">{{ t('assessment.sources.inactive') }}</span>
              </span>
            </div>
            <div v-if="a.me.canManage" class="row-actions">
              <button
                type="button"
                class="btn btn-ghost"
                data-testid="source-toggle"
                @click="toggleSource(s)"
              >
                {{ s.active ? t('assessment.sources.deactivate') : t('assessment.sources.activate') }}
              </button>
              <button
                type="button"
                class="btn btn-ghost"
                data-testid="source-delete"
                @click="deleteSource(s)"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </li>
        </ul>
      </div>

      <ConfirmDialog
        :open="confirmDelete"
        :title="t('assessment.deleteTitle')"
        :text="t('assessment.deleteText', { name: a.project })"
        :confirm-label="t('common.delete')"
        danger
        @confirm="remove"
        @cancel="confirmDelete = false"
      />
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
  margin-top: 0.5rem;
}
.head h1 {
  margin: 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
}
.linkbtn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 1rem;
}
.tab {
  min-height: var(--touch);
  padding: 0.5rem 1rem;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--c-text);
  font-size: 1rem;
  cursor: pointer;
  white-space: nowrap;
}
.tab[aria-selected='true'] {
  border-bottom-color: var(--c-accent);
  font-weight: 700;
}
.add-member {
  margin-top: 0.75rem;
}
.assign-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.25rem;
}
.assign-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--c-border);
}
.area {
  flex: 1 1 260px;
}
.deps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  color: var(--c-muted);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: var(--touch);
  font-weight: 400;
  color: var(--c-text);
}
.chip input {
  width: 1.15rem;
  height: 1.15rem;
}
</style>
