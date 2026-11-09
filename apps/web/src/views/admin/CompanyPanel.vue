<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CompanyLogo from '../../components/CompanyLogo.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

interface Company {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoAlt: string | null;
  industryCode: string | null;
  benchmarkOptIn: boolean;
  domains: string[];
}
interface Industry {
  code: string;
  nameDe: string;
  nameEn: string;
}

const { t, locale } = useI18n();
const company = ref<Company | null>(null);
const industries = ref<Industry[]>([]);
const form = reactive({ name: '', logoUrl: '', logoAlt: '', industryCode: '', benchmarkOptIn: true });
const dom = useNotice('admin.company.domainErrors');
const newDomain = ref('');
const errors = reactive<{ logoUrl?: string; name?: string }>({});
const notice = ref<{ kind: 'info' | 'error'; text: string } | null>(null);
const loginUrl = () => `${window.location.origin}/login/${company.value?.slug ?? ''}`;

async function load() {
  const [c, i] = await Promise.all([
    apiGet<Company>('/api/admin/company'),
    apiGet<Industry[]>('/api/industries'),
  ]);
  company.value = c.data;
  industries.value = i.data ?? [];
  if (c.data)
    Object.assign(form, {
      name: c.data.name,
      logoUrl: c.data.logoUrl ?? '',
      logoAlt: c.data.logoAlt ?? '',
      industryCode: c.data.industryCode ?? '',
      benchmarkOptIn: c.data.benchmarkOptIn,
    });
}
onMounted(load);

function validUrl(v: string) {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

async function save() {
  notice.value = null;
  errors.name = form.name.trim().length >= 2 ? undefined : t('common.required');
  errors.logoUrl = form.logoUrl && !validUrl(form.logoUrl) ? t('admin.company.errors.logoUrl') : undefined;
  if (errors.name || errors.logoUrl) return;
  const res = await apiPatch('/api/admin/company', {
    name: form.name,
    logoUrl: form.logoUrl || null,
    logoAlt: form.logoAlt,
    benchmarkOptIn: form.benchmarkOptIn,
    ...(form.industryCode ? { industryCode: form.industryCode } : {}),
  });
  notice.value = res.ok
    ? { kind: 'info', text: t('common.saved') }
    : { kind: 'error', text: t('common.error') };
  if (res.ok) await load();
}

async function addDomain() {
  const domain = newDomain.value.trim().toLowerCase();
  if (!domain) return dom.error('domain_invalid');
  const res = await apiPost<{ domains: string[] }>('/api/admin/company/domains', { domain });
  if (!res.ok) return dom.error(res.error);
  dom.info(t('admin.company.domainAdded', { domain }));
  newDomain.value = '';
  if (company.value && res.data) company.value.domains = res.data.domains;
}

async function removeDomain(domain: string) {
  const res = await apiDelete<{ domains: string[] }>(
    `/api/admin/company/domains/${encodeURIComponent(domain)}`,
  );
  if (!res.ok) return dom.error(res.error);
  dom.info(t('admin.company.domainRemoved', { domain }));
  if (company.value && res.data) company.value.domains = res.data.domains;
}
</script>

<template>
  <div v-if="company" class="company">
    <form novalidate data-testid="company-panel" @submit.prevent="save">
      <div
        v-if="notice"
        :class="['alert', notice.kind === 'info' ? 'alert-info' : 'alert-error']"
        role="status"
        data-testid="company-notice"
      >
        {{ notice.text }}
      </div>
      <dl class="facts">
        <dt>{{ t('admin.company.slug') }}</dt>
        <dd data-testid="company-slug">{{ company.slug }}</dd>
        <dt>{{ t('admin.company.loginUrl') }}</dt>
        <dd>
          <code data-testid="company-login-url">{{ loginUrl() }}</code>
        </dd>
        <dt>{{ t('admin.company.domains') }}</dt>
        <dd data-testid="company-domains">{{ company.domains.join(', ') }}</dd>
      </dl>
      <div class="field">
        <label for="c-name">{{ t('admin.company.name') }}</label>
        <input
          id="c-name"
          v-model="form.name"
          type="text"
          :aria-invalid="!!errors.name"
          data-testid="company-name"
        />
        <p v-if="errors.name" class="error-text">{{ errors.name }}</p>
      </div>
      <div class="field">
        <label for="c-industry">{{ t('admin.company.industry') }}</label>
        <select id="c-industry" v-model="form.industryCode" data-testid="company-industry">
          <option v-for="i in industries" :key="i.code" :value="i.code">
            {{ locale === 'en' ? i.nameEn : i.nameDe }}
          </option>
        </select>
      </div>
      <div class="field">
        <label for="c-logo">{{ t('admin.company.logoUrl') }}</label>
        <input
          id="c-logo"
          v-model.trim="form.logoUrl"
          type="url"
          inputmode="url"
          placeholder="https://"
          :aria-invalid="!!errors.logoUrl"
          data-testid="company-logo-url"
        />
        <p v-if="errors.logoUrl" class="error-text" data-testid="company-logo-error">{{ errors.logoUrl }}</p>
      </div>
      <div class="field">
        <label for="c-alt">{{ t('admin.company.logoAlt') }}</label>
        <input id="c-alt" v-model="form.logoAlt" type="text" data-testid="company-logo-alt" />
      </div>
      <label class="check">
        <input v-model="form.benchmarkOptIn" type="checkbox" data-testid="company-benchmark" />
        {{ t('admin.company.benchmarkOptIn') }}
      </label>
      <p class="hint">{{ t('admin.company.benchmarkHint') }}</p>
      <div class="preview" data-testid="company-logo-preview">
        <span>{{ t('admin.company.preview') }}</span>
        <CompanyLogo :src="validUrl(form.logoUrl) ? form.logoUrl : null" :alt="form.logoAlt || form.name" />
      </div>
      <button type="submit" class="btn btn-primary-inline" data-testid="company-save">
        {{ t('common.save') }}
      </button>
    </form>

    <section class="card-flat domains" data-testid="company-domains-section">
      <h2>{{ t('admin.company.domains') }}</h2>
      <p class="hint">{{ t('admin.company.domainHint') }}</p>
      <NoticeBar :notice="dom.notice.value" testid="domain-notice" />
      <ul class="row-list">
        <li v-for="d in company.domains" :key="d" class="row-item" :data-testid="`domain-row-${d}`">
          <code>{{ d }}</code>
          <button
            type="button"
            class="btn btn-ghost btn-small"
            data-testid="domain-remove"
            @click="removeDomain(d)"
          >
            {{ t('admin.company.domainRemove') }}
          </button>
        </li>
      </ul>
      <form class="inline-form add-domain" novalidate @submit.prevent="addDomain">
        <div class="field">
          <label for="c-domain">{{ t('admin.company.domainNew') }}</label>
          <input
            id="c-domain"
            v-model="newDomain"
            type="text"
            inputmode="url"
            autocomplete="off"
            placeholder="firma.de"
            data-testid="domain-input"
          />
        </div>
        <button type="submit" class="btn btn-primary-inline" data-testid="domain-add">
          {{ t('admin.company.domainAdd') }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.company {
  max-width: 640px;
}
.domains {
  margin-top: 1.5rem;
}
.add-domain {
  margin-top: 0.75rem;
}
.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin: 0 0 1rem;
}
.facts dt {
  font-weight: 600;
}
.facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.preview span {
  color: var(--c-muted);
  font-size: 0.9rem;
}
</style>
