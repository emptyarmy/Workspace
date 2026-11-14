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
      // Alle Rollen: Nicht-Admins sehen nur den Reiter „Änderungshistorie“ (TC-HIST-002).
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments',
      name: 'assessments',
      component: () => import('../views/assessments/AssessmentListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments/neu',
      name: 'assessment-new',
      component: () => import('../views/assessments/AssessmentCreateView.vue'),
      meta: { requiresAuth: true, roles: ['assessor'] },
    },
    {
      path: '/assessments/:id',
      name: 'assessment',
      component: () => import('../views/assessments/AssessmentDetailView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments/:id/fragebogen/:area?',
      name: 'questionnaire',
      component: () => import('../views/assessments/QuestionnaireView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments/:id/bericht',
      name: 'report',
      component: () => import('../views/assessments/ReportView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments/:id/empfehlungen',
      name: 'recommendations',
      component: () => import('../views/assessments/RecommendationsView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/benchmark',
      name: 'benchmark',
      component: () => import('../views/BenchmarkView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/assessments/:id/zusammenfuehrung/:area?',
      name: 'consolidation',
      component: () => import('../views/assessments/ConsolidationView.vue'),
      props: true,
      meta: { requiresAuth: true },
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
