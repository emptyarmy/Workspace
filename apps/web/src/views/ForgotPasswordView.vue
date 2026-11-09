<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { emailSchema } from '@ai-tpi/shared';
import { apiPost } from '../api/client';

/** „Passwort vergessen“: immer dieselbe Meldung – unabhängig davon, ob die Adresse existiert (TC-RST-001/002). */
const { t } = useI18n();
const form = reactive({ email: '' });
const error = ref<string>();
const sent = ref(false);

async function submit() {
  error.value = !form.email.trim()
    ? t('login.errors.emailRequired')
    : emailSchema.safeParse(form.email).success
      ? undefined
      : t('login.errors.emailInvalid');
  if (error.value) return;
  await apiPost('/api/auth/password-reset', { email: form.email });
  sent.value = true;
}
</script>

<template>
  <section class="card" data-testid="forgot-card">
    <h1>{{ t('forgot.heading') }}</h1>
    <div v-if="sent" class="alert alert-info" role="status" data-testid="forgot-confirmation">
      {{ t('forgot.sent') }}
    </div>
    <form v-else novalidate @submit.prevent="submit">
      <p>{{ t('forgot.intro') }}</p>
      <div class="field">
        <label for="forgot-email">{{ t('login.email') }}</label>
        <input
          id="forgot-email"
          v-model="form.email"
          type="email"
          autocomplete="username"
          inputmode="email"
          :aria-invalid="!!error"
          aria-describedby="forgot-email-error"
          data-testid="forgot-email"
        />
        <p v-if="error" id="forgot-email-error" class="error-text" data-testid="forgot-email-error">
          {{ error }}
        </p>
      </div>
      <button type="submit" class="btn btn-primary" data-testid="forgot-submit">
        {{ t('forgot.submit') }}
      </button>
    </form>
    <div class="link-row">
      <RouterLink :to="{ name: 'login' }">{{ t('notFound.back') }}</RouterLink>
    </div>
  </section>
</template>
