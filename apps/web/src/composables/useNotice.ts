import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

export type Notice = { kind: 'info' | 'error'; text: string };

/**
 * Status-/Fehlermeldung eines Admin-Reiters. Fehlercodes des Servers werden über
 * `<prefix>.<code>` übersetzt; unbekannte Codes ergeben die allgemeine Fehlermeldung.
 */
export function useNotice(prefix: string) {
  const { t, te } = useI18n();
  const notice = ref<Notice | null>(null);
  const info = (text: string) => (notice.value = { kind: 'info', text });
  const error = (code?: string) =>
    (notice.value = {
      kind: 'error',
      text: code && te(`${prefix}.${code}`) ? t(`${prefix}.${code}`) : t('common.error'),
    });
  const clear = () => (notice.value = null);
  return { notice, info, error, clear };
}
