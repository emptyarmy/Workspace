<script setup lang="ts">
import { useI18n } from 'vue-i18n';

/** Gestapelte Balken je Kategorie (absolute Anzahl erfüllt / teilweise / nicht erfüllt / n. a. / offen) wie im Excel-Blatt. */
defineProps<{
  rows: {
    label: string;
    yes: number;
    partial: number;
    no: number;
    na: number;
    open: number;
    total: number;
  }[];
  label: string;
}>();
const { t } = useI18n();
const parts = ['yes', 'partial', 'no', 'na', 'open'] as const;
</script>

<template>
  <div class="bars" role="group" :aria-label="label">
    <div v-for="r in rows" :key="r.label" class="row" :data-testid="`bar-${r.label}`">
      <span class="name">{{ r.label }}</span>
      <div
        class="track"
        :aria-label="`${r.label}: ${parts.map((p) => `${t(`answers.${p}`)} ${r[p]}`).join(', ')}`"
        role="img"
      >
        <span
          v-for="p in parts"
          v-show="r[p] > 0"
          :key="p"
          :class="['seg', `s-${p}`]"
          :style="{ width: `${r.total ? (100 * r[p]) / r.total : 0}%` }"
          >{{ r[p] }}</span
        >
      </div>
      <span class="total">{{ r.total }}</span>
    </div>
    <p class="legend">
      <span v-for="p in parts" :key="p" class="li"
        ><span :class="['dot', `s-${p}`]"></span>{{ t(`answers.${p}`) }}</span
      >
    </p>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: minmax(6rem, 9rem) 1fr 2.5rem;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.35rem;
}
.name {
  font-size: 0.9rem;
}
.track {
  display: flex;
  height: 1.4rem;
  border-radius: 4px;
  overflow: hidden;
  background: var(--c-border);
}
.seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  overflow: hidden;
  white-space: nowrap;
}
.total {
  text-align: right;
  font-size: 0.85rem;
  color: var(--c-muted);
}
.s-yes {
  background: #1e7a3c;
  color: #fff;
}
.s-partial {
  background: #f2c037;
  color: #1b1f24;
}
.s-no {
  background: #b3261e;
  color: #fff;
}
.s-na {
  background: repeating-linear-gradient(45deg, #8a94a3, #8a94a3 5px, #6b7584 5px, #6b7584 10px);
  color: #fff;
}
.s-open {
  background: #fff;
  color: #1b1f24;
  box-shadow: inset 0 0 0 1px #8a94a3;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}
.li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 2px;
  display: inline-block;
}
</style>
