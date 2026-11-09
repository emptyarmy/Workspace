<script setup lang="ts">
import { slugify } from '../utils/slug';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { companySlugSchema, emailSchema, userInputsFrom, type PasswordAssessment } from '@ai-tpi/shared';
import PasswordField from '../components/PasswordField.vue';
import { apiGet, apiPost } from '../api/client';
import { useAuthStore } from '../stores/auth';

/** Ersteinrichtung: erster Nutzer (nur über localhost) wird Admin und legt seine Firma an (R-06, M7). */
interface Industry {
  code: string;
  nameDe: string;
  nameEn: string;
}
const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const state = ref<'loading' | 'available' | 'unavailable' | 'error'>('loading');
const errorStatus = ref(0);
const industries = ref<Industry[]>([]);
const form = reactive({
  companyName: '',
  companySlug: '',
  industryCode: '',
  name: '',
  email: '',
  password: '',
  passwordRepeat: '',
});
const slugTouched = ref(false);
const assessment = ref<PasswordAssessment | null>(null);
const errors = reactive<Record<string, string | undefined>>({});
const message = ref<string | null>(null);
const busy = ref(false);

onMounted(async () => {
  const res = await apiGet<{ available: boolean; industries: Industry[] }>('/api/setup/status');
  if (res.ok && res.data) {
    industries.value = res.data.industries;
    state.value = 'available';
  } else if (res.status === 404) {
    // Bewusst ohne Unterscheidung (R-06): bereits eingerichtet, nicht über localhost oder abgeschaltet.
    state.value = 'unavailable';
  } else {
    // Server nicht erreichbar (0), Datenbank nicht verfügbar (503) oder interner Fehler (500).
    errorStatus.value = res.status;
    state.value = 'error';
  }
});

watch(
  () => form.companyName,
  (n) => {
    if (slugTouched.value) return;
    form.companySlug = slugify(n);
  },
);

const userInputs = computed(() => userInputsFrom([form.name, form.email, form.companyName]));
const canSubmit = computed(
  () => !busy.value && !!assessment.value?.acceptable && form.password === form.passwordRepeat,
);

function validate(): boolean {
  errors.companyName = form.companyName.trim().length >= 2 ? undefined : t('common.required');
  errors.companySlug = companySlugSchema.safeParse(form.companySlug).success
    ? undefined
    : t('setup.errors.slug');
  errors.industryCode = form.industryCode ? undefined : t('common.required');
  errors.name = form.name.trim().length >= 2 ? undefined : t('common.required');
  errors.email = emailSchema.safeParse(form.email).success ? undefined : t('login.errors.emailInvalid');
  return !Object.values(errors).some(Boolean);
}

async function submit() {
  message.value = null;
  if (!validate() || !canSubmit.value) return;
  busy.value = true;
  const res = await apiPost('/api/setup', form);
  busy.value = false;
  if (res.ok) {
    await auth.refresh();
    await router.push('/admin');
    return;
  }
  const known = ['domain_blocked', 'conflict', 'invalid_input'];
  message.value = res.error && known.includes(res.error) ? t(`setup.errors.${res.error}`) : t('common.error');
}
</script>

<template>
  <section class="card wide" data-testid="setup-card">
    <h1>{{ t('setup.heading') }}</h1>
    <p v-if="state === 'unavailable'" class="alert alert-error" role="alert" data-testid="setup-unavailable">
      {{ t('setup.unavailable') }}
    </p>
    <div v-if="state === 'error'" class="alert alert-error" role="alert" data-testid="setup-error">
      <p class="err-title">
        {{ errorStatus === 0 ? t('setup.serverDown') : t('setup.serverError', { status: errorStatus }) }}
      </p>
      <p>{{ t('setup.serverHint') }}</p>
    </div>
    <template v-else-if="state === 'available'">
      <p>{{ t('setup.intro') }}</p>
      <div v-if="message" class="alert alert-error" role="alert" data-testid="setup-message">
        {{ message }}
      </div>
      <form novalidate @submit.prevent="submit">
        <fieldset>
          <legend>{{ t('setup.company') }}</legend>
          <div class="field">
            <label for="s-company">{{ t('setup.companyName') }}</label>
            <input
              id="s-company"
              v-model="form.companyName"
              type="text"
              :aria-invalid="!!errors.companyName"
              data-testid="setup-company"
            />
            <p v-if="errors.companyName" class="error-text">{{ errors.companyName }}</p>
          </div>
          <div class="field">
            <label for="s-slug">{{ t('setup.companySlug') }}</label>
            <input
              id="s-slug"
              v-model="form.companySlug"
              type="text"
              :aria-invalid="!!errors.companySlug"
              aria-describedby="s-slug-hint"
              data-testid="setup-slug"
              @input="slugTouched = true"
            />
            <p id="s-slug-hint" class="hint">{{ t('setup.slugHint', { slug: form.companySlug || '…' }) }}</p>
            <p v-if="errors.companySlug" class="error-text" data-testid="setup-slug-error">
              {{ errors.companySlug }}
            </p>
          </div>
          <div class="field">
            <label for="s-industry">{{ t('setup.industry') }}</label>
            <select
              id="s-industry"
              v-model="form.industryCode"
              :aria-invalid="!!errors.industryCode"
              data-testid="setup-industry"
            >
              <option value="" disabled>{{ t('setup.chooseIndustry') }}</option>
              <option v-for="i in industries" :key="i.code" :value="i.code">
                {{ locale === 'en' ? i.nameEn : i.nameDe }}
              </option>
            </select>
            <p v-if="errors.industryCode" class="error-text">{{ errors.industryCode }}</p>
          </div>
        </fieldset>
        <fieldset>
          <legend>{{ t('setup.you') }}</legend>
          <div class="field">
            <label for="s-name">{{ t('setup.name') }}</label>
            <input
              id="s-name"
              v-model="form.name"
              type="text"
              autocomplete="name"
              :aria-invalid="!!errors.name"
              data-testid="setup-name"
            />
            <p v-if="errors.name" class="error-text">{{ errors.name }}</p>
          </div>
          <div class="field">
            <label for="s-email">{{ t('setup.email') }}</label>
            <input
              id="s-email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              :aria-invalid="!!errors.email"
              data-testid="setup-email"
            />
            <p v-if="errors.email" class="error-text" data-testid="setup-email-error">{{ errors.email }}</p>
          </div>
          <PasswordField
            id="pw-new"
            v-model="form.password"
            :label="t('password.new')"
            :user-inputs="userInputs"
            @assessed="assessment = $event"
          />
          <div class="field">
            <label for="pw-repeat">{{ t('password.repeat') }}</label>
            <input
              id="pw-repeat"
              v-model="form.passwordRepeat"
              type="password"
              autocomplete="new-password"
              data-testid="pw-repeat-input"
            />
          </div>
        </fieldset>
        <button type="submit" class="btn btn-primary" :disabled="!canSubmit" data-testid="setup-submit">
          {{ t('setup.submit') }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>
.wide {
  max-width: 560px;
}
fieldset {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 1rem;
  margin: 0 0 1rem;
}
legend {
  font-weight: 700;
  padding: 0 0.25rem;
}
.hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--c-muted);
}
.err-title {
  font-weight: 600;
  margin-top: 0;
}
</style>
