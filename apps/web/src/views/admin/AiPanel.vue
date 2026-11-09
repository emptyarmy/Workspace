<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

type Mode = 'rules' | 'local' | 'cloud';
interface AiModule {
  id: string;
  name: string;
  mode: Mode;
  provider: string;
  baseUrl: string | null;
  model: string | null;
  temperature: number;
  maxTokens: number;
  timeoutSec: number;
  sendComments: boolean;
  pseudonymize: boolean;
  promptTemplate: string | null;
  isDefault: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
}
interface TestResult {
  ok: boolean;
  ms: number;
  status?: number;
  error?: string;
}

/** Anbieter je Modus und vorgeschlagene Basis-URL (ADR-004). */
const PROVIDERS: Record<Mode, string[]> = {
  rules: ['rules'],
  local: ['ollama', 'lmstudio', 'openai_compatible'],
  cloud: ['anthropic', 'openai', 'azure_openai', 'openai_compatible'],
};
const DEFAULT_URL: Record<string, string> = {
  ollama: 'http://localhost:11434',
  lmstudio: 'http://localhost:1234/v1',
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
};

const { t } = useI18n();
const { notice, info, error, clear } = useNotice('admin.ai.errors');
const modules = ref<AiModule[]>([]);
const results = reactive<Record<string, TestResult>>({});
const editingId = ref<string | null>(null);
const showForm = ref(false);
const toDelete = ref<AiModule | null>(null);
const errors = reactive<Record<string, string | undefined>>({});

const blank = () => ({
  name: '',
  mode: 'local' as Mode,
  provider: 'ollama',
  baseUrl: DEFAULT_URL.ollama ?? '',
  model: '',
  apiKey: '',
  clearKey: false,
  temperature: 0.2,
  maxTokens: 2000,
  timeoutSec: 60,
  sendComments: false,
  pseudonymize: true,
  promptTemplate: '',
  isDefault: false,
});
const form = reactive(blank());
const editing = computed(() => modules.value.find((m) => m.id === editingId.value) ?? null);

watch(
  () => form.mode,
  (mode) => {
    if (!PROVIDERS[mode].includes(form.provider)) form.provider = PROVIDERS[mode][0]!;
  },
);
watch(
  () => form.provider,
  (p, old) => {
    // Vorschlag nur übernehmen, wenn die URL leer ist oder noch der Vorschlag des alten Anbieters war.
    if (!form.baseUrl || form.baseUrl === DEFAULT_URL[old ?? '']) form.baseUrl = DEFAULT_URL[p] ?? '';
  },
);

async function load() {
  modules.value = (await apiGet<AiModule[]>('/api/admin/ai-modules')).data ?? [];
}
onMounted(load);

function openCreate() {
  clear();
  Object.assign(form, blank());
  editingId.value = null;
  showForm.value = true;
}
function openEdit(m: AiModule) {
  clear();
  Object.assign(form, {
    ...blank(),
    name: m.name,
    mode: m.mode,
    provider: m.provider,
    baseUrl: m.baseUrl ?? '',
    model: m.model ?? '',
    temperature: m.temperature,
    maxTokens: m.maxTokens,
    timeoutSec: m.timeoutSec,
    sendComments: m.sendComments,
    pseudonymize: m.pseudonymize,
    promptTemplate: m.promptTemplate ?? '',
    isDefault: m.isDefault,
  });
  editingId.value = m.id;
  showForm.value = true;
}

function validate() {
  const rules = form.mode === 'rules';
  errors.name = form.name.trim().length >= 2 ? undefined : t('common.required');
  errors.baseUrl =
    !rules && !/^https?:\/\/\S+$/i.test(form.baseUrl.trim()) ? t('admin.ai.errors.baseUrl') : undefined;
  errors.temperature =
    form.temperature >= 0 && form.temperature <= 1 ? undefined : t('admin.ai.errors.temperature');
  errors.timeoutSec =
    Number.isInteger(form.timeoutSec) && form.timeoutSec >= 5 && form.timeoutSec <= 300
      ? undefined
      : t('admin.ai.errors.timeoutSec');
  errors.maxTokens =
    Number.isInteger(form.maxTokens) && form.maxTokens >= 1 && form.maxTokens <= 200000
      ? undefined
      : t('admin.ai.errors.maxTokens');
  return !Object.values(errors).some(Boolean);
}

async function save() {
  clear();
  if (!validate()) return;
  const rules = form.mode === 'rules';
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    mode: form.mode,
    provider: rules ? 'rules' : form.provider,
    baseUrl: rules ? null : form.baseUrl.trim(),
    model: form.model.trim() || null,
    temperature: form.temperature,
    maxTokens: form.maxTokens,
    timeoutSec: form.timeoutSec,
    sendComments: form.sendComments,
    pseudonymize: form.pseudonymize,
    promptTemplate: form.promptTemplate.trim() || null,
  };
  if (form.isDefault) body.isDefault = true;
  if (!rules && form.apiKey.trim()) body.apiKey = form.apiKey.trim();
  else if (form.clearKey) body.apiKey = null;
  const res = editingId.value
    ? await apiPatch<AiModule>(`/api/admin/ai-modules/${editingId.value}`, body)
    : await apiPost<AiModule>('/api/admin/ai-modules', body);
  if (!res.ok) return error(res.error);
  info(t(editingId.value ? 'common.saved' : 'admin.ai.created'));
  showForm.value = false;
  editingId.value = null;
  await load();
}

async function test(m: AiModule) {
  delete results[m.id];
  const res = await apiPost<TestResult>(`/api/admin/ai-modules/${m.id}/test`);
  if (res.ok && res.data) results[m.id] = res.data;
  else error(res.error);
}

async function makeDefault(m: AiModule) {
  const res = await apiPatch(`/api/admin/ai-modules/${m.id}`, { isDefault: true });
  if (!res.ok) return error(res.error);
  info(t('common.saved'));
  await load();
}

async function remove() {
  const m = toDelete.value;
  toDelete.value = null;
  if (!m) return;
  const res = await apiDelete(`/api/admin/ai-modules/${m.id}`);
  if (!res.ok) return error(res.error);
  info(t('admin.ai.deleted'));
  await load();
}

const resultText = (r: TestResult) =>
  r.ok
    ? t('admin.ai.testOk', { ms: r.ms })
    : t(`admin.ai.testErrors.${r.error ?? 'http_error'}`, { status: r.status ?? '' });
</script>

<template>
  <div class="ai" data-testid="ai-panel">
    <p class="hint">{{ t('admin.ai.intro') }}</p>
    <NoticeBar :notice="notice" testid="ai-notice" />

    <ul class="row-list" data-testid="ai-list">
      <li v-if="modules.length === 0" class="empty-text">{{ t('admin.ai.empty') }}</li>
      <li v-for="m in modules" :key="m.id" class="row-item" :data-testid="`ai-row-${m.name}`">
        <div class="row-main">
          <strong>
            {{ m.name }}
            <span v-if="m.isDefault" class="tag tag-ok" data-testid="ai-default">{{
              t('admin.ai.default')
            }}</span>
          </strong>
          <span class="row-sub">
            {{ t(`admin.ai.modes.${m.mode}`)
            }}<template v-if="m.mode !== 'rules'">
              · {{ t(`admin.ai.providers.${m.provider}`) }} · {{ m.model || '–' }} · {{ m.baseUrl }}</template
            >
          </span>
          <span v-if="m.hasApiKey" class="row-sub" data-testid="ai-key-masked">
            {{ t('admin.ai.apiKey') }}: {{ m.apiKeyMasked }}
          </span>
          <span
            v-if="results[m.id]"
            :class="['tag', results[m.id]!.ok ? 'tag-ok' : 'tag-error']"
            role="status"
            data-testid="ai-test-result"
            >{{ resultText(results[m.id]!) }}</span
          >
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost" data-testid="ai-test" @click="test(m)">
            {{ t('admin.ai.test') }}
          </button>
          <button
            v-if="!m.isDefault"
            type="button"
            class="btn btn-ghost"
            data-testid="ai-make-default"
            @click="makeDefault(m)"
          >
            {{ t('admin.ai.makeDefault') }}
          </button>
          <button type="button" class="btn btn-ghost" data-testid="ai-edit" @click="openEdit(m)">
            {{ t('admin.ai.edit') }}
          </button>
          <button type="button" class="btn btn-danger" data-testid="ai-delete" @click="toDelete = m">
            {{ t('admin.users.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <div class="button-row add-row">
      <button
        v-if="!showForm"
        type="button"
        class="btn btn-primary-inline"
        data-testid="ai-add"
        @click="openCreate"
      >
        {{ t('admin.ai.add') }}
      </button>
    </div>

    <form v-if="showForm" class="card-flat ai-form" novalidate data-testid="ai-form" @submit.prevent="save">
      <h2>{{ editing ? t('admin.ai.editTitle', { name: editing.name }) : t('admin.ai.add') }}</h2>
      <div class="form-grid">
        <div class="field">
          <label for="ai-name">{{ t('admin.ai.name') }}</label>
          <input
            id="ai-name"
            v-model="form.name"
            type="text"
            maxlength="60"
            :aria-invalid="!!errors.name"
            data-testid="ai-name"
          />
          <p v-if="errors.name" class="error-text">{{ errors.name }}</p>
        </div>
        <div class="field">
          <label for="ai-mode">{{ t('admin.ai.mode') }}</label>
          <select id="ai-mode" v-model="form.mode" data-testid="ai-mode">
            <option v-for="mo in ['rules', 'local', 'cloud'] as const" :key="mo" :value="mo">
              {{ t(`admin.ai.modes.${mo}`) }}
            </option>
          </select>
        </div>
        <template v-if="form.mode !== 'rules'">
          <div class="field">
            <label for="ai-provider">{{ t('admin.ai.provider') }}</label>
            <select id="ai-provider" v-model="form.provider" data-testid="ai-provider">
              <option v-for="p in PROVIDERS[form.mode]" :key="p" :value="p">
                {{ t(`admin.ai.providers.${p}`) }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="ai-model">{{ t('admin.ai.model') }}</label>
            <input
              id="ai-model"
              v-model.trim="form.model"
              type="text"
              autocomplete="off"
              data-testid="ai-model"
            />
          </div>
          <div class="field span-2">
            <label for="ai-url">{{ t('admin.ai.baseUrl') }}</label>
            <input
              id="ai-url"
              v-model.trim="form.baseUrl"
              type="url"
              inputmode="url"
              :aria-invalid="!!errors.baseUrl"
              data-testid="ai-base-url"
            />
            <p v-if="errors.baseUrl" class="error-text" data-testid="ai-base-url-error">
              {{ errors.baseUrl }}
            </p>
          </div>
          <div class="field span-2">
            <label for="ai-key">{{ t('admin.ai.apiKey') }}</label>
            <input
              id="ai-key"
              v-model="form.apiKey"
              type="password"
              autocomplete="new-password"
              :placeholder="
                editing?.hasApiKey ? t('admin.ai.keyStored', { masked: editing.apiKeyMasked }) : ''
              "
              data-testid="ai-api-key"
            />
            <p class="hint">{{ t('admin.ai.keyHint') }}</p>
            <label v-if="editing?.hasApiKey" class="check">
              <input v-model="form.clearKey" type="checkbox" data-testid="ai-key-clear" />
              {{ t('admin.ai.keyClear') }}
            </label>
          </div>
        </template>
        <div class="field">
          <label for="ai-temp">{{ t('admin.ai.temperature') }}</label>
          <input
            id="ai-temp"
            v-model.number="form.temperature"
            type="number"
            min="0"
            max="1"
            step="0.1"
            :aria-invalid="!!errors.temperature"
            data-testid="ai-temperature"
          />
          <p v-if="errors.temperature" class="error-text" data-testid="ai-temperature-error">
            {{ errors.temperature }}
          </p>
        </div>
        <div class="field">
          <label for="ai-timeout">{{ t('admin.ai.timeout') }}</label>
          <input
            id="ai-timeout"
            v-model.number="form.timeoutSec"
            type="number"
            min="5"
            max="300"
            :aria-invalid="!!errors.timeoutSec"
            data-testid="ai-timeout"
          />
          <p v-if="errors.timeoutSec" class="error-text" data-testid="ai-timeout-error">
            {{ errors.timeoutSec }}
          </p>
        </div>
        <div class="field">
          <label for="ai-tokens">{{ t('admin.ai.maxTokens') }}</label>
          <input
            id="ai-tokens"
            v-model.number="form.maxTokens"
            type="number"
            min="1"
            max="200000"
            :aria-invalid="!!errors.maxTokens"
            data-testid="ai-max-tokens"
          />
          <p v-if="errors.maxTokens" class="error-text">{{ errors.maxTokens }}</p>
        </div>
        <div class="field checks">
          <label class="check">
            <input v-model="form.pseudonymize" type="checkbox" data-testid="ai-pseudonymize" />
            {{ t('admin.ai.pseudonymize') }}
          </label>
          <label class="check">
            <input v-model="form.sendComments" type="checkbox" data-testid="ai-send-comments" />
            {{ t('admin.ai.sendComments') }}
          </label>
          <label class="check">
            <input
              v-model="form.isDefault"
              type="checkbox"
              :disabled="editing?.isDefault"
              data-testid="ai-is-default"
            />
            {{ t('admin.ai.isDefault') }}
          </label>
        </div>
        <div class="field span-2">
          <label for="ai-prompt">{{ t('admin.ai.prompt') }}</label>
          <textarea id="ai-prompt" v-model="form.promptTemplate" rows="4" data-testid="ai-prompt"></textarea>
          <p class="hint">{{ t('admin.ai.promptHint') }}</p>
        </div>
      </div>
      <div class="button-row">
        <button type="submit" class="btn btn-primary-inline" data-testid="ai-save">
          {{ t('common.save') }}
        </button>
        <button type="button" class="btn btn-ghost" data-testid="ai-cancel" @click="showForm = false">
          {{ t('common.cancel') }}
        </button>
      </div>
    </form>

    <ConfirmDialog
      :open="!!toDelete"
      danger
      :title="t('admin.ai.deleteTitle')"
      :text="toDelete ? t('admin.ai.deleteText', { name: toDelete.name }) : ''"
      :confirm-label="t('admin.confirm.deleteConfirm')"
      @confirm="remove"
      @cancel="toDelete = null"
    />
  </div>
</template>

<style scoped>
.ai {
  max-width: 900px;
}
.add-row {
  margin: 1rem 0;
}
.checks {
  justify-content: center;
}
</style>
