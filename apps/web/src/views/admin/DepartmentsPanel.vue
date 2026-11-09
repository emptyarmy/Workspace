<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

interface Department {
  id: string;
  name: string;
  active: boolean;
  userCount: number;
}

const { t } = useI18n();
const { notice, info, error } = useNotice('admin.departments.errors');
const list = ref<Department[]>([]);
const newName = ref('');
const newError = ref<string>();
const editing = reactive<Record<string, string>>({});
const toDelete = ref<Department | null>(null);

async function load() {
  list.value = (await apiGet<Department[]>('/api/admin/departments')).data ?? [];
}
onMounted(load);

async function create() {
  newError.value = newName.value.trim().length >= 2 ? undefined : t('admin.departments.errors.name');
  if (newError.value) return;
  const res = await apiPost('/api/admin/departments', { name: newName.value.trim() });
  if (!res.ok) return error(res.error);
  info(t('admin.departments.created'));
  newName.value = '';
  await load();
}

async function rename(d: Department) {
  const name = (editing[d.id] ?? '').trim();
  if (name.length < 2) return error('name');
  const res = await apiPatch(`/api/admin/departments/${d.id}`, { name });
  if (!res.ok) return error(res.error);
  delete editing[d.id];
  info(t('common.saved'));
  await load();
}

async function toggle(d: Department) {
  const res = await apiPatch(`/api/admin/departments/${d.id}`, { active: !d.active });
  if (!res.ok) return error(res.error);
  info(t('common.saved'));
  await load();
}

async function remove() {
  const d = toDelete.value;
  toDelete.value = null;
  if (!d) return;
  const res = await apiDelete(`/api/admin/departments/${d.id}`);
  if (!res.ok) return error(res.error);
  info(t('admin.departments.deleted'));
  await load();
}
</script>

<template>
  <div data-testid="departments-panel">
    <NoticeBar :notice="notice" />
    <form class="card-flat" novalidate data-testid="department-create-form" @submit.prevent="create">
      <h2>{{ t('admin.departments.create') }}</h2>
      <p class="hint">{{ t('admin.departments.hint') }}</p>
      <div class="inline-form">
        <div class="field">
          <label for="dep-name">{{ t('admin.departments.name') }}</label>
          <input
            id="dep-name"
            v-model="newName"
            type="text"
            maxlength="80"
            :aria-invalid="!!newError"
            data-testid="department-name"
          />
          <p v-if="newError" class="error-text" data-testid="department-name-error">{{ newError }}</p>
        </div>
        <button type="submit" class="btn btn-primary-inline" data-testid="department-create">
          {{ t('admin.departments.add') }}
        </button>
      </div>
    </form>

    <ul class="row-list" data-testid="department-list">
      <li v-if="list.length === 0" class="empty-text">{{ t('admin.departments.empty') }}</li>
      <li v-for="d in list" :key="d.id" class="row-item" :data-testid="`department-row-${d.name}`">
        <div class="row-main">
          <template v-if="editing[d.id] !== undefined">
            <label class="visually-hidden" :for="`dep-edit-${d.id}`">{{ t('admin.departments.name') }}</label>
            <input
              :id="`dep-edit-${d.id}`"
              v-model="editing[d.id]"
              type="text"
              maxlength="80"
              data-testid="department-edit-input"
              @keydown.enter.prevent="rename(d)"
            />
          </template>
          <strong v-else>{{ d.name }}</strong>
          <span class="row-sub">
            <span :class="['tag', d.active ? 'tag-ok' : 'tag-error']" data-testid="department-status">{{
              d.active ? t('status.active') : t('status.inactive')
            }}</span>
            {{ t('admin.departments.users', { n: d.userCount }) }}
          </span>
        </div>
        <div class="row-actions">
          <template v-if="editing[d.id] !== undefined">
            <button
              type="button"
              class="btn btn-primary-inline"
              data-testid="department-save"
              @click="rename(d)"
            >
              {{ t('common.save') }}
            </button>
            <button type="button" class="btn btn-ghost" @click="delete editing[d.id]">
              {{ t('common.cancel') }}
            </button>
          </template>
          <button
            v-else
            type="button"
            class="btn btn-ghost"
            data-testid="department-edit"
            @click="editing[d.id] = d.name"
          >
            {{ t('admin.departments.rename') }}
          </button>
          <button type="button" class="btn btn-ghost" data-testid="department-toggle" @click="toggle(d)">
            {{ d.active ? t('admin.users.deactivate') : t('admin.users.activate') }}
          </button>
          <button type="button" class="btn btn-danger" data-testid="department-delete" @click="toDelete = d">
            {{ t('admin.users.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="!!toDelete"
      danger
      :title="t('admin.departments.deleteTitle')"
      :text="toDelete ? t('admin.departments.deleteText', { name: toDelete.name }) : ''"
      :confirm-label="t('admin.confirm.deleteConfirm')"
      @confirm="remove"
      @cancel="toDelete = null"
    />
  </div>
</template>
