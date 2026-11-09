<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { emailSchema } from '@ai-tpi/shared';
import CompanyLogo from '../components/CompanyLogo.vue';
import { useBranding } from '../composables/useBranding';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const slug = computed(() => (route.params.slug as string | undefined) || undefined);
const branding = useBranding(slug);

const form = reactive({ email: '', password: '' });
const errors = reactive<{ email?: string; password?: string }>({});
const message = ref<{ kind: 'info' | 'error'; text: string } | null>(
  route.query.passwordSet ? { kind: 'info', text: t('login.passwordSet') } : null,
);
const busy = ref(false);

function validate(): boolean {
  errors.email = !form.email.trim()
    ? t('login.errors.emailRequired')
    : emailSchema.safeParse(form.email).success
      ? undefined
      : t('login.errors.emailInvalid');
  errors.password = form.password ? undefined : t('login.errors.passwordRequired');
  return !errors.email && !errors.password;
}

async function submit() {
  message.value = null;
  if (!validate()) return;
  busy.value = true;
  const res = await auth.login(form.email, form.password);
  busy.value = false;
  if (res.ok) {
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : null;
    await router.push(redirect ?? (auth.isAdmin ? '/admin' : '/start'));
    return;
  }
  form.password = '';
  message.value = {
    kind: 'error',
    text:
      res.status === 401
        ? t('login.errors.invalidCredentials')
        : res.status === 429
          ? t('login.errors.locked')
          : t('login.errors.generic'),
  };
}
</script>

<template>
  <section class="card" data-testid="login-card">
    <CompanyLogo :src="branding.logoUrl" :alt="branding.logoAlt" />
    <h1 class="title">{{ t('login.heading') }}</h1>

    <div
      v-if="message"
      :class="['alert', message.kind === 'info' ? 'alert-info' : 'alert-error']"
      role="status"
      data-testid="login-message"
    >
      {{ message.text }}
    </div>

    <form novalidate @submit.prevent="submit">
      <div class="field">
        <label for="login-email">{{ t('login.email') }}</label>
        <input
          id="login-email"
          v-model="form.email"
          type="email"
          autocomplete="username"
          inputmode="email"
          :aria-invalid="!!errors.email"
          aria-describedby="login-email-error"
          data-testid="login-email"
        />
        <p v-if="errors.email" id="login-email-error" class="error-text" data-testid="login-email-error">
          {{ errors.email }}
        </p>
      </div>
      <div class="field">
        <label for="login-password">{{ t('login.password') }}</label>
        <input
          id="login-password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="!!errors.password"
          aria-describedby="login-password-error"
          data-testid="login-password"
        />
        <p
          v-if="errors.password"
          id="login-password-error"
          class="error-text"
          data-testid="login-password-error"
        >
          {{ errors.password }}
        </p>
      </div>
      <button type="submit" class="btn btn-primary" :disabled="busy" data-testid="login-submit">
        {{ t('login.submit') }}
      </button>
    </form>
    <div class="link-row">
      <RouterLink
        :to="{ name: 'password-forgot', query: slug ? { firma: slug } : {} }"
        data-testid="login-forgot"
      >
        {{ t('login.forgot') }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.title {
  text-align: center;
  margin-top: 1rem;
}
</style>
