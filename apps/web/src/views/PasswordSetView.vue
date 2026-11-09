<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { PasswordAssessment } from '@ai-tpi/shared';
import PasswordField from '../components/PasswordField.vue';
import { apiPost } from '../api/client';

/** Ziel des Einmal-Links: Passwort festlegen (N-07, F-07). */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const password = ref('');
const repeat = ref('');
const assessment = ref<PasswordAssessment | null>(null);
const message = ref<{ kind: 'info' | 'error'; text: string } | null>(null);
const busy = ref(false);

const mismatch = computed(() => repeat.value.length > 0 && repeat.value !== password.value);
const tooWeak = computed(() => !!assessment.value?.rulesMet && !assessment.value.acceptable);
const canSave = computed(
  () =>
    !busy.value &&
    !!token.value &&
    !!assessment.value?.acceptable &&
    repeat.value === password.value &&
    repeat.value.length > 0,
);

async function save() {
  if (!canSave.value) return;
  busy.value = true;
  const res = await apiPost<{ status: string; companySlug: string }>('/api/auth/password', {
    token: token.value,
    password: password.value,
    passwordRepeat: repeat.value,
  });
  busy.value = false;
  if (res.ok && res.data) {
    await router.push({ name: 'login', params: { slug: res.data.companySlug }, query: { passwordSet: '1' } });
    return;
  }
  const key =
    res.error === 'invalid_token'
      ? 'password.invalidToken'
      : res.error === 'password_reused'
        ? 'password.reused'
        : res.error === 'password_policy'
          ? 'password.strength.tooWeak'
          : 'login.errors.generic';
  message.value = { kind: 'error', text: t(key) };
}
</script>

<template>
  <section class="card" data-testid="password-set-card">
    <h1>{{ t('password.headingSet') }}</h1>
    <div v-if="!token" class="alert alert-error" role="alert" data-testid="password-missing-token">
      {{ t('password.missingToken') }}
    </div>
    <p v-else>{{ t('password.intro') }}</p>

    <div
      v-if="message"
      :class="['alert', message.kind === 'info' ? 'alert-info' : 'alert-error']"
      role="status"
      data-testid="password-message"
    >
      {{ message.text }}
    </div>

    <form novalidate @submit.prevent="save">
      <PasswordField
        id="pw-new"
        v-model="password"
        :label="t('password.new')"
        @assessed="assessment = $event"
      />
      <p v-if="tooWeak" class="error-text" data-testid="password-too-weak">
        {{ t('password.strength.tooWeak') }}
      </p>

      <div class="field">
        <label for="pw-repeat">{{ t('password.repeat') }}</label>
        <input
          id="pw-repeat"
          v-model="repeat"
          type="password"
          autocomplete="new-password"
          :aria-invalid="mismatch"
          aria-describedby="pw-repeat-error"
          data-testid="pw-repeat-input"
        />
        <p v-if="mismatch" id="pw-repeat-error" class="error-text" data-testid="pw-mismatch">
          {{ t('password.mismatch') }}
        </p>
      </div>
      <button type="submit" class="btn btn-primary" :disabled="!canSave" data-testid="password-save">
        {{ t('password.save') }}
      </button>
    </form>
  </section>
</template>
