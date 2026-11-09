<script setup lang="ts">
import type { Notice } from '../composables/useNotice';

defineProps<{ notice: Notice | null; testid?: string }>();
</script>

<template>
  <div
    v-if="notice"
    :class="['alert', notice.kind === 'info' ? 'alert-info' : 'alert-error']"
    :role="notice.kind === 'error' ? 'alert' : 'status'"
    :data-testid="testid ?? 'admin-notice'"
  >
    {{ notice.text }}
  </div>
</template>
