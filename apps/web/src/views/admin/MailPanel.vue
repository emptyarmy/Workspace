<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import NoticeBar from '../../components/NoticeBar.vue';
import { apiGet, apiPost, apiPut } from '../../api/client';
import { useNotice } from '../../composables/useNotice';

interface MailConfig {
  transport: 'system' | 'smtp';
  host: string | null;
  port: number | null;
  secure: boolean;
  username: string | null;
  fromAddress: string | null;
  hasPassword: boolean;
  systemTransport: 'sendmail' | 'smtp';
}

const { t } = useI18n();
const { notice, info, error, clear } = useNotice('admin.mail.errors');
const cfg = ref<MailConfig | null>(null);
const form = reactive({
  transport: 'system' as 'system' | 'smtp',
  host: '',
  port: 587 as number | '',
  secure: false,
  username: '',
  password: '',
  fromAddress: '',
});
const errors = reactive<Record<string, string | undefined>>({});
const clearPassword = ref(false);
const testing = ref(false);

async function load() {
  const res = await apiGet<MailConfig>('/api/admin/mail-config');
  cfg.value = res.data;
  if (res.data)
    Object.assign(form, {
      transport: res.data.transport,
      host: res.data.host ?? '',
      port: res.data.port ?? 587,
      secure: res.data.secure,
      username: res.data.username ?? '',
      password: '',
      fromAddress: res.data.fromAddress ?? '',
    });
  clearPassword.value = false;
}
onMounted(load);

function validate() {
  const smtp = form.transport === 'smtp';
  const port = Number(form.port);
  errors.host = smtp && !form.host.trim() ? t('common.required') : undefined;
  errors.port =
    smtp && !(Number.isInteger(port) && port >= 1 && port <= 65535) ? t('admin.mail.errors.port') : undefined;
  errors.fromAddress =
    form.fromAddress && !/@[^\s@]+\.[^\s@]+>?$/.test(form.fromAddress.trim())
      ? t('admin.mail.errors.from')
      : undefined;
  return !Object.values(errors).some(Boolean);
}

async function save() {
  clear();
  if (!validate()) return;
  const body: Record<string, unknown> =
    form.transport === 'smtp'
      ? {
          transport: 'smtp',
          host: form.host.trim(),
          port: Number(form.port),
          secure: form.secure,
          username: form.username.trim() || null,
          fromAddress: form.fromAddress.trim() || null,
        }
      : { transport: 'system', fromAddress: form.fromAddress.trim() || null };
  if (form.password) body.password = form.password;
  else if (clearPassword.value) body.password = null;
  const res = await apiPut<MailConfig>('/api/admin/mail-config', body);
  if (!res.ok) return error(res.status === 400 ? 'invalid_input' : res.error);
  info(t('common.saved'));
  await load();
}

async function sendTest() {
  clear();
  testing.value = true;
  const res = await apiPost<{ to: string; via: string }>('/api/admin/mail-config/test');
  testing.value = false;
  if (res.ok && res.data) info(t('admin.mail.testSent', { to: res.data.to, via: res.data.via }));
  else error(res.error);
}
</script>

<template>
  <div v-if="cfg" class="mail" data-testid="mail-panel">
    <NoticeBar :notice="notice" testid="mail-notice" />
    <form class="card-flat" novalidate @submit.prevent="save">
      <h2>{{ t('admin.mail.heading') }}</h2>
      <p class="hint">{{ t('admin.mail.hint') }}</p>
      <fieldset>
        <legend>{{ t('admin.mail.transport') }}</legend>
        <label class="check">
          <input v-model="form.transport" type="radio" value="system" data-testid="mail-transport-system" />
          {{ t('admin.mail.system', { kind: cfg.systemTransport === 'sendmail' ? 'sendmail' : 'SMTP' }) }}
        </label>
        <label class="check">
          <input v-model="form.transport" type="radio" value="smtp" data-testid="mail-transport-smtp" />
          {{ t('admin.mail.smtp') }}
        </label>
      </fieldset>

      <div v-if="form.transport === 'smtp'" class="form-grid" data-testid="mail-smtp-fields">
        <div class="field">
          <label for="m-host">{{ t('admin.mail.host') }}</label>
          <input
            id="m-host"
            v-model.trim="form.host"
            type="text"
            autocomplete="off"
            placeholder="smtp.firma.de"
            :aria-invalid="!!errors.host"
            data-testid="mail-host"
          />
          <p v-if="errors.host" class="error-text" data-testid="mail-host-error">{{ errors.host }}</p>
        </div>
        <div class="field">
          <label for="m-port">{{ t('admin.mail.port') }}</label>
          <input
            id="m-port"
            v-model.number="form.port"
            type="number"
            min="1"
            max="65535"
            inputmode="numeric"
            :aria-invalid="!!errors.port"
            data-testid="mail-port"
          />
          <p v-if="errors.port" class="error-text" data-testid="mail-port-error">{{ errors.port }}</p>
        </div>
        <label class="check span-2">
          <input v-model="form.secure" type="checkbox" data-testid="mail-secure" />
          {{ t('admin.mail.secure') }}
        </label>
        <div class="field">
          <label for="m-user">{{ t('admin.mail.username') }}</label>
          <input
            id="m-user"
            v-model.trim="form.username"
            type="text"
            autocomplete="off"
            data-testid="mail-username"
          />
        </div>
        <div class="field">
          <label for="m-pass">{{ t('admin.mail.password') }}</label>
          <input
            id="m-pass"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            :placeholder="cfg.hasPassword ? t('admin.mail.passwordStored') : ''"
            data-testid="mail-password"
          />
          <label v-if="cfg.hasPassword" class="check">
            <input v-model="clearPassword" type="checkbox" data-testid="mail-password-clear" />
            {{ t('admin.mail.passwordClear') }}
          </label>
        </div>
      </div>
      <div class="field">
        <label for="m-from">{{ t('admin.mail.from') }}</label>
        <input
          id="m-from"
          v-model="form.fromAddress"
          type="text"
          autocomplete="off"
          placeholder="QS-Team <qs@firma.de>"
          :aria-invalid="!!errors.fromAddress"
          data-testid="mail-from"
        />
        <p v-if="errors.fromAddress" class="error-text" data-testid="mail-from-error">
          {{ errors.fromAddress }}
        </p>
      </div>
      <div class="button-row">
        <button type="submit" class="btn btn-primary-inline" data-testid="mail-save">
          {{ t('common.save') }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="testing"
          data-testid="mail-test"
          @click="sendTest"
        >
          {{ t('admin.mail.test') }}
        </button>
      </div>
      <p class="hint test-hint">{{ t('admin.mail.testHint') }}</p>
    </form>
  </div>
</template>

<style scoped>
.mail {
  max-width: 720px;
}
.test-hint {
  margin-top: 0.75rem;
}
</style>
