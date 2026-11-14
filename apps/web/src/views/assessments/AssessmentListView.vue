<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { apiGet } from '../../api/client';
import type { AssessmentSummary } from '../../api/assessments';
import { useAuthStore } from '../../stores/auth';
import { formatDate } from '../../utils/format';

const { t, locale } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const list = ref<AssessmentSummary[] | null>(null);

const { notice, info, error } = useNotice('assessment.errors');
async function loadList() {
  list.value = (await apiGet<AssessmentSummary[]>('/api/assessments')).data ?? [];
}
onMounted(loadList);

/** JSON-Import (US-1.3): Datei lesen, bestätigen lassen, als neues Assessment anlegen (TC-IO-001…005). */
interface ImportReport {
  id: string;
  project: string;
  imported: { departmentAnswers: number; comments: number };
  ignored: Record<'checkpoints' | 'departments' | 'members' | 'keyAreas', string[]>;
}
const pendingImport = ref<{ name: string; data: unknown } | null>(null);
const report = ref<ImportReport | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  report.value = null;
  if (!file) return;
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return error('not_json');
  }
  const name = (data as { assessment?: { project?: unknown } })?.assessment?.project;
  pendingImport.value = { name: typeof name === 'string' ? name : file.name, data };
}

async function runImport() {
  const p = pendingImport.value;
  pendingImport.value = null;
  if (!p) return;
  const res = await apiPost<ImportReport>('/api/assessments/import', p.data);
  if (!res.ok || !res.data) return error(res.error);
  report.value = res.data;
  info(
    t('assessment.imported', {
      name: res.data.project,
      answers: res.data.imported.departmentAnswers,
      comments: res.data.imported.comments,
    }),
  );
  await loadList();
}
const ignoredLines = () =>
  report.value
    ? (Object.entries(report.value.ignored) as [keyof ImportReport['ignored'], string[]][])
        .filter(([, l]) => l.length)
        .map(([k, l]) => t(`assessment.ignored.${k}`, { list: l.join(', ') }))
    : [];
const date = (s: string | null) => formatDate(locale.value, s);
</script>

<template>
  <section data-testid="assessment-list-view">
    <div class="head">
      <h1>{{ t('assessment.listHeading') }}</h1>
      <div v-if="auth.user?.role === 'assessor'" class="button-row head-actions">
        <RouterLink
          :to="{ name: 'assessment-new' }"
          class="btn btn-primary-inline linkbtn"
          data-testid="assessment-new"
          >{{ t('assessment.create') }}</RouterLink
        >
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="assessment-import"
          @click="fileInput?.click()"
        >
          {{ t('assessment.import') }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="visually-hidden"
          tabindex="-1"
          aria-hidden="true"
          data-testid="assessment-import-file"
          @change="onFile"
        />
      </div>
    </div>
    <p v-if="route.query.deleted" class="alert alert-info" role="status" data-testid="assessment-deleted">
      {{ t('assessment.deleted') }}
    </p>
    <NoticeBar :notice="notice" testid="assessment-list-notice" />
    <div v-if="report" class="card-flat" data-testid="import-report">
      <RouterLink :to="{ name: 'assessment', params: { id: report.id } }" data-testid="import-link">{{
        report.project
      }}</RouterLink>
      <template v-if="ignoredLines().length">
        <p class="hint">{{ t('assessment.ignoredHeading') }}</p>
        <ul>
          <li v-for="l in ignoredLines()" :key="l" data-testid="import-ignored">{{ l }}</li>
        </ul>
      </template>
    </div>
    <ConfirmDialog
      :open="!!pendingImport"
      :title="t('assessment.importTitle')"
      :text="t('assessment.importText', { name: pendingImport?.name ?? '' })"
      :confirm-label="t('assessment.importConfirm')"
      @confirm="runImport"
      @cancel="pendingImport = null"
    />
    <p v-if="list === null" class="empty-text">{{ t('common.loading') }}</p>
    <p v-else-if="list.length === 0" class="empty-text" data-testid="assessment-empty">
      {{
        auth.user?.role === 'assessor' || auth.isAdmin ? t('assessment.empty') : t('assessment.emptyMember')
      }}
    </p>
    <ul v-else class="row-list" data-testid="assessment-list">
      <li v-for="a in list" :key="a.id" class="row-item" :data-testid="`assessment-row-${a.project}`">
        <div class="row-main">
          <RouterLink
            :to="{ name: 'assessment', params: { id: a.id } }"
            class="title"
            data-testid="assessment-link"
            >{{ a.project }}</RouterLink
          >
          <span class="row-sub">
            {{ a.assessorName }} · {{ date(a.startDate)
            }}<template v-if="a.endDate"> – {{ date(a.endDate) }}</template> ·
            {{ t(`assessment.method.${a.methodModel}`) }}
          </span>
        </div>
        <span :class="['tag', `st-${a.status}`]" data-testid="assessment-status">{{
          t(`assessment.status.${a.status}`)
        }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.head-actions {
  margin: 0;
}
.head h1 {
  margin: 0;
}
.linkbtn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.title {
  font-weight: 700;
  min-height: var(--touch);
  display: inline-flex;
  align-items: center;
}
.st-released {
  background: var(--c-ok-bg);
  color: var(--c-ok);
}
.st-consolidating {
  background: #fff4e5;
  border-color: #f0b46b;
  color: #7a4300;
}
</style>
