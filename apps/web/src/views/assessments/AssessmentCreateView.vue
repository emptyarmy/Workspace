<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import MasterDataForm from '../../components/MasterDataForm.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiPost } from '../../api/client';
import { emptyMaster, type AssessmentMaster } from '../../api/assessments';
import { useNotice } from '../../composables/useNotice';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { notice, error } = useNotice('assessment.errors');
const busy = ref(false);
const serverFields = ref<string[]>();
const initial = emptyMaster(auth.user?.name ?? '');

async function create(data: AssessmentMaster) {
  busy.value = true;
  const res = await apiPost<{ id: string; fields?: string[] }>('/api/assessments', data);
  busy.value = false;
  if (!res.ok) {
    serverFields.value = (res.data as { fields?: string[] } | null)?.fields;
    return error(res.error);
  }
  await router.push({ name: 'assessment', params: { id: res.data!.id }, query: { created: '1' } });
}
</script>

<template>
  <section data-testid="assessment-create-view">
    <RouterLink :to="{ name: 'assessments' }">← {{ t('assessment.toList') }}</RouterLink>
    <h1>{{ t('assessment.createHeading') }}</h1>
    <NoticeBar :notice="notice" />
    <MasterDataForm
      :initial="initial"
      :busy="busy"
      :server-fields="serverFields"
      :submit-label="t('assessment.create')"
      @submit="create"
    />
  </section>
</template>
