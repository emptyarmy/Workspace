import { createI18n } from 'vue-i18n';
import de from './de.json';
import en from './en.json';

export type Locale = 'de' | 'en';
export const SUPPORTED_LOCALES: Locale[] = ['de', 'en'];
const STORAGE_KEY = 'ai-tpi.locale';

/** Reihenfolge: gespeicherte Wahl → Browsersprache → Deutsch (docs/03_fragenkatalog/03_uebersetzung-i18n.md). */
export function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    /* Speicher nicht verfügbar */
  }
  const browser = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return browser === 'en' ? 'en' : 'de';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* Speicher nicht verfügbar */
  }
  document.documentElement.lang = locale;
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'de',
  messages: { de, en },
  datetimeFormats: {
    de: { short: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } },
    en: { short: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } },
  },
});
