<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

interface Industry {
  code: string;
  nameDe: string;
  nameEn: string;
  naceRef: string | null;
  active: boolean;
  standard: boolean;
  ownCompany: boolean;
}

const CODE_RE = /^[A-Z][A-Z0-9]{1,4}$/;
const { t, locale } = useI18n();
const { notice, info, error, clear } = useNotice('admin.industries.errors');
const list = ref<Industry[]>([]);
const search = ref('');
const form = reactive({ code: '', nameDe: '', nameEn: '', naceRef: '' });
const errors = reactive<Record<string, string | undefined>>({});
const edit = reactive<{ code: string | null; nameDe: string; nameEn: string; naceRef: string }>({
  code: null,
  nameDe: '',
  nameEn: '',
  naceRef: '',
});
const toDelete = ref<Industry | null>(null);

const primary = (i: Industry) => (locale.value === 'en' ? i.nameEn : i.nameDe);
const secondary = (i: Industry) => (locale.value === 'en' ? i.nameDe : i.nameEn);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const rows = [...list.value].sort((a, b) => primary(a).localeCompare(primary(b), locale.value));
  return q
    ? rows.filter((i) =>
        [i.code, i.nameDe, i.nameEn, i.naceRef ?? ''].some((v) => v.toLowerCase().includes(q)),
      )
    : rows;
});

async function load() {
  list.value = (await apiGet<Industry[]>('/api/admin/industries')).data ?? [];
}
onMounted(load);

const nameError = (v: string) => (v.trim().length >= 2 ? undefined : t('admin.industries.errors.name'));

async function create() {
  clear();
  form.code = form.code.trim().toUpperCase();
  Object.assign(errors, {
    code: CODE_RE.test(form.code) ? undefined : t('admin.industries.errors.code'),
    nameDe: nameError(form.nameDe),
    nameEn: nameError(form.nameEn),
  });
  if (Object.values(errors).some(Boolean)) return;
  const res = await apiPost<Industry>('/api/admin/industries', {
    code: form.code,
    nameDe: form.nameDe.trim(),
    nameEn: form.nameEn.trim(),
    naceRef: form.naceRef.trim() || null,
  });
  if (!res.ok) return error(res.error);
  info(t('admin.industries.created', { code: form.code }));
  Object.assign(form, { code: '', nameDe: '', nameEn: '', naceRef: '' });
  await load();
}

function startEdit(i: Industry) {
  clear();
  Object.assign(edit, { code: i.code, nameDe: i.nameDe, nameEn: i.nameEn, naceRef: i.naceRef ?? '' });
}

async function saveEdit() {
  if (!edit.code) return;
  if (nameError(edit.nameDe) || nameError(edit.nameEn)) return error('name');
  const res = await apiPatch(`/api/admin/industries/${edit.code}`, {
    nameDe: edit.nameDe.trim(),
    nameEn: edit.nameEn.trim(),
    naceRef: edit.naceRef.trim() || null,
  });
  if (!res.ok) return error(res.error);
  info(t('common.saved'));
  edit.code = null;
  await load();
}

async function toggle(i: Industry) {
  clear();
  const res = await apiPatch(`/api/admin/industries/${i.code}`, { active: !i.active });
  if (!res.ok) return error(res.error);
  info(t('common.saved'));
  await load();
}

async function remove() {
  const i = toDelete.value;
  toDelete.value = null;
  if (!i) return;
  const res = await apiDelete(`/api/admin/industries/${i.code}`);
  if (!res.ok) return error(res.error);
  info(t('admin.industries.deleted', { code: i.code }));
  await load();
}
</script>

<template>
  <div class="industries" data-testid="industries-panel">
    <p class="hint">{{ t('admin.industries.intro') }}</p>
    <NoticeBar :notice="notice" testid="industry-notice" />

    <form class="card-flat" novalidate data-testid="industry-create-form" @submit.prevent="create">
      <h2>{{ t('admin.industries.create') }}</h2>
      <div class="form-grid">
        <div class="field">
          <label for="ind-code">{{ t('admin.industries.code') }}</label>
          <input
            id="ind-code"
            v-model="form.code"
            type="text"
            maxlength="5"
            autocomplete="off"
            autocapitalize="characters"
            aria-describedby="ind-code-hint"
            :aria-invalid="!!errors.code"
            data-testid="industry-code"
          />
          <p id="ind-code-hint" class="hint">{{ t('admin.industries.codeHint') }}</p>
          <p v-if="errors.code" class="error-text" data-testid="industry-code-error">{{ errors.code }}</p>
        </div>
        <div class="field">
          <label for="ind-nace">{{ t('admin.industries.nace') }}</label>
          <input
            id="ind-nace"
            v-model="form.naceRef"
            type="text"
            maxlength="60"
            data-testid="industry-nace"
          />
        </div>
        <div class="field">
          <label for="ind-de">{{ t('admin.industries.nameDe') }}</label>
          <input
            id="ind-de"
            v-model="form.nameDe"
            type="text"
            maxlength="80"
            lang="de"
            :aria-invalid="!!errors.nameDe"
            data-testid="industry-name-de"
          />
          <p v-if="errors.nameDe" class="error-text" data-testid="industry-name-de-error">
            {{ errors.nameDe }}
          </p>
        </div>
        <div class="field">
          <label for="ind-en">{{ t('admin.industries.nameEn') }}</label>
          <input
            id="ind-en"
            v-model="form.nameEn"
            type="text"
            maxlength="80"
            lang="en"
            :aria-invalid="!!errors.nameEn"
            data-testid="industry-name-en"
          />
          <p v-if="errors.nameEn" class="error-text" data-testid="industry-name-en-error">
            {{ errors.nameEn }}
          </p>
        </div>
      </div>
      <button type="submit" class="btn btn-primary-inline" data-testid="industry-create">
        {{ t('admin.industries.add') }}
      </button>
    </form>

    <div class="field search">
      <label for="ind-search">{{ t('admin.industries.search') }}</label>
      <input id="ind-search" v-model="search" type="search" data-testid="industry-search" />
    </div>
    <p class="hint" role="status" data-testid="industry-count">
      {{ t('admin.industries.count', { n: filtered.length, total: list.length }) }}
    </p>

    <ul class="row-list" data-testid="industry-list">
      <li v-if="filtered.length === 0" class="empty-text">{{ t('admin.industries.none') }}</li>
      <li v-for="i in filtered" :key="i.code" class="row-item" :data-testid="`industry-row-${i.code}`">
        <div v-if="edit.code === i.code" class="row-main edit">
          <p class="edit-title">
            <code class="code">{{ i.code }}</code> {{ t('admin.ai.edit') }}
          </p>
          <div class="field">
            <label :for="`ie-de-${i.code}`">{{ t('admin.industries.nameDe') }}</label>
            <input
              :id="`ie-de-${i.code}`"
              v-model="edit.nameDe"
              type="text"
              maxlength="80"
              lang="de"
              data-testid="industry-edit-de"
            />
          </div>
          <div class="field">
            <label :for="`ie-en-${i.code}`">{{ t('admin.industries.nameEn') }}</label>
            <input
              :id="`ie-en-${i.code}`"
              v-model="edit.nameEn"
              type="text"
              maxlength="80"
              lang="en"
              data-testid="industry-edit-en"
            />
          </div>
          <div class="field">
            <label :for="`ie-nace-${i.code}`">{{ t('admin.industries.nace') }}</label>
            <input
              :id="`ie-nace-${i.code}`"
              v-model="edit.naceRef"
              type="text"
              maxlength="60"
              data-testid="industry-edit-nace"
            />
          </div>
        </div>
        <div v-else class="row-main">
          <strong>
            <code class="code">{{ i.code }}</code> {{ primary(i) }}
          </strong>
          <span class="row-sub"
            >{{ secondary(i) }}<template v-if="i.naceRef"> · NACE {{ i.naceRef }}</template></span
          >
          <span class="row-sub tags">
            <span v-if="i.standard" class="tag" data-testid="industry-standard">{{
              t('admin.industries.standard')
            }}</span>
            <span v-else class="tag tag-warn" data-testid="industry-custom">{{
              t('admin.industries.custom')
            }}</span>
            <span v-if="!i.active" class="tag tag-error" data-testid="industry-inactive">{{
              t('status.inactive')
            }}</span>
            <span v-if="i.ownCompany" class="tag tag-ok" data-testid="industry-own">{{
              t('admin.industries.own')
            }}</span>
          </span>
        </div>
        <div class="row-actions">
          <template v-if="edit.code === i.code">
            <button
              type="button"
              class="btn btn-primary-inline"
              data-testid="industry-save"
              @click="saveEdit"
            >
              {{ t('common.save') }}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="industry-edit-cancel"
              @click="edit.code = null"
            >
              {{ t('common.cancel') }}
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn btn-ghost" data-testid="industry-edit" @click="startEdit(i)">
              {{ t('admin.ai.edit') }}
            </button>
            <button type="button" class="btn btn-ghost" data-testid="industry-toggle" @click="toggle(i)">
              {{ i.active ? t('admin.users.deactivate') : t('admin.users.activate') }}
            </button>
            <button
              v-if="!i.standard"
              type="button"
              class="btn btn-danger"
              data-testid="industry-delete"
              @click="toDelete = i"
            >
              {{ t('admin.users.delete') }}
            </button>
          </template>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="!!toDelete"
      danger
      :title="t('admin.industries.deleteTitle')"
      :text="
        toDelete ? t('admin.industries.deleteText', { code: toDelete.code, name: primary(toDelete) }) : ''
      "
      :confirm-label="t('admin.confirm.deleteConfirm')"
      @confirm="remove"
      @cancel="toDelete = null"
    />
  </div>
</template>

<style scoped>
.industries {
  max-width: 900px;
}
.search {
  max-width: 420px;
}
.code {
  font-size: 0.85rem;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 0 0.3rem;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.15rem;
}
.edit {
  display: grid;
  gap: 0 1rem;
  grid-template-columns: 1fr;
}
.edit-title {
  grid-column: 1 / -1;
  margin: 0 0 0.25rem;
  font-weight: 600;
}
.edit .field {
  margin-bottom: 0.5rem;
}
@media (min-width: 768px) {
  .edit {
    grid-template-columns: 1fr 1fr 160px;
  }
}
</style>
