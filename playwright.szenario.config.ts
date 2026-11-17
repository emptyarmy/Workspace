import { defineConfig } from '@playwright/test';
import { BASE_URL, DATABASE_URL, SERVER_PORT, SMTP_HOST, SMTP_PORT, WEB_PORT } from './tests/szenario/env';

/**
 * Durchgängiges Szenario „Humani“ (tests/szenario): Zurücksetzen der Datenbank wie in der Doku
 * „Entwicklung → Anwendung zurücksetzen“, Ersteinrichtung, Abteilungen, Benutzer mit Einladung über Mailpit,
 * Assessment, zwei Abteilungen antworten, Zusammenführung, Bericht – alles über die Oberfläche.
 *
 *   docker compose up -d db mailpit
 *   npm run test:szenario
 *
 * Die Testfälle bauen aufeinander auf und laufen nacheinander in einem Worker. Nach dem Lauf steht die Firma
 * Humani in der Szenario-Datenbank zum Ansehen bereit (Werte in tests/szenario/env.ts, per Umgebung änderbar).
 */
const raiseFileLimit =
  process.platform === 'win32' ? '' : 'ulimit -n 10240 2>/dev/null || ulimit -n hard 2>/dev/null; ';
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests/szenario',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 5 * 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-szenario' }]],
  outputDir: 'test-results-szenario',
  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: 'szenario', use: { browserName: 'chromium' } }],
  webServer: [
    {
      // Legt die Szenario-Datenbank beim ersten Lauf an. Das eigentliche Zurücksetzen ist Testfall TC-SZ-001.
      command: `${raiseFileLimit}npm run db:reset:e2e -w @ai-tpi/server && npm run start -w @ai-tpi/server`,
      url: `http://127.0.0.1:${SERVER_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'development',
        SERVER_HOST: '127.0.0.1',
        SERVER_PORT: String(SERVER_PORT),
        DATABASE_URL,
        SECRET_ENCRYPTION_KEY: 'szenario-secret-0123456789abcdef0123456789abcdef',
        SETUP_ENABLED: 'true',
        COOKIE_SECURE: 'false',
        // Viele Anmeldungen und „Passwort vergessen“ kurz hintereinander – Rate-Limits hier aus.
        AUTH_RATE_LIMIT_PER_MIN: '0',
        RESET_MAILS_PER_15_MIN: '0',
        // Echter Versand an Mailpit = „Standard der Installation“
        MAIL_TRANSPORT: 'smtp',
        SMTP_HOST,
        SMTP_PORT,
        MAIL_FROM: 'AI_TPI <no-reply@ai-tpi.local>',
        PUBLIC_BASE_URL: BASE_URL,
        LOG_LEVEL: 'warn',
      },
      timeout: 90_000,
    },
    {
      command: `${raiseFileLimit}npm run dev -w @ai-tpi/web`,
      url: BASE_URL,
      reuseExistingServer: false,
      env: { WEB_PORT: String(WEB_PORT), SERVER_PORT: String(SERVER_PORT) },
      timeout: 60_000,
    },
  ],
});
