import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVER_HOST: z.string().default('127.0.0.1'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().optional(),
  SETUP_ENABLED: bool.default(true),
  /** Basis-URL der Weboberfläche für Links in E-Mails. */
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:5173'),
  /** sendmail = Mailversand des Betriebssystems, smtp = SMTP (lokal Mailpit), memory = nur Tests */
  MAIL_TRANSPORT: z.enum(['smtp', 'sendmail', 'memory']).default('smtp'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  MAIL_FROM: z.string().default('AI_TPI <no-reply@ai-tpi.local>'),
  /** Sitzungs-Cookie nur über HTTPS. Ohne Angabe: in production an, sonst aus. */
  COOKIE_SECURE: bool.optional(),
  /** Protokollstufe (JSON-Protokoll auf stdout). Ohne Angabe: development info, production info, test aus. */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  /**
   * Anfragen je Minute und Client-Adresse an Anmeldung, „Passwort vergessen“ und Passwort setzen; 0 = aus.
   * Ohne Angabe: 30 (in NODE_ENV=test aus, damit parallele Tests nicht ausgebremst werden).
   */
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(0).optional(),
  /** „Passwort vergessen“-Mails je E-Mail-Adresse in 15 Minuten; darüber wird still nichts versendet; 0 = aus. Ohne Angabe: 3 (test: aus). */
  RESET_MAILS_PER_15_MIN: z.coerce.number().int().min(0).optional(),
  /**
   * Schlüssel zum Verschlüsseln von Geheimnissen in der DB (SMTP-Passwort, KI-API-Schlüssel), mind. 32 Zeichen.
   * In production Pflicht; in Entwicklung/Test wird ein fester Schlüssel verwendet. Leer = nicht gesetzt.
   */
  SECRET_ENCRYPTION_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32).optional()),
  /**
   * Hinter einem Reverse Proxy auf true setzen: Dann gilt die Client-Adresse aus X-Forwarded-For
   * (für Rate-Limits und Audit-Log). Die Ersteinrichtung prüft unabhängig davon immer die Socket-Adresse.
   */
  TRUST_PROXY: bool.default(false),
  /**
   * Ordner der gebauten Weboberfläche (apps/web/dist). Gesetzt → der Server liefert die Oberfläche selbst aus
   * (Produktion, Container); leer → nur API (Entwicklung mit Vite).
   */
  WEB_DIST_DIR: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  /** Testendpunkte (/api/test/*) – nur zusammen mit NODE_ENV=test aktiv. */
  TEST_ENDPOINTS: bool.default(false),
});

export type AppConfig = Omit<
  z.infer<typeof envSchema>,
  'COOKIE_SECURE' | 'AUTH_RATE_LIMIT_PER_MIN' | 'RESET_MAILS_PER_15_MIN'
> & { COOKIE_SECURE: boolean; AUTH_RATE_LIMIT_PER_MIN: number; RESET_MAILS_PER_15_MIN: number };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Ungültige Konfiguration: ${parsed.error.message}`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.SECRET_ENCRYPTION_KEY) {
    throw new Error(
      'Ungültige Konfiguration: SECRET_ENCRYPTION_KEY (mind. 32 Zeichen) ist in production Pflicht.',
    );
  }
  const d = parsed.data;
  const test = d.NODE_ENV === 'test';
  return {
    ...d,
    COOKIE_SECURE: d.COOKIE_SECURE ?? d.NODE_ENV === 'production',
    AUTH_RATE_LIMIT_PER_MIN: d.AUTH_RATE_LIMIT_PER_MIN ?? (test ? 0 : 30),
    RESET_MAILS_PER_15_MIN: d.RESET_MAILS_PER_15_MIN ?? (test ? 0 : 3),
  };
}
