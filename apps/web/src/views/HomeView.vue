<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { allCheckpoints, catalog } from '@ai-tpi/catalog';
import { useAuthStore } from '../stores/auth';

const { t, locale } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const checkpoints = allCheckpoints().length;
</script>

<template>
  <section class="home" data-testid="home">
    <p v-if="route.query.denied" class="alert alert-error" role="alert" data-testid="access-denied">
      {{ t('home.denied') }}
    </p>
    <h1 data-testid="home-greeting">{{ t('home.greeting', { name: auth.user?.name ?? '' }) }}</h1>
    <p data-testid="home-role">
      {{
        t('home.roleInfo', {
          role: t(`roles.${auth.user?.role ?? 'reader'}`),
          company: auth.user?.companyName ?? '',
        })
      }}
    </p>
    <p>{{ t('home.text') }}</p>
    <p>
      <RouterLink
        :to="{ name: 'assessments' }"
        class="btn btn-primary-inline linkbtn"
        data-testid="home-assessments"
        >{{ t('home.toAssessments') }}</RouterLink
      >
    </p>
    <p data-testid="catalog-info">
      {{
        t('home.catalogInfo', {
          areas: catalog.keyAreas.length,
          checkpoints,
          version: catalog.catalogVersion,
        })
      }}
    </p>
    <ul class="areas" data-testid="key-area-list">
      <li v-for="a in catalog.keyAreas" :key="a.id" :data-testid="`area-${a.id}`">
        <span class="id">{{ a.id }}</span>
        <span>{{ a.name[locale as 'de' | 'en'] }}</span>
        <span v-if="a.isAiArea" class="badge">KI</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.linkbtn {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
.areas {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;
}
@media (min-width: 600px) {
  .areas {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .areas {
    grid-template-columns: repeat(3, 1fr);
  }
}
.areas li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  min-height: var(--touch);
}
.id {
  font-weight: 700;
  color: var(--c-accent);
  min-width: 3em;
}
.badge {
  margin-left: auto;
  font-size: 0.75rem;
  background: var(--c-primary);
  color: #fff;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}
</style>
