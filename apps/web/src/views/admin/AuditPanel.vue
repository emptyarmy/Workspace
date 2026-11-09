<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

interface AuditItem {
  id: string;
  createdAt: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorCompany: string | null;
  external: boolean;
}

const PAGE = 25;
const { t, te, d } = useI18n();
const { notice, error, clear } = useNotice('admin.audit.errors');
const filter = reactive({ action: '', from: '', to: '' });
const items = ref<AuditItem[]>([]);
const total = ref(0);
const offset = ref(0);
const loading = ref(false);

const query = (extra: Record<string, string | number> = {}) => {
  const p = new URLSearchParams();
  if (filter.action.trim()) p.set('action', filter.action.trim());
  if (filter.from) p.set('from', filter.from);
  if (filter.to) p.set('to', filter.to);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
};
const csvHref = computed(() => `/api/admin/audit.csv?${query()}`);

async function load(newOffset = 0) {
  clear();
  if (filter.from && filter.to && filter.from > filter.to) return error('range');
  loading.value = true;
  const res = await apiGet<{ total: number; items: AuditItem[] }>(
    `/api/admin/audit?${query({ limit: PAGE, offset: newOffset })}`,
  );
  loading.value = false;
  if (!res.ok || !res.data) return error(res.error);
  items.value = res.data.items;
  total.value = res.data.total;
  offset.value = newOffset;
}
onMounted(() => load());

function reset() {
  Object.assign(filter, { action: '', from: '', to: '' });
  void load();
}

const label = (action: string) => {
  const key = `admin.audit.actions.${action.replace(/\./g, '_')}`;
  return te(key) ? t(key) : action;
};
/** Details kompakt darstellen; leere Werte weglassen. */
const detailText = (dt: Record<string, unknown> | null) =>
  dt
    ? Object.entries(dt)
        .filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
        .map(
          ([k, v]) =>
            `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
        )
        .join(' · ')
    : '';
</script>

<template>
  <div data-testid="audit-panel">
    <p class="hint">{{ t('admin.audit.intro') }}</p>
    <form class="card-flat filters" novalidate data-testid="audit-filter" @submit.prevent="load()">
      <div class="field">
        <label for="au-action">{{ t('admin.audit.action') }}</label>
        <input
          id="au-action"
          v-model="filter.action"
          type="search"
          :placeholder="t('admin.audit.actionPlaceholder')"
          data-testid="audit-action"
        />
      </div>
      <div class="field">
        <label for="au-from">{{ t('admin.audit.from') }}</label>
        <input id="au-from" v-model="filter.from" type="date" data-testid="audit-from" />
      </div>
      <div class="field">
        <label for="au-to">{{ t('admin.audit.to') }}</label>
        <input id="au-to" v-model="filter.to" type="date" data-testid="audit-to" />
      </div>
      <div class="button-row filter-buttons">
        <button type="submit" class="btn btn-primary-inline" data-testid="audit-apply">
          {{ t('admin.audit.apply') }}
        </button>
        <button type="button" class="btn btn-ghost" data-testid="audit-reset" @click="reset">
          {{ t('admin.audit.reset') }}
        </button>
        <a class="btn btn-ghost csv" :href="csvHref" download data-testid="audit-csv">{{
          t('admin.audit.csv')
        }}</a>
      </div>
    </form>
    <NoticeBar :notice="notice" testid="audit-notice" />

    <p class="hint" role="status" data-testid="audit-count">
      {{
        total === 0
          ? t('admin.audit.none')
          : t('admin.audit.count', { from: offset + 1, to: offset + items.length, total })
      }}
    </p>
    <ol class="row-list" :aria-busy="loading" data-testid="audit-list">
      <li v-for="i in items" :key="i.id" class="row-item audit-row" :data-testid="`audit-row-${i.action}`">
        <div class="row-main">
          <strong>
            {{ label(i.action) }}
            <span v-if="i.external" class="tag tag-warn" data-testid="audit-external">{{
              t('admin.audit.external')
            }}</span>
          </strong>
          <span class="row-sub">
            <time :datetime="i.createdAt">{{ d(new Date(i.createdAt), 'short') }}</time>
            · {{ i.actorName ?? t('admin.audit.system') }}
            <template v-if="i.actorEmail">
              ({{ i.actorEmail }}<template v-if="i.external">, {{ i.actorCompany }}</template
              >)</template
            >
          </span>
          <span v-if="detailText(i.details)" class="row-sub details">{{ detailText(i.details) }}</span>
        </div>
      </li>
    </ol>
    <div v-if="total > PAGE" class="button-row pager">
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="offset === 0"
        data-testid="audit-prev"
        @click="load(Math.max(0, offset - PAGE))"
      >
        {{ t('admin.audit.prev') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="offset + PAGE >= total"
        data-testid="audit-next"
        @click="load(offset + PAGE)"
      >
        {{ t('admin.audit.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 0 1rem;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .filters {
    grid-template-columns: 2fr 1fr 1fr;
  }
  .filter-buttons {
    grid-column: 1 / -1;
  }
}
.csv {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.details {
  font-size: 0.85rem;
}
.pager {
  justify-content: center;
  margin-top: 1rem;
}
</style>
