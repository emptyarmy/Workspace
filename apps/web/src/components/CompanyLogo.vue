<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

/** Firmenlogo mit Platzhalter bei fehlender oder nicht ladbarer URL (TC-AUTH-010/011). */
const props = defineProps<{ src: string | null; alt: string; size?: 'sm' | 'lg' }>();
const { t } = useI18n();
const failed = ref(false);
watch(
  () => props.src,
  () => (failed.value = false),
);
</script>

<template>
  <div class="logo" :class="size ?? 'lg'">
    <img v-if="src && !failed" :src="src" :alt="alt" data-testid="company-logo" @error="failed = true" />
    <svg
      v-else
      data-testid="logo-placeholder"
      role="img"
      :aria-label="src ? t('logo.placeholder') : alt"
      viewBox="0 0 120 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="120" height="40" rx="8" fill="var(--c-primary)" />
      <text
        x="60"
        y="26"
        text-anchor="middle"
        font-size="16"
        font-weight="700"
        fill="#fff"
        font-family="system-ui"
      >
        {{ alt.slice(0, 12) }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  justify-content: center;
}
.logo img,
.logo svg {
  max-width: 100%;
  object-fit: contain;
}
.lg img,
.lg svg {
  height: 64px;
  max-width: 260px;
}
.sm img,
.sm svg {
  height: 32px;
  max-width: 140px;
}
</style>
