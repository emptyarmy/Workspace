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
  COOKIE_SECURE: bool.default(false),
  /**
   * Schlüssel zum Verschlüsseln von Geheimnissen in der DB (SMTP-Passwort, KI-API-Schlüssel), mind. 32 Zeichen.
   * In production Pflicht; in Entwicklung/Test wird ein fester Schlüssel verwendet. Leer = nicht gesetzt.
   */
  SECRET_ENCRYPTION_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32).optional()),
  /** Testendpunkte (/api/test/*) – nur zusammen mit NODE_ENV=test aktiv. */
  TEST_ENDPOINTS: bool.default(false),
});

export type AppConfig = z.infer<typeof envSchema>;

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
  return parsed.data;
}
