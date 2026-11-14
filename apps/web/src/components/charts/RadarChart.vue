<script setup lang="ts">
import { computed } from 'vue';

/**
 * Netzdiagramm (0–100 %) als SVG ohne Fremdbibliothek. Fehlende Werte (null) werden als 0 gezeichnet
 * und in der Legende nicht verfälscht – die Zahlen stehen zusätzlich in einer Tabelle (Barrierefreiheit, TC-BM-006).
 */
const props = defineProps<{
  axes: string[];
  series: { name: string; values: (number | null)[]; color: string; dashed?: boolean }[];
  label: string;
  size?: number;
}>();

const size = computed(() => props.size ?? 360);
const c = computed(() => size.value / 2);
const r = computed(() => size.value / 2 - 46);
const angle = (i: number) => (Math.PI * 2 * i) / Math.max(props.axes.length, 1) - Math.PI / 2;
const point = (i: number, v: number) => {
  const rr = (r.value * Math.max(0, Math.min(100, v))) / 100;
  return [c.value + rr * Math.cos(angle(i)), c.value + rr * Math.sin(angle(i))] as const;
};
const ring = (v: number) => props.axes.map((_, i) => point(i, v).join(',')).join(' ');
const polygon = (values: (number | null)[]) => values.map((v, i) => point(i, v ?? 0).join(',')).join(' ');
const labelPos = (i: number) => {
  const x = c.value + (r.value + 22) * Math.cos(angle(i));
  const y = c.value + (r.value + 22) * Math.sin(angle(i));
  const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end';
  return { x, y, anchor };
};
</script>

<template>
  <figure class="radar">
    <svg
      :viewBox="`-24 -8 ${size + 48} ${size + 16}`"
      role="img"
      :aria-label="label"
      class="svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon v-for="v in [25, 50, 75, 100]" :key="v" :points="ring(v)" class="grid" />
      <line
        v-for="(_, i) in axes"
        :key="`ax${i}`"
        :x1="c"
        :y1="c"
        :x2="point(i, 100)[0]"
        :y2="point(i, 100)[1]"
        class="grid"
      />
      <polygon
        v-for="s in series"
        :key="s.name"
        :points="polygon(s.values)"
        :stroke="s.color"
        :fill="s.color"
        :stroke-dasharray="s.dashed ? '5 4' : undefined"
        class="area"
      />
      <text
        v-for="(a, i) in axes"
        :key="`l${i}`"
        :x="labelPos(i).x"
        :y="labelPos(i).y"
        :text-anchor="labelPos(i).anchor"
        dominant-baseline="middle"
        class="lbl"
      >
        {{ a }}
      </text>
      <text :x="c + 3" :y="c - r / 2" class="tick">50</text>
      <text :x="c + 3" :y="c - r" class="tick">100</text>
    </svg>
    <figcaption v-if="series.length > 1" class="legend">
      <span v-for="s in series" :key="s.name" class="item">
        <svg width="22" height="10" aria-hidden="true">
          <line
            x1="0"
            y1="5"
            x2="22"
            y2="5"
            :stroke="s.color"
            stroke-width="3"
            :stroke-dasharray="s.dashed ? '5 3' : undefined"
          />
        </svg>
        {{ s.name }}
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.radar {
  margin: 0;
  max-width: 460px;
}
.svg {
  width: 100%;
  height: auto;
}
.grid {
  fill: none;
  stroke: var(--c-border);
  stroke-width: 1;
}
.area {
  fill-opacity: 0.12;
  stroke-width: 2;
}
.lbl {
  font-size: 11px;
  fill: var(--c-text);
}
.tick {
  font-size: 9px;
  fill: var(--c-muted);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-size: 0.85rem;
}
.item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
