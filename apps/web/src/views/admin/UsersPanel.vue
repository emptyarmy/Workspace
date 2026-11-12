<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { emailSchema, ROLES, type Role } from '@ai-tpi/shared';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { useAuthStore } from '../../stores/auth';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'invited' | 'active' | 'inactive';
  isExternal: boolean;
  departmentId: string | null;
  lastLoginAt: string | null;
}
interface Department {
  id: string;
  name: string;
  active: boolean;
}

const { t, d } = useI18n();
const auth = useAuthStore();
const users = ref<AdminUser[]>([]);
const domains = ref<string[]>([]);
const departments = ref<Department[]>([]);
const form = reactive({ name: '', email: '', role: 'respondent' as Role, departmentId: '' });
const formErrors = reactive<{ name?: string; email?: string }>({});
const notice = ref<{ kind: 'info' | 'error'; text: string } | null>(null);
const confirm = ref<{ kind: 'delete' | 'reset'; user: AdminUser } | null>(null);

const others = computed(() => users.value.filter((u) => u.id !== auth.user?.id));
const me = computed(() => users.value.find((u) => u.id === auth.user?.id));
/** Auswahl: aktive Abteilungen sowie eine ggf. bereits zugeordnete inaktive. */
const departmentOptions = (current?: string | null) =>
  departments.value.filter((d) => d.active || d.id === current);
const departmentName = (id: string | null) => departments.value.find((d) => d.id === id)?.name;

async function load() {
  const [u, c, dep] = await Promise.all([
    apiGet<AdminUser[]>('/api/admin/users'),
    apiGet<{ domains: string[] }>('/api/admin/company'),
    apiGet<Department[]>('/api/admin/departments'),
  ]);
  users.value = u.data ?? [];
  domains.value = c.data?.domains ?? [];
  departments.value = dep.data ?? [];
}
onMounted(load);

function errorText(code?: string) {
  const known = [
    'email_domain',
    'email_taken',
    'self_protection',
    'last_admin',
    'user_inactive',
    'invalid_input',
  ];
  return code && known.includes(code) ? t(`admin.users.errors.${code}`) : t('common.error');
}
function show(kind: 'info' | 'error', text: string) {
  notice.value = { kind, text };
}

async function create() {
  formErrors.name = form.name.trim().length >= 2 ? undefined : t('common.required');
  formErrors.email = emailSchema.safeParse(form.email).success ? undefined : t('login.errors.emailInvalid');
  if (formErrors.name || formErrors.email) return;
  const res = await apiPost<AdminUser>('/api/admin/users', {
    ...form,
    departmentId: form.departmentId || null,
  });
  if (res.ok) {
    show('info', t('admin.users.created'));
    Object.assign(form, { name: '', email: '', role: 'respondent', departmentId: '' });
    await load();
  } else show('error', errorText(res.error));
}

async function update(u: AdminUser, patch: Record<string, unknown>) {
  const res = await apiPatch<AdminUser>(`/api/admin/users/${u.id}`, patch);
  if (res.ok) show('info', t('admin.users.updated'));
  else show('error', errorText(res.error));
  await load();
}

/** Name und E-Mail bearbeiten (TC-USR-003/004). */
const editing = reactive<{ id: string | null; name: string; email: string; error?: string }>({
  id: null,
  name: '',
  email: '',
});
function startEdit(u: AdminUser) {
  Object.assign(editing, { id: u.id, name: u.name, email: u.email, error: undefined });
}
async function saveEdit(u: AdminUser) {
  editing.error =
    editing.name.trim().length < 2
      ? t('common.required')
      : !emailSchema.safeParse(editing.email).success
        ? t('login.errors.emailInvalid')
        : undefined;
  if (editing.error) return;
  const patch: Record<string, unknown> = {};
  if (editing.name.trim() !== u.name) patch.name = editing.name.trim();
  if (editing.email.trim().toLowerCase() !== u.email.toLowerCase()) patch.email = editing.email.trim();
  if (Object.keys(patch).length) {
    const res = await apiPatch<AdminUser>(`/api/admin/users/${u.id}`, patch);
    if (!res.ok) return show('error', errorText(res.error));
    show('info', t('admin.users.updated'));
  }
  editing.id = null;
  await load();
}

/** Notfallweg (TC-ADM-017): Anmeldelink der Firma anzeigen und kopieren, falls die Einladungs-Mail nicht ankommt. */
const loginLink = computed(() => `${window.location.origin}/login/${auth.user?.companySlug ?? ''}`);
async function copyLink() {
  let copied = false;
  try {
    await navigator.clipboard.writeText(loginLink.value);
    copied = true;
  } catch {
    copied = false;
  }
  show('info', t(copied ? 'admin.users.linkCopied' : 'admin.users.linkShown', { link: loginLink.value }));
}

async function resendInvite(u: AdminUser) {
  const res = await apiPost(`/api/admin/users/${u.id}/invitation`);
  show(res.ok ? 'info' : 'error', res.ok ? t('admin.users.inviteSent') : errorText(res.error));
}

async function confirmed() {
  const c = confirm.value;
  confirm.value = null;
  if (!c) return;
  const res =
    c.kind === 'delete'
      ? await apiDelete(`/api/admin/users/${c.user.id}`)
      : await apiPost(`/api/admin/users/${c.user.id}/password-reset`);
  if (res.ok) show('info', t(c.kind === 'delete' ? 'admin.users.deleted' : 'admin.users.resetSent'));
  else show('error', errorText(res.error));
  await load();
}
</script>

<template>
  <div data-testid="users-panel">
    <div
      v-if="notice"
      :class="['alert', notice.kind === 'info' ? 'alert-info' : 'alert-error']"
      role="status"
      data-testid="admin-notice"
    >
      {{ notice.text }}
    </div>

    <form class="create card-flat" novalidate data-testid="user-create-form" @submit.prevent="create">
      <h2>{{ t('admin.users.create') }}</h2>
      <p class="hint" data-testid="domain-hint">
        {{ t('admin.users.domainHint', { domains: domains.join(', ') }) }}
      </p>
      <div class="grid">
        <div class="field">
          <label for="u-name">{{ t('admin.users.name') }}</label>
          <input
            id="u-name"
            v-model="form.name"
            type="text"
            :aria-invalid="!!formErrors.name"
            data-testid="user-name"
          />
          <p v-if="formErrors.name" class="error-text">{{ formErrors.name }}</p>
        </div>
        <div class="field">
          <label for="u-email">{{ t('admin.users.email') }}</label>
          <input
            id="u-email"
            v-model="form.email"
            type="email"
            :aria-invalid="!!formErrors.email"
            data-testid="user-email"
          />
          <p v-if="formErrors.email" class="error-text" data-testid="user-email-error">
            {{ formErrors.email }}
          </p>
        </div>
        <div class="field">
          <label for="u-role">{{ t('admin.users.role') }}</label>
          <select id="u-role" v-model="form.role" data-testid="user-role">
            <option v-for="r in ROLES" :key="r" :value="r">{{ t(`roles.${r}`) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="u-dep">{{ t('admin.users.department') }}</label>
          <select id="u-dep" v-model="form.departmentId" data-testid="user-department">
            <option value="">{{ t('admin.users.noDepartment') }}</option>
            <option v-for="dp in departmentOptions()" :key="dp.id" :value="dp.id">{{ dp.name }}</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary-inline" data-testid="user-create">
        {{ t('admin.users.add') }}
      </button>
    </form>

    <ul class="user-list" data-testid="user-list">
      <li v-if="me" class="user-row self" :data-testid="`user-row-${me.email}`">
        <div class="who">
          <strong>{{ me.name }}</strong> <span class="pill">{{ t('admin.users.you') }}</span>
          <span class="mail">{{ me.email }}</span>
        </div>
        <span class="pill role">{{ t(`roles.${me.role}`) }}</span>
      </li>
      <li v-if="others.length === 0" class="empty">{{ t('admin.users.empty') }}</li>
      <li v-for="u in others" :key="u.id" class="user-row" :data-testid="`user-row-${u.email}`">
        <div class="who">
          <template v-if="editing.id === u.id">
            <label class="sr-only" :for="`edit-name-${u.id}`">{{ t('admin.users.name') }}</label>
            <input
              :id="`edit-name-${u.id}`"
              v-model="editing.name"
              type="text"
              data-testid="user-edit-name"
            />
            <label class="sr-only" :for="`edit-email-${u.id}`">{{ t('admin.users.email') }}</label>
            <input
              :id="`edit-email-${u.id}`"
              v-model.trim="editing.email"
              type="email"
              data-testid="user-edit-email"
            />
            <p v-if="editing.error" class="error-text" data-testid="user-edit-error">{{ editing.error }}</p>
            <span class="edit-buttons">
              <button
                type="button"
                class="btn btn-primary-inline"
                data-testid="user-edit-save"
                @click="saveEdit(u)"
              >
                {{ t('common.save') }}
              </button>
              <button type="button" class="btn btn-ghost" @click="editing.id = null">
                {{ t('common.cancel') }}
              </button>
            </span>
          </template>
          <strong v-else>{{ u.name }}</strong>
          <span v-if="u.isExternal" class="pill ext" data-testid="badge-external">{{
            t('common.external')
          }}</span>
          <span v-if="editing.id !== u.id" class="mail">{{ u.email }}</span>
          <span class="meta">
            <span :class="['pill', 'st-' + u.status]" data-testid="user-status">{{
              t(`status.${u.status}`)
            }}</span>
            {{ t('admin.users.lastLogin') }}:
            {{ u.lastLoginAt ? d(new Date(u.lastLoginAt), 'short') : t('admin.users.never') }}
            <template v-if="departmentName(u.departmentId)">
              · <span data-testid="user-department-name">{{ departmentName(u.departmentId) }}</span>
            </template>
          </span>
        </div>
        <div class="actions">
          <label class="sr-only" :for="`role-${u.id}`">{{ t('admin.users.role') }}</label>
          <select
            :id="`role-${u.id}`"
            :value="u.role"
            data-testid="user-row-role"
            @change="update(u, { role: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="r in ROLES" :key="r" :value="r">{{ t(`roles.${r}`) }}</option>
          </select>
          <label class="sr-only" :for="`dep-${u.id}`">{{ t('admin.users.department') }}</label>
          <select
            v-if="departments.length"
            :id="`dep-${u.id}`"
            :value="u.departmentId ?? ''"
            data-testid="user-row-department"
            @change="update(u, { departmentId: ($event.target as HTMLSelectElement).value || null })"
          >
            <option value="">{{ t('admin.users.noDepartment') }}</option>
            <option v-for="dp in departmentOptions(u.departmentId)" :key="dp.id" :value="dp.id">
              {{ dp.name }}
            </option>
          </select>
          <button
            type="button"
            class="btn btn-ghost"
            data-testid="user-toggle-active"
            @click="update(u, { active: u.status === 'inactive' })"
          >
            {{ u.status === 'inactive' ? t('admin.users.activate') : t('admin.users.deactivate') }}
          </button>
          <button
            v-if="editing.id !== u.id"
            type="button"
            class="btn btn-ghost"
            data-testid="user-edit"
            @click="startEdit(u)"
          >
            {{ t('admin.users.edit') }}
          </button>
          <button
            v-if="u.status === 'invited'"
            type="button"
            class="btn btn-ghost"
            data-testid="user-copy-link"
            @click="copyLink"
          >
            {{ t('admin.users.copyLink') }}
          </button>
          <button
            v-if="u.status === 'invited'"
            type="button"
            class="btn btn-ghost"
            data-testid="user-resend"
            @click="resendInvite(u)"
          >
            {{ t('admin.users.resendInvite') }}
          </button>
          <button
            v-if="u.status !== 'inactive'"
            type="button"
            class="btn btn-ghost"
            data-testid="user-reset"
            @click="confirm = { kind: 'reset', user: u }"
          >
            {{ t('admin.users.resetPassword') }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            data-testid="user-delete"
            @click="confirm = { kind: 'delete', user: u }"
          >
            {{ t('admin.users.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="!!confirm"
      :danger="confirm?.kind === 'delete'"
      :title="confirm?.kind === 'delete' ? t('admin.confirm.deleteTitle') : t('admin.confirm.resetTitle')"
      :text="
        confirm
          ? confirm.kind === 'delete'
            ? t('admin.confirm.deleteText', { name: confirm.user.name, email: confirm.user.email })
            : t('admin.confirm.resetText', { name: confirm.user.name })
          : ''
      "
      :confirm-label="
        confirm?.kind === 'delete' ? t('admin.confirm.deleteConfirm') : t('admin.confirm.resetConfirm')
      "
      @confirm="confirmed"
      @cancel="confirm = null"
    />
  </div>
</template>

<style scoped>
.card-flat {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
}
h2 {
  font-size: 1.15rem;
  margin: 0 0 0.25rem;
}
.hint {
  margin: 0 0 0.75rem;
  color: var(--c-muted);
  font-size: 0.9rem;
}
.grid {
  display: grid;
  gap: 0 1rem;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (min-width: 1100px) {
  .grid {
    grid-template-columns: 1fr 1fr 180px 200px;
  }
}
.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
.user-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0.75rem;
}
.who {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1 1 240px;
}
.mail {
  color: var(--c-muted);
  overflow-wrap: anywhere;
}
.meta {
  font-size: 0.85rem;
  color: var(--c-muted);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.actions .btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.9rem;
}
.pill {
  display: inline-block;
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  width: fit-content;
}
.ext {
  background: #fff4e5;
  border-color: #f0b46b;
  color: #7a4300;
}
.st-active {
  background: var(--c-ok-bg);
  color: var(--c-ok);
}
.st-inactive {
  background: var(--c-error-bg);
  color: var(--c-error);
}
.empty {
  color: var(--c-muted);
  padding: 0.5rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.edit-buttons {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.4rem;
}
</style>
