<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  assessPassword,
  DEFAULT_PASSWORD_POLICY,
  type PasswordAssessment,
  type PasswordPolicy,
} from '@ai-tpi/shared';

/**
 * Passwortfeld mit dauerhaft sichtbarer Regelliste (live grün bei Erfüllung) und Stärkeanzeige in 3 Stufen (F-07).
 */
const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    userInputs?: string[];
    policy?: PasswordPolicy;
    autocomplete?: string;
  }>(),
  { userInputs: () => [], policy: () => DEFAULT_PASSWORD_POLICY, autocomplete: 'new-password' },
);
const model = defineModel<string>({ required: true });
const emit = defineEmits<{ assessed: [PasswordAssessment] }>();
const { t } = useI18n();
const visible = ref(false);

const assessment = computed(() => assessPassword(model.value, props.userInputs, props.policy));
watch(assessment, (a) => emit('assessed', a), { immediate: true });
const strengthPercent = computed(() => ({ weak: 33, medium: 66, strong: 100 })[assessment.value.strength]);
</script>

<template>
  <div class="field password-field">
    <label :for="id">{{ label }}</label>
    <div class="input-row">
      <input
        :id="id"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :aria-describedby="`${id}-rules ${id}-strength`"
        :data-testid="`${id}-input`"
        spellcheck="false"
        autocapitalize="off"
      />
      <button
        type="button"
        class="btn btn-ghost toggle"
        :aria-pressed="visible"
        :aria-label="visible ? t('password.hide') : t('password.show')"
        :data-testid="`${id}-toggle`"
        @click="visible = !visible"
      >
        <span aria-hidden="true">{{ visible ? '🙈' : '👁' }}</span>
      </button>
    </div>

    <div
      v-if="model.length > 0"
      :id="`${id}-strength`"
      class="strength"
      :data-testid="`${id}-strength`"
      :data-level="assessment.strength"
    >
      <div class="bar" aria-hidden="true">
        <span :style="{ width: strengthPercent + '%' }" :class="assessment.strength"></span>
      </div>
      <span class="strength-text"
        >{{ t('password.strength.label') }}:
        <strong>{{ t(`password.strength.${assessment.strength}`) }}</strong></span
      >
    </div>
    <p v-else :id="`${id}-strength`" class="sr-only"></p>

    <p :id="`${id}-rules-heading`" class="rules-heading">{{ t('password.rulesHeading') }}</p>
    <ul
      :id="`${id}-rules`"
      class="rules"
      :aria-labelledby="`${id}-rules-heading`"
      aria-live="polite"
      :data-testid="`${id}-rules`"
    >
      <li
        v-for="r in assessment.rules"
        :key="r.id"
        :class="{ met: r.met }"
        :data-testid="`rule-${r.id}`"
        :data-met="r.met"
      >
        <span class="icon" aria-hidden="true">{{ r.met ? '✔' : '○' }}</span>
        {{ t(`password.rules.${r.id}`, r.params ?? {}) }}
        <span class="sr-only">({{ r.met ? t('password.ruleMet') : t('password.ruleNotMet') }})</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.input-row {
  display: flex;
  gap: 0.5rem;
}
.toggle {
  flex: 0 0 auto;
}
.strength {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
}
.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--c-border);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  transition: width 0.2s;
}
.bar .weak {
  background: var(--c-error);
}
.bar .medium {
  background: var(--c-warn);
}
.bar .strong {
  background: var(--c-ok);
}
.strength-text {
  font-size: 0.9rem;
  color: var(--c-muted);
}
.rules-heading {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--c-muted);
}
.rules {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.95rem;
}
.rules li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--c-muted);
  padding: 0.1rem 0;
}
.rules li.met {
  color: var(--c-ok);
  font-weight: 600;
}
.icon {
  width: 1.2em;
  text-align: center;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
