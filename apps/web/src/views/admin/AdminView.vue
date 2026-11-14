<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import UsersPanel from './UsersPanel.vue';
import CompanyPanel from './CompanyPanel.vue';
import DepartmentsPanel from './DepartmentsPanel.vue';
import IndustriesPanel from './IndustriesPanel.vue';
import CrossPanel from './CrossPanel.vue';
import MailPanel from './MailPanel.vue';
import AiPanel from './AiPanel.vue';
import AuditPanel from './AuditPanel.vue';
import HistoryPanel from './HistoryPanel.vue';
import { useAuthStore } from '../../stores/auth';

const ALL_TABS = [
  'users',
  'departments',
  'company',
  'industries',
  'cross',
  'mail',
  'ai',
  'audit',
  'history',
] as const;
type Tab = (typeof ALL_TABS)[number];
const panels = {
  users: UsersPanel,
  departments: DepartmentsPanel,
  company: CompanyPanel,
  industries: IndustriesPanel,
  cross: CrossPanel,
  mail: MailPanel,
  ai: AiPanel,
  audit: AuditPanel,
  history: HistoryPanel,
} as const;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
/** Admins sehen alle Reiter; alle anderen Rollen nur die Änderungshistorie (TC-HIST-002). */
const tabs = computed<readonly Tab[]>(() => (auth.isAdmin ? ALL_TABS : ['history']));
const fromQuery = (q: unknown): Tab => (tabs.value.includes(q as Tab) ? (q as Tab) : tabs.value[0]!);
const tab = ref<Tab>(fromQuery(route.query.tab));

/** Auf schmalen Bildschirmen den gewählten Reiter in der scrollbaren Leiste sichtbar halten. */
async function revealTab() {
  await nextTick();
  document.getElementById(`tab-${tab.value}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
onMounted(revealTab);

/** Reiter in der Adresse merken (Neuladen, Lesezeichen, Zurück-Taste). */
watch(tab, (v) => {
  if (route.query.tab !== v) void router.replace({ query: { ...route.query, tab: v } });
  void revealTab();
});
watch(
  () => route.query.tab,
  (q) => (tab.value = fromQuery(q)),
);

/** Pfeiltasten-Navigation zwischen Reitern (WAI-ARIA Tabs), Pos1/Ende springen an den Anfang/das Ende. */
function onKey(e: KeyboardEvent) {
  const list = tabs.value;
  const i = list.indexOf(tab.value);
  const next =
    e.key === 'ArrowRight'
      ? (i + 1) % list.length
      : e.key === 'ArrowLeft'
        ? (i + list.length - 1) % list.length
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? list.length - 1
            : -1;
  if (next < 0) return;
  e.preventDefault();
  tab.value = list[next]!;
  document.getElementById(`tab-${tab.value}`)?.focus();
}
</script>

<template>
  <section data-testid="admin">
    <h1>{{ auth.isAdmin ? t('admin.heading') : t('history.heading') }}</h1>
    <div class="tabs" role="tablist" :aria-label="t('admin.heading')" @keydown="onKey">
      <button
        v-for="id in tabs"
        :id="`tab-${id}`"
        :key="id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="tab === id"
        :aria-controls="`panel-${id}`"
        :tabindex="tab === id ? 0 : -1"
        :data-testid="`admin-tab-${id}`"
        @click="tab = id"
      >
        {{ t(`admin.tabs.${id}`) }}
      </button>
    </div>
    <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" class="panel">
      <component :is="panels[tab]" :key="tab" />
    </div>
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--c-border);
  overflow-x: auto;
}
.tab {
  min-height: var(--touch);
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--c-muted);
  cursor: pointer;
  white-space: nowrap;
}
.tab[aria-selected='true'] {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.panel {
  padding-top: 1rem;
}
</style>
