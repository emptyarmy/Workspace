<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * Modaler Bestätigungsdialog (FA-8.2a, TC-USR-007…010):
 * Fokus startet auf „Abbrechen“, Esc und Klick außerhalb wirken wie Abbrechen, Fokus bleibt im Dialog (native <dialog>).
 */
const props = defineProps<{
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const { t } = useI18n();
const dlg = ref<HTMLDialogElement | null>(null);
const cancelBtn = ref<HTMLButtonElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (!dlg.value) return;
    if (open && !dlg.value.open) {
      dlg.value.showModal();
      cancelBtn.value?.focus();
    } else if (!open && dlg.value.open) dlg.value.close();
  },
  { immediate: true },
);

function onBackdrop(e: MouseEvent) {
  if (e.target === dlg.value) emit('cancel');
}
</script>

<template>
  <dialog
    ref="dlg"
    class="confirm"
    data-testid="confirm-dialog"
    aria-labelledby="confirm-title"
    aria-describedby="confirm-text"
    @cancel.prevent="emit('cancel')"
    @click="onBackdrop"
  >
    <div class="inner">
      <h2 id="confirm-title">{{ title }}</h2>
      <p id="confirm-text">{{ text }}</p>
      <div class="actions">
        <button
          ref="cancelBtn"
          type="button"
          class="btn btn-ghost"
          data-testid="confirm-cancel"
          @click="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary-inline'"
          data-testid="confirm-ok"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  border: none;
  border-radius: var(--radius);
  padding: 0;
  width: min(92vw, 460px);
  background: var(--c-surface);
  color: var(--c-text);
}
.confirm::backdrop {
  background: rgb(0 0 0 / 0.45);
}
.inner {
  padding: 1.25rem;
}
h2 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 1rem;
}
</style>
