import { createRouter, createWebHistory } from 'vue-router';
import type { Role } from '@ai-tpi/shared';
import { useAuthStore } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: Role[];
    guestOnly?: boolean;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/start' },
    {
      path: '/login/:slug?',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    { path: '/einrichtung', name: 'setup', component: () => import('../views/SetupView.vue') },
    {
      path: '/passwort-vergessen',
      name: 'password-forgot',
      component: () => import('../views/ForgotPasswordView.vue'),
    },
    {
      path: '/passwort-festlegen',
      name: 'password-set',
      component: () => import('../views/PasswordSetView.vue'),
    },
    {
      path: '/start',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
});

/** Routenschutz (TC-AUTH-006, TC-ADM-002): Die eigentliche Prüfung erfolgt zusätzlich auf dem Server. */
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.load();
  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.roles && auth.user && !to.meta.roles.includes(auth.user.role)) {
    return { name: 'home', query: { denied: '1' } };
  }
  if (to.meta.guestOnly && auth.user) return { name: 'home' };
  return true;
});
