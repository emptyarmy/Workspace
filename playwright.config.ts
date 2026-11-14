import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Playwright-Konfiguration (docs/05_test/01_teststrategie.md).
 *
 * Standard (z. B. auf dem Mac): echte Engines – Chromium, Firefox, WebKit (Safari/iPhone/iPad).
 *   Einmalig: npx playwright install
 * Eingeschränkte Umgebungen ohne Browser-Download: PW_CHROMIUM_ONLY=1 führt alle Geräteprofile
 *   (Viewport, Touch, User-Agent) mit Chromium aus; optional PW_CHROMIUM_PATH=/pfad/zu/chrome.
 * PW_SKIP_FIREFOX=1 lässt das Profil desktop-firefox weg (z. B. wenn Firefox lokal nicht startet).
 *
 * Datenbank: Vor jedem Lauf wird E2E_DATABASE_URL (Name muss auf _e2e enden) zurückgesetzt.
 * Das Projekt „setup“ führt die Ersteinrichtung über die Oberfläche durch und speichert die Admin-Sitzung.
 * E-Mails landen in einer Test-Outbox (GET /api/test/outbox), daher ist kein Mailpit nötig.
 */
const chromiumOnly = !!process.env.PW_CHROMIUM_ONLY;
const executablePath = process.env.PW_CHROMIUM_PATH;
const skipFirefox = !!process.env.PW_SKIP_FIREFOX;

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5180);
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 3100);
/**
 * E2E-Datenbank: E2E_DATABASE_URL (Umgebung oder .env); sonst aus DATABASE_URL abgeleitet (gleicher Server/Port,
 * Datenbank „ai_tpi_e2e“). So greift z. B. ein geänderter Port in .env automatisch auch für die Tests.
 */
function readDotEnv(): Record<string, string> {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '.env');
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
const dotEnv = readDotEnv();
function e2eDatabaseUrl(): string {
  const explicit = process.env.E2E_DATABASE_URL ?? dotEnv.E2E_DATABASE_URL;
  if (explicit) return explicit;
  const base = process.env.DATABASE_URL ?? dotEnv.DATABASE_URL;
  if (base) {
    const u = new URL(base);
    u.pathname = '/ai_tpi_e2e';
    return u.toString();
  }
  return 'postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi_e2e';
}
const DATABASE_URL = e2eDatabaseUrl();
export const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
export const ADMIN_STATE = 'tests/e2e/.auth/admin.json';

function project(
  name: string,
  device: (typeof devices)[string],
  extra: Record<string, unknown> = {},
): Project {
  const use = { ...device, ...extra } as Project['use'] & Record<string, unknown>;
  if (chromiumOnly) {
    use.browserName = 'chromium';
    delete use.defaultBrowserType;
    if (executablePath) use.launchOptions = { executablePath };
  }
  // Platzhalter geplanter Funktionen (tests/e2e/geplant) nur einmal auflisten, nicht je Geräteprofil.
  const testIgnore = name === 'desktop-chrome' ? [/.*\.setup\.ts/] : [/.*\.setup\.ts/, /[\\/]geplant[\\/]/];
  return { name, use, dependencies: ['setup'], testIgnore };
}

/**
 * macOS erlaubt einem Prozess standardmäßig nur 256 offene Dateien/Verbindungen (`ulimit -n`).
 * Bei vielen parallelen Workern hält jede Seite zusätzlich eine Live-Verbindung (SSE) über den Vite-Proxy;
 * Vite stieß dann an die Grenze und beendete sich mitten im Lauf (alle folgenden Tests: ERR_CONNECTION_REFUSED).
 * Deshalb heben die Testserver ihre eigene Grenze an (ohne Root möglich, bis zur harten Grenze).
 */
const raiseFileLimit =
  process.platform === 'win32' ? '' : 'ulimit -n 10240 2>/dev/null || ulimit -n hard 2>/dev/null; ';

const setupProject = project('setup', devices['Desktop Chrome']);
delete setupProject.dependencies;
delete setupProject.testIgnore;
setupProject.testMatch = /.*\.setup\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    setupProject,
    project('desktop-chrome', devices['Desktop Chrome'], { viewport: { width: 1920, height: 1080 } }),
    ...(skipFirefox ? [] : [project('desktop-firefox', devices['Desktop Firefox'])]),
    project('desktop-safari', devices['Desktop Safari']),
    project('laptop-small', devices['Desktop Chrome'], { viewport: { width: 1366, height: 768 } }),
    project('tablet-ipad', devices['iPad (gen 11)']),
    project('mobile-iphone', devices['iPhone 17']),
    project('mobile-samsung', devices['Galaxy S24']),
  ],
  webServer: [
    {
      command: `${raiseFileLimit}npm run db:reset:e2e -w @ai-tpi/server && npm run start -w @ai-tpi/server`,
      url: `http://127.0.0.1:${SERVER_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        SERVER_PORT: String(SERVER_PORT),
        DATABASE_URL,
        MAIL_TRANSPORT: 'memory',
        TEST_ENDPOINTS: 'true',
        PUBLIC_BASE_URL: BASE_URL,
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
