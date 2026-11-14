<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { assessmentMasterSchema } from '@ai-tpi/shared';
import type { AssessmentMaster } from '../api/assessments';

/**
 * Stammdaten eines Assessments (FA-1.1, wie Excel-Blatt „Information“) für Anlage und Bearbeitung.
 * Prüft wie der Server (gemeinsames Schema) und zeigt Feldfehler direkt am Feld (TC-ASM-002…004).
 */
const props = defineProps<{
  initial: AssessmentMaster;
  readonly?: boolean;
  submitLabel: string;
  busy?: boolean;
  serverFields?: string[];
}>();
const emit = defineEmits<{ submit: [AssessmentMaster] }>();
const { t } = useI18n();

const form = reactive<AssessmentMaster>({ ...props.initial });
/** Zahlenfeld als Text, damit auch ungültige Eingaben („abc“, „-1“) gemeldet werden können. */
const interviews = ref(props.initial.interviewCount == null ? '' : String(props.initial.interviewCount));
const errors = reactive<Record<string, boolean>>({});

watch(
  () => props.initial,
  (v) => {
    Object.assign(form, v);
    interviews.value = v.interviewCount == null ? '' : String(v.interviewCount);
  },
);
watch(
  () => props.serverFields,
  (f) => f?.forEach((k) => (errors[k] = true)),
);

const textFields = ['domain', 'organizationUnit', 'mainStakeholder', 'contact', 'assessmentType'] as const;
const disabled = computed(() => props.readonly || props.busy);

function submit() {
  for (const k of Object.keys(errors)) delete errors[k];
  const raw = interviews.value.trim();
  const count = raw === '' ? null : /^-?\d+$/.test(raw) ? Number(raw) : Number.NaN;
  const candidate = { ...form, endDate: form.endDate || null, interviewCount: count };
  const parsed = assessmentMasterSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors[String(i.path[0])] = true;
    return;
  }
  emit('submit', parsed.data);
}
</script>

<template>
  <form class="card-flat" novalidate data-testid="master-form" @submit.prevent="submit">
    <div class="form-grid">
      <div class="field span-2">
        <label for="m-project">{{ t('assessment.fields.project') }} *</label>
        <input
          id="m-project"
          v-model="form.project"
          type="text"
          maxlength="120"
          :disabled="disabled"
          :aria-invalid="!!errors.project"
          aria-describedby="m-project-err"
          data-testid="m-project"
        />
        <p v-if="errors.project" id="m-project-err" class="error-text" data-testid="m-project-error">
          {{ t('assessment.errors.project') }}
        </p>
      </div>
      <div class="field">
        <label for="m-assessor">{{ t('assessment.fields.assessorName') }} *</label>
        <input
          id="m-assessor"
          v-model="form.assessorName"
          type="text"
          maxlength="100"
          :disabled="disabled"
          :aria-invalid="!!errors.assessorName"
          data-testid="m-assessorName"
        />
        <p v-if="errors.assessorName" class="error-text">{{ t('assessment.errors.assessorName') }}</p>
      </div>
      <div v-for="f in textFields" :key="f" class="field">
        <label :for="`m-${f}`">{{ t(`assessment.fields.${f}`) }}</label>
        <input
          :id="`m-${f}`"
          v-model="form[f]"
          type="text"
          maxlength="200"
          :disabled="disabled"
          :data-testid="`m-${f}`"
        />
      </div>
      <div class="field">
        <label for="m-start">{{ t('assessment.fields.startDate') }} *</label>
        <input
          id="m-start"
          v-model="form.startDate"
          type="date"
          :disabled="disabled"
          :aria-invalid="!!errors.startDate"
          data-testid="m-startDate"
        />
        <p v-if="errors.startDate" class="error-text">{{ t('assessment.errors.startDate') }}</p>
      </div>
      <div class="field">
        <label for="m-end">{{ t('assessment.fields.endDate') }}</label>
        <input
          id="m-end"
          v-model="form.endDate"
          type="date"
          :disabled="disabled"
          :aria-invalid="!!errors.endDate"
          data-testid="m-endDate"
        />
        <p v-if="errors.endDate" class="error-text" data-testid="m-endDate-error">
          {{ t('assessment.errors.endDate') }}
        </p>
      </div>
      <div class="field">
        <label for="m-interviews">{{ t('assessment.fields.interviewCount') }}</label>
        <input
          id="m-interviews"
          v-model="interviews"
          type="text"
          inputmode="numeric"
          maxlength="6"
          :disabled="disabled"
          :aria-invalid="!!errors.interviewCount"
          data-testid="m-interviewCount"
        />
        <p v-if="errors.interviewCount" class="error-text" data-testid="m-interviewCount-error">
          {{ t('assessment.errors.interviewCount') }}
        </p>
      </div>
      <div class="field">
        <label for="m-method">{{ t('assessment.fields.methodModel') }}</label>
        <select id="m-method" v-model="form.methodModel" :disabled="disabled" data-testid="m-methodModel">
          <option value="agile">{{ t('assessment.method.agile') }}</option>
          <option value="classic">{{ t('assessment.method.classic') }}</option>
        </select>
        <p class="hint">{{ t('assessment.methodHint') }}</p>
      </div>
      <label class="check span-2">
        <input v-model="form.includeAi" type="checkbox" :disabled="disabled" data-testid="m-includeAi" />
        {{ t('assessment.fields.includeAi') }}
      </label>
      <div class="field span-2">
        <label for="m-scope">{{ t('assessment.fields.scope') }}</label>
        <textarea
          id="m-scope"
          v-model="form.scope"
          maxlength="2000"
          :disabled="disabled"
          data-testid="m-scope"
        ></textarea>
      </div>
    </div>
    <button
      v-if="!readonly"
      type="submit"
      class="btn btn-primary-inline"
      :disabled="busy"
      data-testid="m-submit"
    >
      {{ submitLabel }}
    </button>
  </form>
</template>
