<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { COMMENT_MAX } from '@ai-tpi/shared';
import ConfirmDialog from './ConfirmDialog.vue';
import { apiDelete, apiPatch, apiPost } from '../api/client';
import type { CommentItem, Source } from '../api/assessments';
import { formatDateTime } from '../utils/format';

/**
 * Kommentare zu einem Kontrollpunkt (US-3.1): Verfasser wird automatisch gesetzt, Quelle wählbar,
 * höchstens 2000 Zeichen, Text wird nie als HTML ausgegeben (TC-COM-005).
 */
const props = defineProps<{
  assessmentId: string;
  checkpointId: string;
  comments: CommentItem[];
  sources: Source[];
  canComment: boolean;
  canModerate: boolean;
  currentUserId: string;
}>();
const emit = defineEmits<{ changed: [] }>();
const { t, te, locale } = useI18n();

const text = ref('');
const sourceId = ref<string>('');
const err = ref<string | null>(null);
const editing = ref<string | null>(null);
const editText = ref('');
const toDelete = ref<CommentItem | null>(null);
const activeSources = computed(() => props.sources.filter((s) => s.active));
const tooLong = computed(() => text.value.length > COMMENT_MAX);

const message = (code?: string) =>
  code && te(`comments.errors.${code}`) ? t(`comments.errors.${code}`) : t('common.error');

async function add() {
  err.value = null;
  if (!text.value.trim()) return (err.value = t('comments.empty'));
  if (tooLong.value) return (err.value = t('comments.tooLong', { max: COMMENT_MAX }));
  const res = await apiPost(`/api/assessments/${props.assessmentId}/comments`, {
    checkpointId: props.checkpointId,
    text: text.value,
    sourceId: sourceId.value || null,
  });
  if (!res.ok) return (err.value = message(res.error));
  text.value = '';
  sourceId.value = '';
  emit('changed');
}

async function saveEdit(c: CommentItem) {
  if (!editText.value.trim() || editText.value.length > COMMENT_MAX) return;
  const res = await apiPatch(`/api/assessments/${props.assessmentId}/comments/${c.id}`, {
    text: editText.value,
  });
  if (!res.ok) return (err.value = message(res.error));
  editing.value = null;
  emit('changed');
}

async function remove() {
  const c = toDelete.value;
  toDelete.value = null;
  if (!c) return;
  const res = await apiDelete(`/api/assessments/${props.assessmentId}/comments/${c.id}`);
  if (!res.ok) return (err.value = message(res.error));
  emit('changed');
}
</script>

<template>
  <div class="thread" :data-testid="`comments-${checkpointId}`">
    <p v-if="comments.length === 0" class="hint">{{ t('comments.none') }}</p>
    <ul v-else class="list">
      <li v-for="c in comments" :key="c.id" class="comment" data-testid="comment">
        <div class="meta">
          <strong data-testid="comment-author">{{ c.authorName }}</strong>
          <span v-if="c.departmentName">· {{ c.departmentName }}</span>
          <span>· {{ formatDateTime(locale, c.createdAt) }}</span>
          <span v-if="c.updatedAt" class="tag" data-testid="comment-edited">{{ t('comments.edited') }}</span>
          <span v-if="c.sourceName" class="tag" data-testid="comment-source"
            >{{ c.sourceName }}{{ c.sourceRole ? ` (${c.sourceRole})` : '' }}</span
          >
        </div>
        <template v-if="editing === c.id">
          <label class="visually-hidden" :for="`ce-${c.id}`">{{ t('comments.text') }}</label>
          <textarea
            :id="`ce-${c.id}`"
            v-model="editText"
            :maxlength="COMMENT_MAX"
            data-testid="comment-edit-text"
          ></textarea>
          <div class="button-row">
            <button
              type="button"
              class="btn btn-primary-inline btn-small"
              data-testid="comment-edit-save"
              @click="saveEdit(c)"
            >
              {{ t('common.save') }}
            </button>
            <button type="button" class="btn btn-ghost btn-small" @click="editing = null">
              {{ t('common.cancel') }}
            </button>
          </div>
        </template>
        <p v-else class="text" data-testid="comment-text">{{ c.text }}</p>
        <div v-if="canComment && editing !== c.id" class="button-row">
          <button
            v-if="c.authorId === currentUserId"
            type="button"
            class="btn btn-ghost btn-small"
            data-testid="comment-edit"
            @click="((editing = c.id), (editText = c.text))"
          >
            {{ t('common.edit') }}
          </button>
          <button
            v-if="c.authorId === currentUserId || canModerate"
            type="button"
            class="btn btn-ghost btn-small"
            data-testid="comment-delete"
            @click="toDelete = c"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </li>
    </ul>
    <form v-if="canComment" class="add" novalidate data-testid="comment-form" @submit.prevent="add">
      <label :for="`ct-${checkpointId}`">{{ t('comments.add') }}</label>
      <textarea
        :id="`ct-${checkpointId}`"
        v-model="text"
        :aria-invalid="!!err"
        :aria-describedby="`cc-${checkpointId}`"
        data-testid="comment-text-input"
      ></textarea>
      <p :id="`cc-${checkpointId}`" :class="['counter', { over: tooLong }]" data-testid="comment-counter">
        {{ t('comments.counter', { n: text.length, max: COMMENT_MAX }) }}
      </p>
      <div class="inline-form">
        <div class="field">
          <label :for="`cs-${checkpointId}`">{{ t('comments.source') }}</label>
          <select :id="`cs-${checkpointId}`" v-model="sourceId" data-testid="comment-source-select">
            <option value="">{{ t('comments.noSource') }}</option>
            <option v-for="s in activeSources" :key="s.id" :value="s.id">
              {{ s.name }}{{ s.role ? ` (${s.role})` : '' }}
            </option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary-inline" :disabled="tooLong" data-testid="comment-save">
          {{ t('comments.save') }}
        </button>
      </div>
      <p v-if="err" class="error-text" role="alert" data-testid="comment-error">{{ err }}</p>
    </form>
    <ConfirmDialog
      :open="!!toDelete"
      :title="t('comments.deleteTitle')"
      :text="t('comments.deleteText')"
      :confirm-label="t('common.delete')"
      danger
      @confirm="remove"
      @cancel="toDelete = null"
    />
  </div>
</template>

<style scoped>
.thread {
  display: grid;
  gap: 0.5rem;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}
.comment {
  border-left: 3px solid var(--c-border);
  padding: 0.25rem 0 0.25rem 0.75rem;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.4rem;
  align-items: center;
  font-size: 0.9rem;
  color: var(--c-muted);
}
.meta strong {
  color: var(--c-text);
}
.text {
  margin: 0.25rem 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.add {
  display: grid;
  gap: 0.35rem;
}
.counter {
  margin: 0;
  font-size: 0.85rem;
  color: var(--c-muted);
  text-align: right;
}
.counter.over {
  color: var(--c-error);
  font-weight: 700;
}
</style>
