import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { i18n, persistLocale } from './i18n';
import { router } from './router';
import './styles/main.css';

persistLocale(i18n.global.locale.value as 'de' | 'en');
createApp(App).use(createPinia()).use(i18n).use(router).mount('#app');
