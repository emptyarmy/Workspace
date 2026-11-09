<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { useAuthStore } from './stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

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
    <span class="subtitle">{{ auth.user ? auth.user.companyName : t('app.title') }}</span>
    <nav v-if="auth.user" class="usernav" :aria-label="t('nav.userMenu')">
      <RouterLink v-if="auth.isAdmin" :to="{ name: 'admin' }" class="navlink" data-testid="nav-admin">{{
        t('nav.admin')
      }}</RouterLink>
      <span class="who" data-testid="current-user">{{ auth.user.name }}</span>
      <button type="button" class="btn btn-ghost navbtn" data-testid="logout" @click="logout">
        {{ t('nav.logout') }}
      </button>
    </nav>
    <LanguageSwitcher />
  </header>
  <main id="main" class="page">
    <RouterView />
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
  align-items: center;
  gap: 0.5rem;
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
@media (min-width: 768px) {
  .who {
    display: inline;
  }
}
</style>
