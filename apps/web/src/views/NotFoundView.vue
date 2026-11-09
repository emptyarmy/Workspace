<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <section class="card" data-testid="not-found">
    <h1>{{ t('notFound.heading') }}</h1>
    <RouterLink :to="{ name: 'login' }">{{ t('notFound.back') }}</RouterLink>
  </section>
</template>
