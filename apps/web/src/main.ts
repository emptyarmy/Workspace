import { createApp } from 'vue';
import { setUnauthorizedHandler } from './api/client';
import { useAuthStore } from './stores/auth';
import { createPinia } from 'pinia';
import App from './App.vue';
import { i18n, persistLocale } from './i18n';
import { router } from './router';
import './styles/main.css';

persistLocale(i18n.global.locale.value as 'de' | 'en');
const pinia = createPinia();
createApp(App).use(pinia).use(i18n).use(router).mount('#app');

/** Sitzung abgelaufen: zur Anmeldung der eigenen Firma mit Hinweis und Rücksprung (TC-AUTH-008). */
setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia);
  if (!auth.user) return;
  const slug = auth.user.companySlug;
  auth.expire();
  const current = router.currentRoute.value;
  void router.push({ name: 'login', params: { slug }, query: { expired: '1', redirect: current.fullPath } });
});
