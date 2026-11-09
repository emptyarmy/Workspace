<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { persistLocale, SUPPORTED_LOCALES, type Locale } from '../i18n';

const { t, locale } = useI18n();
function select(l: Locale) {
  locale.value = l;
  persistLocale(l);
}
</script>

<template>
  <div class="lang" role="group" :aria-label="t('language.label')" data-testid="language-switcher">
    <button
      v-for="l in SUPPORTED_LOCALES"
      :key="l"
      type="button"
      class="btn btn-ghost"
      :aria-pressed="locale === l"
      :data-testid="`lang-${l}`"
      :lang="l"
      :title="t(`language.${l}`)"
      @click="select(l)"
    >
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang {
  display: flex;
  gap: 0.25rem;
}
.lang .btn {
  padding: 0.25rem 0.6rem;
  color: inherit;
  border-color: rgb(255 255 255 / 0.4);
}
.lang .btn[aria-pressed='true'] {
  background: rgb(255 255 255 / 0.18);
  border-color: #fff;
}
</style>
