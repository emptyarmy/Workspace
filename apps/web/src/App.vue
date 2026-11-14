<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { useAuthStore } from './stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

/** Logo der eigenen Firma in der Kopfzeile (TC-AUTH-013); nicht ladbar → ausblenden. */
const logoFailed = ref(false);
watch(
  () => auth.user?.companyLogoUrl,
  () => (logoFailed.value = false),
);

async function logout() {
  const slug = auth.user?.companySlug;
  await auth.logout();
  await router.push({ name: 'login', params: slug ? { slug } : {} });
}
</script>

<template>
  <a href="#main" class="skip-link">{{ t('app.skipToContent') }}</a>
  <header class="topbar" data-testid="topbar">
    <RouterLink to="/start" class="brand">AI_TPI</RouterLink>
    <img
      v-if="auth.user?.companyLogoUrl && !logoFailed"
      :src="auth.user.companyLogoUrl"
      :alt="auth.user.companyLogoAlt || auth.user.companyName"
      class="hdr-logo"
      data-testid="header-logo"
      @error="logoFailed = true"
    />
    <span class="subtitle">{{ auth.user ? auth.user.companyName : t('app.title') }}</span>
    <nav v-if="auth.user" class="usernav" :aria-label="t('nav.userMenu')">
      <RouterLink :to="{ name: 'assessments' }" class="navlink" data-testid="nav-assessments">{{
        t('nav.assessments')
      }}</RouterLink>
      <RouterLink :to="{ name: 'benchmark' }" class="navlink" data-testid="nav-benchmark">{{
        t('nav.benchmark')
      }}</RouterLink>
      <RouterLink v-if="auth.isAdmin" :to="{ name: 'admin' }" class="navlink" data-testid="nav-admin">{{
        t('nav.admin')
      }}</RouterLink>
      <RouterLink
        v-else
        :to="{ name: 'admin', query: { tab: 'history' } }"
        class="navlink"
        data-testid="nav-history"
        >{{ t('nav.history') }}</RouterLink
      >
      <span class="who" data-testid="current-user">{{ auth.user.name }}</span>
      <button type="button" class="btn btn-ghost navbtn" data-testid="logout" @click="logout">
        {{ t('nav.logout') }}
      </button>
    </nav>
    <LanguageSwitcher />
  </header>
  <main id="main" class="page">
    <!-- Neu aufbauen, wenn ein anderes Assessment geöffnet wird (z. B. Link zur Kopie); Reiter/Kernbereich wechseln nicht. -->
    <RouterView v-slot="{ Component, route: r }">
      <component :is="Component" :key="`${String(r.name)}:${String(r.params.id ?? '')}`" />
    </RouterView>
  </main>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  background: var(--c-primary);
  color: var(--c-primary-contrast);
  padding: 0.5rem 1rem;
  padding-top: max(0.5rem, env(safe-area-inset-top));
  min-height: 56px;
}
.hdr-logo {
  height: 32px;
  max-width: 120px;
  object-fit: contain;
  background: #fff;
  border-radius: 6px;
  padding: 2px 6px;
}
.brand {
  font-weight: 800;
  letter-spacing: 0.02em;
  color: inherit;
  text-decoration: none;
}
.subtitle {
  flex: 1;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.usernav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
}
.navlink {
  color: inherit;
  min-height: var(--touch);
  display: inline-flex;
  align-items: center;
  padding: 0 0.25rem;
}
.who {
  opacity: 0.85;
  display: none;
}
.navbtn {
  color: inherit;
  border-color: rgb(255 255 255 / 0.4);
  padding: 0.25rem 0.75rem;
}
/* Auf Smartphones bricht die Kopfzeile um; nicht fixieren, damit sie keinen Inhalt verdeckt. */
@media (max-width: 599px) {
  .topbar {
    position: static;
  }
}
@media (min-width: 768px) {
  .who {
    display: inline;
  }
}
</style>
