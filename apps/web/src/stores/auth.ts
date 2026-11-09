import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Role } from '@ai-tpi/shared';
import { apiGet, apiPost } from '../api/client';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companySlug: string;
  companyName: string;
  isExternal: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null);
  const loaded = ref(false);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function load(force = false) {
    if (loaded.value && !force) return user.value;
    const res = await apiGet<CurrentUser>('/api/auth/me');
    user.value = res.ok ? res.data : null;
    loaded.value = true;
    return user.value;
  }

  async function login(email: string, password: string) {
    const res = await apiPost<{ role: Role }>('/api/auth/login', { email, password });
    if (res.ok) await load(true);
    return res;
  }

  async function logout() {
    await apiPost('/api/auth/logout');
    user.value = null;
  }

  /** Nach Ersteinrichtung/Login vom Server gesetzte Sitzung übernehmen. */
  async function refresh() {
    return load(true);
  }

  return { user, loaded, isAdmin, load, login, logout, refresh };
});
