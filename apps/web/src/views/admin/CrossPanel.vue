<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { companySlugSchema, emailSchema, type Role } from '@ai-tpi/shared';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet, apiPatch, apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';
import { slugify } from '../../utils/slug';

interface OtherCompany {
  id: string;
  name: string;
  slug: string;
}
interface CreatedAdmin {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'invited' | 'active' | 'inactive';
  companyName: string;
  companySlug: string;
}
interface Industry {
  code: string;
  nameDe: string;
  nameEn: string;
}
interface ResetQuota {
  limit: number;
  used: number;
  remaining: number;
}

const { t, locale } = useI18n();
const ERR = 'admin.cross.errors';
const msgNew = useNotice(ERR);
const msgExisting = useNotice(ERR);
const msgList = useNotice(ERR);
const msgReset = useNotice(ERR);

const companies = ref<OtherCompany[]>([]);
const created = ref<CreatedAdmin[]>([]);
const industries = ref<Industry[]>([]);
const quota = ref<ResetQuota | null>(null);

const nc = reactive({
  name: '',
  slug: '',
  domains: '',
  industryCode: '',
  logoUrl: '',
  adminName: '',
  adminEmail: '',
});
const ncErrors = reactive<Record<string, string | undefined>>({});
const slugTouched = ref(false);
watch(
  () => nc.name,
  (v) => {
    if (!slugTouched.value) nc.slug = slugify(v);
  },
);
/** Domain der Admin-Adresse als Vorschlag für die Firmen-Domain. */
watch(
  () => nc.adminEmail,
  (v) => {
    const d = v.split('@')[1];
    if (d && !nc.domains) nc.domains = d.toLowerCase();
  },
);

const ex = reactive({ companyId: '', name: '', email: '' });
const exErrors = reactive<Record<string, string | undefined>>({});

const resetEmail = ref('');
const resetError = ref<string>();
const confirm = ref<
  { kind: 'reset-created'; admin: CreatedAdmin } | { kind: 'reset-email'; email: string } | null
>(null);

const domainList = computed(() =>
  nc.domains
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
);

async function load() {
  const [c, a, i, q] = await Promise.all([
    apiGet<OtherCompany[]>('/api/admin/companies'),
    apiGet<CreatedAdmin[]>('/api/admin/created-admins'),
    apiGet<Industry[]>('/api/industries'),
    apiGet<ResetQuota>('/api/admin/cross-password-reset'),
  ]);
  companies.value = c.data ?? [];
  created.value = a.data ?? [];
  industries.value = i.data ?? [];
  quota.value = q.data;
}
onMounted(load);

const required = (v: string, min = 2) => (v.trim().length >= min ? undefined : t('common.required'));
const validEmail = (v: string) =>
  emailSchema.safeParse(v).success ? undefined : t('login.errors.emailInvalid');

async function createCompany() {
  msgNew.clear();
  Object.assign(ncErrors, {
    name: required(nc.name),
    slug: companySlugSchema.safeParse(nc.slug).success ? undefined : t('setup.errors.slug'),
    domains: domainList.value.length ? undefined : t('common.required'),
    industryCode: nc.industryCode ? undefined : t('common.required'),
    logoUrl:
      nc.logoUrl && !nc.logoUrl.toLowerCase().startsWith('https://')
        ? t('admin.company.errors.logoUrl')
        : undefined,
    adminName: required(nc.adminName),
    adminEmail: validEmail(nc.adminEmail),
  });
  if (Object.values(ncErrors).some(Boolean)) return;
  const res = await apiPost<{ domain?: string }>('/api/admin/companies', {
    company: {
      name: nc.name.trim(),
      slug: nc.slug,
      domains: domainList.value,
      industryCode: nc.industryCode,
      ...(nc.logoUrl ? { logoUrl: nc.logoUrl } : {}),
    },
    admin: { name: nc.adminName.trim(), email: nc.adminEmail },
  });
  if (!res.ok) return msgNew.error(res.error);
  msgNew.info(t('admin.cross.companyCreated', { company: nc.name, email: nc.adminEmail }));
  Object.assign(nc, {
    name: '',
    slug: '',
    domains: '',
    industryCode: '',
    logoUrl: '',
    adminName: '',
    adminEmail: '',
  });
  slugTouched.value = false;
  await load();
}

async function createExistingAdmin() {
  msgExisting.clear();
  Object.assign(exErrors, {
    companyId: ex.companyId ? undefined : t('common.required'),
    name: required(ex.name),
    email: validEmail(ex.email),
  });
  if (Object.values(exErrors).some(Boolean)) return;
  const res = await apiPost(`/api/admin/companies/${ex.companyId}/admins`, {
    name: ex.name.trim(),
    email: ex.email,
  });
  if (!res.ok) return msgExisting.error(res.error);
  msgExisting.info(t('admin.cross.adminCreated', { email: ex.email }));
  Object.assign(ex, { companyId: '', name: '', email: '' });
  await load();
}

async function updateCreated(a: CreatedAdmin, patch: Record<string, unknown>) {
  const res = await apiPatch(`/api/admin/created-admins/${a.id}`, patch);
  if (res.ok) msgList.info(t('admin.users.updated'));
  else msgList.error(res.error);
  await load();
}

async function resendCreated(a: CreatedAdmin) {
  const res = await apiPost(`/api/admin/created-admins/${a.id}/invitation`);
  if (res.ok) msgList.info(t('admin.users.inviteSent'));
  else msgList.error(res.error);
}

function askResetByEmail() {
  msgReset.clear();
  resetError.value = validEmail(resetEmail.value);
  if (resetError.value) return;
  confirm.value = { kind: 'reset-email', email: resetEmail.value.trim() };
}

async function confirmed() {
  const c = confirm.value;
  confirm.value = null;
  if (!c) return;
  if (c.kind === 'reset-created') {
    const res = await apiPost(`/api/admin/created-admins/${c.admin.id}/password-reset`);
    if (res.ok) msgList.info(t('admin.users.resetSent'));
    else msgList.error(res.error);
  } else {
    const res = await apiPost('/api/admin/cross-password-reset', { email: c.email });
    if (res.ok) {
      msgReset.info(t('admin.cross.resetAccepted'));
      resetEmail.value = '';
    } else msgReset.error(res.error);
  }
  await load();
}

const industryName = (i: Industry) => (locale.value === 'en' ? i.nameEn : i.nameDe);
</script>

<template>
  <div data-testid="cross-panel">
    <p class="hint">{{ t('admin.cross.intro') }}</p>

    <!-- (a) Neue Firma + Admin -->
    <form class="card-flat" novalidate data-testid="cross-new-company-form" @submit.prevent="createCompany">
      <h2>{{ t('admin.cross.newCompany') }}</h2>
      <p class="hint">{{ t('admin.cross.newCompanyHint') }}</p>
      <NoticeBar :notice="msgNew.notice.value" testid="cross-new-notice" />
      <fieldset>
        <legend>{{ t('admin.cross.company') }}</legend>
        <div class="form-grid">
          <div class="field">
            <label for="nc-name">{{ t('admin.company.name') }}</label>
            <input
              id="nc-name"
              v-model="nc.name"
              type="text"
              :aria-invalid="!!ncErrors.name"
              data-testid="nc-name"
            />
            <p v-if="ncErrors.name" class="error-text">{{ ncErrors.name }}</p>
          </div>
          <div class="field">
            <label for="nc-slug">{{ t('admin.company.slug') }}</label>
            <input
              id="nc-slug"
              v-model="nc.slug"
              type="text"
              autocomplete="off"
              :aria-invalid="!!ncErrors.slug"
              data-testid="nc-slug"
              @input="slugTouched = true"
            />
            <p v-if="ncErrors.slug" class="error-text" data-testid="nc-slug-error">{{ ncErrors.slug }}</p>
          </div>
          <div class="field">
            <label for="nc-domains">{{ t('admin.cross.domains') }}</label>
            <input
              id="nc-domains"
              v-model="nc.domains"
              type="text"
              autocomplete="off"
              placeholder="firma.de, firma.com"
              :aria-invalid="!!ncErrors.domains"
              data-testid="nc-domains"
            />
            <p v-if="ncErrors.domains" class="error-text">{{ ncErrors.domains }}</p>
          </div>
          <div class="field">
            <label for="nc-industry">{{ t('admin.company.industry') }}</label>
            <select
              id="nc-industry"
              v-model="nc.industryCode"
              :aria-invalid="!!ncErrors.industryCode"
              data-testid="nc-industry"
            >
              <option value="" disabled>{{ t('admin.cross.choose') }}</option>
              <option v-for="i in industries" :key="i.code" :value="i.code">{{ industryName(i) }}</option>
            </select>
            <p v-if="ncErrors.industryCode" class="error-text">{{ ncErrors.industryCode }}</p>
          </div>
          <div class="field span-2">
            <label for="nc-logo">{{ t('admin.cross.logoOptional') }}</label>
            <input
              id="nc-logo"
              v-model.trim="nc.logoUrl"
              type="url"
              inputmode="url"
              placeholder="https://"
              :aria-invalid="!!ncErrors.logoUrl"
              data-testid="nc-logo"
            />
            <p v-if="ncErrors.logoUrl" class="error-text">{{ ncErrors.logoUrl }}</p>
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>{{ t('admin.cross.firstAdmin') }}</legend>
        <div class="form-grid">
          <div class="field">
            <label for="nc-admin-name">{{ t('admin.users.name') }}</label>
            <input
              id="nc-admin-name"
              v-model="nc.adminName"
              type="text"
              :aria-invalid="!!ncErrors.adminName"
              data-testid="nc-admin-name"
            />
            <p v-if="ncErrors.adminName" class="error-text">{{ ncErrors.adminName }}</p>
          </div>
          <div class="field">
            <label for="nc-admin-email">{{ t('admin.users.email') }}</label>
            <input
              id="nc-admin-email"
              v-model.trim="nc.adminEmail"
              type="email"
              :aria-invalid="!!ncErrors.adminEmail"
              data-testid="nc-admin-email"
            />
            <p v-if="ncErrors.adminEmail" class="error-text" data-testid="nc-admin-email-error">
              {{ ncErrors.adminEmail }}
            </p>
          </div>
        </div>
      </fieldset>
      <button type="submit" class="btn btn-primary-inline" data-testid="nc-submit">
        {{ t('admin.cross.createCompany') }}
      </button>
    </form>

    <!-- (b) Admin für bestehende Firma -->
    <form
      class="card-flat"
      novalidate
      data-testid="cross-existing-form"
      @submit.prevent="createExistingAdmin"
    >
      <h2>{{ t('admin.cross.existingCompany') }}</h2>
      <p class="hint">{{ t('admin.cross.existingHint') }}</p>
      <NoticeBar :notice="msgExisting.notice.value" testid="cross-existing-notice" />
      <p v-if="companies.length === 0" class="empty-text" data-testid="cross-no-companies">
        {{ t('admin.cross.noCompanies') }}
      </p>
      <div v-else class="form-grid">
        <div class="field span-2">
          <label for="ex-company">{{ t('admin.cross.company') }}</label>
          <select
            id="ex-company"
            v-model="ex.companyId"
            :aria-invalid="!!exErrors.companyId"
            data-testid="ex-company"
          >
            <option value="" disabled>{{ t('admin.cross.choose') }}</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }} ({{ c.slug }})</option>
          </select>
          <p v-if="exErrors.companyId" class="error-text">{{ exErrors.companyId }}</p>
        </div>
        <div class="field">
          <label for="ex-name">{{ t('admin.users.name') }}</label>
          <input
            id="ex-name"
            v-model="ex.name"
            type="text"
            :aria-invalid="!!exErrors.name"
            data-testid="ex-name"
          />
          <p v-if="exErrors.name" class="error-text">{{ exErrors.name }}</p>
        </div>
        <div class="field">
          <label for="ex-email">{{ t('admin.users.email') }}</label>
          <input
            id="ex-email"
            v-model.trim="ex.email"
            type="email"
            :aria-invalid="!!exErrors.email"
            data-testid="ex-email"
          />
          <p v-if="exErrors.email" class="error-text">{{ exErrors.email }}</p>
        </div>
      </div>
      <button v-if="companies.length" type="submit" class="btn btn-primary-inline" data-testid="ex-submit">
        {{ t('admin.cross.createAdmin') }}
      </button>
    </form>

    <!-- Von mir angelegte Admins (M4) -->
    <section class="card-flat" data-testid="created-admins">
      <h2>{{ t('admin.cross.createdAdmins') }}</h2>
      <p class="hint">{{ t('admin.cross.createdHint') }}</p>
      <NoticeBar :notice="msgList.notice.value" testid="created-notice" />
      <ul class="row-list">
        <li v-if="created.length === 0" class="empty-text">{{ t('admin.cross.noCreated') }}</li>
        <li v-for="a in created" :key="a.id" class="row-item" :data-testid="`created-row-${a.email}`">
          <div class="row-main">
            <strong>{{ a.name }}</strong>
            <span class="row-sub">{{ a.email }} · {{ a.companyName }} ({{ a.companySlug }})</span>
            <span class="row-sub">
              <span
                :class="[
                  'tag',
                  a.status === 'active' ? 'tag-ok' : a.status === 'inactive' ? 'tag-error' : '',
                ]"
                data-testid="created-status"
                >{{ t(`status.${a.status}`) }}</span
              >
            </span>
          </div>
          <div class="row-actions">
            <label class="visually-hidden" :for="`cr-role-${a.id}`">{{ t('admin.users.role') }}</label>
            <select
              :id="`cr-role-${a.id}`"
              :value="a.role"
              data-testid="created-role"
              @change="updateCreated(a, { role: ($event.target as HTMLSelectElement).value })"
            >
              <option value="admin" disabled>{{ t('roles.admin') }}</option>
              <option value="assessor">{{ t('roles.assessor') }}</option>
              <option value="respondent">{{ t('roles.respondent') }}</option>
              <option value="reader">{{ t('roles.reader') }}</option>
            </select>
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="created-toggle"
              @click="updateCreated(a, { active: a.status === 'inactive' })"
            >
              {{ a.status === 'inactive' ? t('admin.users.activate') : t('admin.users.deactivate') }}
            </button>
            <button
              v-if="a.status === 'invited'"
              type="button"
              class="btn btn-ghost"
              data-testid="created-resend"
              @click="resendCreated(a)"
            >
              {{ t('admin.users.resendInvite') }}
            </button>
            <button
              v-if="a.status !== 'inactive'"
              type="button"
              class="btn btn-ghost"
              data-testid="created-reset"
              @click="confirm = { kind: 'reset-created', admin: a }"
            >
              {{ t('admin.users.resetPassword') }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Passwort für Nutzer einer anderen Firma (S-10, S-14, S-15) -->
    <form class="card-flat" novalidate data-testid="cross-reset-form" @submit.prevent="askResetByEmail">
      <h2>{{ t('admin.cross.resetTitle') }}</h2>
      <p class="hint">{{ t('admin.cross.resetHint') }}</p>
      <p v-if="quota" class="hint" data-testid="cross-reset-quota">
        {{ t('admin.cross.quota', { remaining: quota.remaining, limit: quota.limit }) }}
      </p>
      <NoticeBar :notice="msgReset.notice.value" testid="cross-reset-notice" />
      <div class="inline-form">
        <div class="field">
          <label for="cr-email">{{ t('admin.users.email') }}</label>
          <input
            id="cr-email"
            v-model.trim="resetEmail"
            type="email"
            autocomplete="off"
            :aria-invalid="!!resetError"
            data-testid="cross-reset-email"
          />
          <p v-if="resetError" class="error-text" data-testid="cross-reset-email-error">{{ resetError }}</p>
        </div>
        <button
          type="submit"
          class="btn btn-primary-inline"
          :disabled="quota?.remaining === 0"
          data-testid="cross-reset-submit"
        >
          {{ t('admin.users.resetPassword') }}
        </button>
      </div>
    </form>

    <ConfirmDialog
      :open="!!confirm"
      :title="t('admin.confirm.resetTitle')"
      :text="
        confirm
          ? confirm.kind === 'reset-created'
            ? t('admin.confirm.resetText', { name: confirm.admin.name })
            : t('admin.cross.resetConfirmText', { email: confirm.email })
          : ''
      "
      :confirm-label="t('admin.confirm.resetConfirm')"
      @confirm="confirmed"
      @cancel="confirm = null"
    />
  </div>
</template>
