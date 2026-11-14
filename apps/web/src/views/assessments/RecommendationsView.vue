<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { catalog } from '@ai-tpi/catalog';
import { REC_STATUSES, type RecStatus } from '@ai-tpi/shared';
import { apiGet, apiPatch, apiPost, type ApiResult } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { formatDate } from '../../utils/format';

/**
 * Handlungsempfehlungen und Maßnahmenplan (Phase 7, 05_ki-empfehlungen.md).
 * Assessoren wählen das KI-Modul (S-09), sehen vor dem Senden eine Vorschau der Daten und bestätigen;
 * ohne Zustimmung wird nichts gesendet (TC-REC-007). Befragte, Leser und Admins sehen die Liste nur lesend.
 */
interface Rec {
  id: string;
  keyAreaId: string;
  checkpointIds: string[];
  horizon: 'short' | 'long';
  part: 'whole' | 'first_step' | 'full';
  effort: 'S' | 'M' | 'L';
  priority: number;
  title: string;
  text: string;
  ruleText: string;
  nextStep: string | null;
  benefit: string | null;
  metric: string | null;
  ownerRole: string | null;
  origin: 'rule' | 'ai';
  aiModuleName: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  benchmarkGap: number | null;
  status: RecStatus;
  ownerUserId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  edited: boolean;
  version: number;
  createdAt: string;
}
interface ListPayload {
  items: Rec[];
  canEdit: boolean;
  members: { id: string; name: string }[];
}
interface Module {
  id: string;
  name: string;
  mode: 'rules' | 'local' | 'cloud';
  provider: string;
  model: string | null;
  isDefault: boolean;
  sendComments: boolean;
  pseudonymize: boolean;
}
interface Preview {
  mode: string;
  module: Module | null;
  target?: string | null;
  checkpointCount?: number;
  messages?: { system: string; user: string };
}
interface GenerateResult extends ListPayload {
  origin: 'rule' | 'ai';
  notice: string | null;
  noticeDetail?: string;
  status?: number;
  created: number;
  openCount: number;
}

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const lang = computed(() => locale.value as 'de' | 'en');
const auth = useAuthStore();

const data = ref<ListPayload | null>(null);
const loadError = ref<'not_found' | 'forbidden' | null>(null);
const modules = ref<Module[]>([]);
const moduleId = ref('');
const busy = ref(false);
const result = ref<GenerateResult | null>(null);
const message = ref<{ kind: 'info' | 'error'; text: string } | null>(null);
const filter = ref<'all' | 'plan' | 'open'>('all');

const preview = ref<Preview | null>(null);
const dlg = ref<HTMLDialogElement | null>(null);
const cancelBtn = ref<HTMLButtonElement | null>(null);

const editing = ref<string | null>(null);
const draft = reactive({ title: '', text: '' });

async function load() {
  const res = await apiGet<ListPayload>(`/api/assessments/${props.id}/recommendations`);
  if (!res.ok || !res.data) {
    loadError.value = res.status === 403 ? 'forbidden' : 'not_found';
    return;
  }
  data.value = res.data;
  if (res.data.canEdit && !modules.value.length) {
    const m = await apiGet<{ modules: Module[] }>(`/api/assessments/${props.id}/ai-modules`);
    if (m.ok && m.data) {
      modules.value = m.data.modules;
      moduleId.value = m.data.modules.find((x) => x.isDefault)?.id ?? '';
    } else if (m.status === 403) await failed(m, 'generic');
  }
}
onMounted(load);

/**
 * Verständliche Fehlermeldung zu einer fehlgeschlagenen Anfrage. Bei 403 nennt sie den Grund
 * (z. B. Rolle Leser oder Admin nur lesend) und lädt die Liste neu, damit die Bearbeitungselemente verschwinden.
 */
async function failed(res: ApiResult<unknown>, fallback: 'generic' | 'save') {
  if (res.status === 403) {
    const body = (res.data ?? {}) as { reason?: string; role?: string };
    const role = body.role ?? auth.user?.role;
    const reason = ['admin_read_only', 'role_read_only', 'not_assessor'].includes(body.reason ?? '')
      ? body.reason!
      : 'not_assessor';
    message.value = {
      kind: 'error',
      text: t(`recommendations.forbidden.${reason}`, { role: role ? t(`roles.${role}`) : '–' }),
    };
    closePreview();
    editing.value = null;
    await load();
    return;
  }
  message.value = {
    kind: 'error',
    text: res.status === 0 ? t('recommendations.errors.network') : t(`recommendations.errors.${fallback}`),
  };
}

const selectedModule = computed(() => modules.value.find((m) => m.id === moduleId.value) ?? null);
const usesAi = computed(() => !!selectedModule.value && selectedModule.value.mode !== 'rules');

const areaName = (id: string) => catalog.keyAreas.find((k) => k.id === id)?.name[lang.value] ?? id;
const visible = computed(() =>
  (data.value?.items ?? []).filter((r) =>
    filter.value === 'plan'
      ? ['accepted', 'in_progress', 'done'].includes(r.status)
      : filter.value === 'open'
        ? r.status === 'proposed'
        : true,
  ),
);
const byHorizon = (h: 'short' | 'long') => visible.value.filter((r) => r.horizon === h);

/** Schritt 1: Bei KI-Modulen zuerst die Vorschau zeigen; ohne KI direkt erzeugen. */
async function start() {
  message.value = null;
  if (!usesAi.value) return generate(false);
  busy.value = true;
  const res = await apiPost<Preview>(`/api/assessments/${props.id}/recommendations/preview`, {
    moduleId: moduleId.value,
    lang: lang.value,
  });
  busy.value = false;
  if (!res.ok || !res.data) return failed(res, 'generic');
  preview.value = res.data;
  await nextTick();
  dlg.value?.showModal();
  cancelBtn.value?.focus();
}
function closePreview() {
  dlg.value?.close();
  preview.value = null;
}
/** Abbrechen im Datenschutz-Dialog: keine Anfrage an den Server, also auch kein KI-Aufruf. */
function decline() {
  closePreview();
  message.value = { kind: 'info', text: t('recommendations.declined') };
}
async function consent() {
  closePreview();
  await generate(true);
}

async function generate(withConsent: boolean) {
  busy.value = true;
  const res = await apiPost<GenerateResult>(`/api/assessments/${props.id}/recommendations/generate`, {
    moduleId: moduleId.value || null,
    lang: lang.value,
    ...(withConsent ? { consent: true } : {}),
  });
  busy.value = false;
  if (!res.ok || !res.data) return failed(res, 'generic');
  result.value = res.data;
  data.value = { items: res.data.items, canEdit: res.data.canEdit, members: res.data.members };
  filter.value = 'all';
  const n = res.data.notice;
  if (n === 'nothing_to_do') message.value = { kind: 'info', text: t('recommendations.nothingToDo') };
  else if (n?.startsWith('ai_'))
    message.value = {
      kind: 'error',
      text: `${t(`recommendations.aiErrors.${n.slice(3)}`, { status: res.data.status ?? '' })} ${t('recommendations.fallback')}`,
    };
  else message.value = { kind: 'info', text: t('recommendations.generated', { n: res.data.created }) };
}

/**
 * Änderungen je Empfehlung nacheinander speichern, jeweils mit der aktuellen Version
 * (schnelle Folgeänderungen, z. B. doppelte change-Ereignisse, führen sonst zu Scheinkonflikten).
 */
const queues = new Map<string, Promise<unknown>>();
function patch(r: Rec, changes: Partial<Rec>): Promise<boolean> {
  const next = (queues.get(r.id) ?? Promise.resolve()).then(() => doPatch(r.id, changes));
  queues.set(
    r.id,
    next.catch(() => undefined),
  );
  return next;
}
async function doPatch(id: string, changes: Partial<Rec>): Promise<boolean> {
  const cur = data.value?.items.find((x) => x.id === id);
  if (!cur) return false;
  const diff = Object.fromEntries(
    Object.entries(changes).filter(([k, v]) => (cur as unknown as Record<string, unknown>)[k] !== v),
  );
  if (!Object.keys(diff).length) return true;
  const res = await apiPatch<Rec>(`/api/assessments/${props.id}/recommendations/${id}`, {
    version: cur.version,
    ...diff,
  });
  if (res.status === 409) {
    message.value = { kind: 'error', text: t('recommendations.conflict') };
    await load();
    return false;
  }
  if (!res.ok || !res.data) {
    await failed(res, 'save');
    return false;
  }
  const list = data.value!.items;
  list.splice(
    list.findIndex((x) => x.id === id),
    1,
    res.data,
  );
  message.value = { kind: 'info', text: t('recommendations.saved') };
  return true;
}

function startEdit(r: Rec) {
  editing.value = r.id;
  draft.title = r.title;
  draft.text = r.text;
}
async function saveEdit(r: Rec) {
  if (!draft.title.trim() || !draft.text.trim()) return;
  if (await patch(r, { title: draft.title.trim(), text: draft.text.trim() })) editing.value = null;
}

const aiLabel = (r: Rec) =>
  t('recommendations.aiGenerated', {
    model: [r.aiModuleName, r.aiModel].filter(Boolean).join(' · '),
    date: formatDate(locale.value, r.createdAt.slice(0, 10)),
  });
</script>

<template>
  <section class="recs" data-testid="recommendations">
    <RouterLink :to="{ name: 'assessment', params: { id } }">← {{ t('common.back') }}</RouterLink>
    <div v-if="loadError" class="alert alert-error" role="alert" data-testid="recs-error">
      {{ loadError === 'forbidden' ? t('assessment.forbidden') : t('assessment.notFound') }}
    </div>
    <template v-else-if="data">
      <h1>{{ t('recommendations.heading') }}</h1>
      <p class="hint">{{ t('recommendations.intro') }}</p>

      <form v-if="data.canEdit" class="card generate" data-testid="recs-generate" @submit.prevent="start">
        <div class="field">
          <label for="rec-module">{{ t('recommendations.module') }}</label>
          <select id="rec-module" v-model="moduleId" data-testid="recs-module">
            <option value="">{{ t('recommendations.rulesOnly') }}</option>
            <option v-for="m in modules" :key="m.id" :value="m.id">
              {{ m.name }}{{ m.mode === 'rules' ? '' : ` (${m.provider}${m.model ? ` · ${m.model}` : ''})` }}
              {{ m.isDefault ? `– ${t('recommendations.default')}` : '' }}
            </option>
          </select>
        </div>
        <p class="hint">
          {{ usesAi ? t('recommendations.aiHint') : t('recommendations.rulesHint') }}
        </p>
        <button type="submit" class="btn btn-primary-inline" :disabled="busy" data-testid="recs-start">
          {{ busy ? t('recommendations.generating') : t('recommendations.generate') }}
        </button>
      </form>
      <p v-else class="hint" data-testid="recs-readonly">
        {{ auth.user?.role === 'admin' ? t('recommendations.readOnlyAdmin') : t('recommendations.readOnly') }}
      </p>

      <div
        v-if="message"
        :class="['alert', message.kind === 'info' ? 'alert-info' : 'alert-error']"
        :role="message.kind === 'error' ? 'alert' : 'status'"
        data-testid="recs-notice"
      >
        {{ message.text }}
        <ul v-if="result?.notice === 'nothing_to_do'" class="tips">
          <li>{{ t('recommendations.tips.repeat') }}</li>
          <li>{{ t('recommendations.tips.benchmark') }}</li>
          <li>{{ t('recommendations.tips.ai') }}</li>
        </ul>
      </div>
      <p v-if="result && result.openCount > 0" class="hint" data-testid="recs-open">
        {{ t('recommendations.openHint', { n: result.openCount }) }}
      </p>

      <div v-if="data.items.length" class="filter">
        <label for="rec-filter">{{ t('recommendations.filter.label') }}</label>
        <select id="rec-filter" v-model="filter" data-testid="recs-filter">
          <option value="all">{{ t('recommendations.filter.all') }}</option>
          <option value="open">{{ t('recommendations.filter.open') }}</option>
          <option value="plan">{{ t('recommendations.filter.plan') }}</option>
        </select>
      </div>
      <p v-else-if="!message" class="empty-text" data-testid="recs-empty">{{ t('recommendations.empty') }}</p>

      <template v-for="h in ['short', 'long'] as const" :key="h">
        <section v-if="data.items.length" class="horizon" :data-testid="`recs-${h}`">
          <h2>{{ t(`recommendations.horizon.${h}`) }}</h2>
          <p v-if="!byHorizon(h).length" class="empty-text">{{ t('recommendations.none') }}</p>
          <article
            v-for="r in byHorizon(h)"
            :key="r.id"
            :class="['card', 'rec', `st-${r.status}`]"
            data-testid="rec-card"
            :data-checkpoints="r.checkpointIds.join(' ')"
          >
            <header class="rec-head">
              <span class="prio" :aria-label="t('recommendations.priority')">{{ r.priority }}</span>
              <div class="rec-title">
                <h3 v-if="editing !== r.id" data-testid="rec-title">{{ r.title }}</h3>
                <div class="badges">
                  <span v-if="r.origin === 'ai'" class="tag tag-warn" data-testid="rec-ai">{{
                    aiLabel(r)
                  }}</span>
                  <span v-else class="tag" data-testid="rec-rule">{{ t('recommendations.ruleBased') }}</span>
                  <span
                    :class="[
                      'tag',
                      r.status === 'rejected' ? 'tag-error' : r.status === 'proposed' ? '' : 'tag-ok',
                    ]"
                    data-testid="rec-status"
                  >
                    {{ t(`recommendations.status.${r.status}`) }}
                  </span>
                  <span class="tag">{{ t('recommendations.effort', { e: r.effort }) }}</span>
                  <span v-if="r.edited" class="tag">{{ t('recommendations.edited') }}</span>
                </div>
              </div>
            </header>

            <form v-if="editing === r.id" class="edit" data-testid="rec-edit" @submit.prevent="saveEdit(r)">
              <div class="field">
                <label :for="`t-${r.id}`">{{ t('recommendations.fields.title') }}</label>
                <input
                  :id="`t-${r.id}`"
                  v-model="draft.title"
                  maxlength="200"
                  required
                  data-testid="rec-edit-title"
                />
              </div>
              <div class="field">
                <label :for="`x-${r.id}`">{{ t('recommendations.fields.text') }}</label>
                <textarea
                  :id="`x-${r.id}`"
                  v-model="draft.text"
                  rows="5"
                  maxlength="4000"
                  required
                  data-testid="rec-edit-text"
                />
              </div>
              <div class="button-row">
                <button type="submit" class="btn btn-primary-inline btn-small" data-testid="rec-edit-save">
                  {{ t('common.save') }}
                </button>
                <button type="button" class="btn btn-ghost btn-small" @click="editing = null">
                  {{ t('common.cancel') }}
                </button>
              </div>
            </form>
            <p v-else class="rec-text" data-testid="rec-text">{{ r.text }}</p>

            <dl v-if="r.nextStep || r.benefit || r.metric || r.ownerRole" class="facts">
              <template v-if="r.nextStep"
                ><dt>{{ t('recommendations.fields.nextStep') }}</dt>
                <dd>{{ r.nextStep }}</dd></template
              >
              <template v-if="r.benefit"
                ><dt>{{ t('recommendations.fields.benefit') }}</dt>
                <dd>{{ r.benefit }}</dd></template
              >
              <template v-if="r.metric"
                ><dt>{{ t('recommendations.fields.metric') }}</dt>
                <dd>{{ r.metric }}</dd></template
              >
              <template v-if="r.ownerRole"
                ><dt>{{ t('recommendations.fields.ownerRole') }}</dt>
                <dd>{{ r.ownerRole }}</dd></template
              >
            </dl>
            <p class="refs">
              {{ areaName(r.keyAreaId) }} ·
              <span data-testid="rec-refs">{{ r.checkpointIds.join(', ') }}</span>
              <template v-if="r.benchmarkGap !== null && r.benchmarkGap > 0">
                · {{ t('recommendations.gap', { n: r.benchmarkGap.toLocaleString(locale) }) }}
              </template>
            </p>
            <details v-if="r.origin === 'ai' || r.edited" class="rule-text">
              <summary>{{ t('recommendations.ruleText') }}</summary>
              <p>{{ r.ruleText }}</p>
            </details>

            <div v-if="data.canEdit" class="plan">
              <div class="field">
                <label :for="`s-${r.id}`">{{ t('recommendations.fields.status') }}</label>
                <select
                  :id="`s-${r.id}`"
                  :value="r.status"
                  data-testid="rec-status-select"
                  @change="patch(r, { status: ($event.target as HTMLSelectElement).value as RecStatus })"
                >
                  <option v-for="s in REC_STATUSES" :key="s" :value="s">
                    {{ t(`recommendations.status.${s}`) }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label :for="`o-${r.id}`">{{ t('recommendations.fields.owner') }}</label>
                <select
                  :id="`o-${r.id}`"
                  :value="r.ownerUserId ?? ''"
                  data-testid="rec-owner"
                  @change="patch(r, { ownerUserId: ($event.target as HTMLSelectElement).value || null })"
                >
                  <option value="">–</option>
                  <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.name }}</option>
                </select>
              </div>
              <div class="field">
                <label :for="`d-${r.id}`">{{ t('recommendations.fields.due') }}</label>
                <input
                  :id="`d-${r.id}`"
                  type="date"
                  :value="r.dueDate ?? ''"
                  data-testid="rec-due"
                  @change="patch(r, { dueDate: ($event.target as HTMLInputElement).value || null })"
                />
              </div>
              <div class="button-row">
                <button
                  v-if="r.status === 'proposed'"
                  type="button"
                  class="btn btn-primary-inline btn-small"
                  data-testid="rec-accept"
                  @click="patch(r, { status: 'accepted' })"
                >
                  {{ t('recommendations.accept') }}
                </button>
                <button
                  v-if="r.status !== 'rejected'"
                  type="button"
                  class="btn btn-ghost btn-small"
                  data-testid="rec-reject"
                  @click="patch(r, { status: 'rejected' })"
                >
                  {{ t('recommendations.reject') }}
                </button>
                <button
                  v-if="editing !== r.id"
                  type="button"
                  class="btn btn-ghost btn-small"
                  data-testid="rec-edit-start"
                  @click="startEdit(r)"
                >
                  {{ t('recommendations.edit') }}
                </button>
              </div>
            </div>
            <p v-else-if="r.ownerName || r.dueDate" class="refs">
              {{ t('recommendations.fields.owner') }}: {{ r.ownerName ?? '–' }}
              <template v-if="r.dueDate">
                · {{ t('recommendations.fields.due') }}: {{ formatDate(locale, r.dueDate) }}</template
              >
            </p>
          </article>
        </section>
      </template>
    </template>

    <!-- Datenschutz: Vorschau der übertragenen Daten vor dem Senden (05_ki-empfehlungen.md, Abschnitt 3). -->
    <dialog
      ref="dlg"
      class="consent"
      data-testid="recs-consent"
      aria-labelledby="consent-title"
      @cancel.prevent="decline"
    >
      <div v-if="preview" class="inner">
        <h2 id="consent-title">{{ t('recommendations.consent.title') }}</h2>
        <p>
          {{
            t('recommendations.consent.text', {
              module: preview.module?.name ?? '',
              target: preview.target ?? '–',
            })
          }}
        </p>
        <ul class="consent-facts">
          <li>{{ t('recommendations.consent.model', { model: preview.module?.model || '–' }) }}</li>
          <li>{{ t('recommendations.consent.count', { n: preview.checkpointCount ?? 0 }) }}</li>
          <li>
            {{
              preview.module?.sendComments
                ? preview.module.pseudonymize
                  ? t('recommendations.consent.commentsPseudo')
                  : t('recommendations.consent.comments')
                : t('recommendations.consent.noComments')
            }}
          </li>
          <li>{{ t('recommendations.consent.noNames') }}</li>
        </ul>
        <details open>
          <summary>{{ t('recommendations.consent.preview') }}</summary>
          <pre class="payload" tabindex="0" data-testid="recs-payload">{{ preview.messages?.user }}</pre>
        </details>
        <div class="button-row">
          <button
            ref="cancelBtn"
            type="button"
            class="btn btn-ghost"
            data-testid="recs-decline"
            @click="decline"
          >
            {{ t('recommendations.consent.decline') }}
          </button>
          <button type="button" class="btn btn-primary-inline" data-testid="recs-consent-ok" @click="consent">
            {{ t('recommendations.consent.accept') }}
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.recs {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
}
h1 {
  margin: 0;
}
.generate {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}
.generate .field {
  width: 100%;
  max-width: 32rem;
}
.generate select {
  width: 100%;
}
.filter {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.tips {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.horizon {
  display: grid;
  gap: 0.75rem;
}
.horizon h2 {
  margin: 0.5rem 0 0;
}
.rec {
  display: grid;
  gap: 0.5rem;
}
.rec.st-rejected {
  opacity: 0.65;
}
.rec-head {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}
.prio {
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  background: var(--c-primary);
  color: var(--c-primary-contrast);
}
.rec-title {
  min-width: 0;
  flex: 1;
}
.rec-title h3 {
  margin: 0 0 0.25rem;
  overflow-wrap: anywhere;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.rec-text,
.rule-text p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
.refs {
  margin: 0;
  font-size: 0.9rem;
  color: var(--c-muted, #555);
  overflow-wrap: anywhere;
}
.facts {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.25rem 0.75rem;
  margin: 0;
}
.facts dt {
  font-weight: 600;
}
.facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.plan {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: flex-end;
  border-top: 1px solid var(--c-border, #ddd);
  padding-top: 0.5rem;
}
.plan .field {
  margin: 0;
  min-width: 10rem;
}
.edit textarea,
.edit input {
  width: 100%;
}
.consent {
  max-width: min(720px, calc(100vw - 2rem));
  width: 100%;
  border: 0;
  border-radius: var(--radius);
  padding: 0;
}
.consent::backdrop {
  background: rgb(0 0 0 / 40%);
}
.consent .inner {
  padding: 1rem 1.25rem;
  display: grid;
  gap: 0.5rem;
}
.consent h2 {
  margin: 0;
}
.consent-facts {
  margin: 0;
  padding-left: 1.25rem;
}
.payload {
  max-height: 40dvh;
  overflow: auto;
  background: var(--c-bg, #f5f5f5);
  padding: 0.5rem;
  font-size: 0.8rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .plan .field {
    min-width: 0;
    flex: 1 1 100%;
  }
  .facts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
