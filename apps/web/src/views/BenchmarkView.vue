<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BenchmarkPanel from '../components/BenchmarkPanel.vue';

/** Benchmark-Ansicht für alle Rollen (08_mandanten-und-benchmark.md, 3.2): nur Kennzahlen, keine Antworten. */
const { t } = useI18n();
</script>

<template>
  <section data-testid="benchmark-view">
    <h1>{{ t('benchmark.heading') }}</h1>
    <BenchmarkPanel />
  </section>
</template>
