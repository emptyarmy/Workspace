import { expect, request as pwRequest, test, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_STATE, CSRF, loggedInContext } from './helpers';
import { team } from './erfassung-helpers';

/**
 * Phase 8c – Produktions-Build: Der gebündelte Server liefert die gebaute Oberfläche selbst aus.
 * Läuft nur mit E2E_PROD=1 (siehe playwright.config.ts), vorher: npm run build.
 *
 * TC-OPS-001 Auslieferung: HTML mit CSP und ohne Cache, Assets mit Hash ein Jahr cachebar und komprimiert,
 *            Seiten-Deep-Links liefern die App, fehlende Dateien und unbekannte API-Pfade einen 404.
 * TC-OPS-002 Die CSP blockiert nichts, was die Oberfläche braucht: alle Hauptseiten ohne CSP-Verstoß.
 */
test.describe.configure({ timeout: 120_000 });

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

test('TC-OPS-001 Auslieferung der Oberfläche: CSP, Caching, Kompression, Deep-Links, 404', async ({
  request,
}) => {
  const root = await request.get('/start');
  expect(root.status()).toBe(200);
  const h = root.headers();
  expect(h['content-type']).toContain('text/html');
  expect(h['cache-control']).toBe('no-cache');
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  const html = await root.text();
  expect(html).toContain('<div id="app"></div>');

  // Deep-Link (Vue Router im History-Modus) → dieselbe App
  const deep = await request.get('/assessments/00000000-0000-0000-0000-000000000000/bericht');
  expect(deep.status()).toBe(200);
  expect(await deep.text()).toBe(html);

  // Asset mit Inhalts-Hash: ein Jahr cachebar, gzip
  const script = html.match(/src="(\/assets\/index-[^"]+\.js)"/)![1]!;
  const asset = await request.get(script, { headers: { 'accept-encoding': 'gzip' } });
  expect(asset.status()).toBe(200);
  expect(asset.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect(asset.headers()['content-type']).toContain('text/javascript');
  expect(asset.headers()['content-encoding']).toBe('gzip');

  // Fehlende Datei, unbekannte API, Pfad-Traversal, schreibende Anfragen → 404 statt App
  expect((await request.get('/assets/gibt-es-nicht.js')).status()).toBe(404);
  const api = await request.get('/api/gibt-es-nicht');
  expect(api.status()).toBe(404);
  expect(await api.json()).toEqual({ error: 'not_found' });
  expect((await request.get('/assets/..%2F..%2Fpackage.json')).status()).toBe(404);
  expect((await request.get('/%2E%2E/%2E%2E/package.json')).status()).toBe(404);
  expect((await request.post('/start', { headers: CSRF })).status()).toBe(404);
});

/** Sammelt CSP-Verstöße und Skriptfehler einer Seite. */
function watch(page: Page): string[] {
  const problems: string[] = [];
  // Browserunabhängig: Jeder CSP-Verstoß löst ein securitypolicyviolation-Ereignis aus – auch wenn der Code
  // ihn abfängt (z. B. ein eval-Test einer Bibliothek) und der Browser ihn nicht in der Konsole meldet.
  void page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP-Verstoß: ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
    ),
  );
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content.Security.Policy|Refused to|CSP-Verstoß/i.test(m.text()))
      problems.push(m.text());
  });
  page.on('pageerror', (e) => {
    // WebKit meldet eine eigene API-Anfrage, die ein Seitenwechsel abbricht, als „… due to access control
    // checks.“ – kein Fehler der App und kein CSP-Verstoß (die kommen über securitypolicyviolation).
    if (/127\.0\.0\.1:\d+\/api\/.* due to access control checks\.$/.test(e.message)) return;
    problems.push(`pageerror: ${e.message}`);
  });
  return problems;
}

test('TC-OPS-002 Hauptseiten laufen unter der Content-Security-Policy ohne Verstoß', async ({
  browser,
}, info) => {
  const t = await team(admin, browser, info);
  await t.assessorCtx.request.put(`/api/assessments/${t.asm}/consolidation/KB01.K.01`, {
    headers: CSRF,
    data: { value: 'no', version: 0, rationale: 'Festgelegt im Workshop' },
  });

  const page = await t.assessorCtx.newPage();
  const problems = watch(page);
  await page.goto('/start');
  await expect(page.locator('main')).toBeVisible();
  await page.goto('/assessments');
  await expect(page.getByText(t.project)).toBeVisible();
  await page.goto(`/assessments/${t.asm}`);
  await expect(page.getByTestId('to-recommendations')).toBeVisible();
  await page.goto(`/assessments/${t.asm}/zusammenfuehrung`);
  await expect(page.locator('main')).toBeVisible();
  await page.goto(`/assessments/${t.asm}/bericht`);
  await expect(page.locator('svg').first()).toBeVisible(); // Diagramme (SVG mit Stilbindungen)
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('recs-notice')).toContainText('Empfehlungen erzeugt');
  await page.goto('/benchmark');
  await expect(page.locator('main')).toBeVisible();
  await page.goto('/gibt-es-nicht');
  await expect(page.locator('main')).toBeVisible();

  // Firmen-Admin: Verwaltung
  const adminCtx = await loggedInContext(browser, t.org.adminEmail, t.org.adminPassword);
  const adminPage = await adminCtx.newPage();
  const adminProblems = watch(adminPage);
  await adminPage.goto('/admin');
  await expect(adminPage.locator('main')).toBeVisible();

  // Abgemeldet: Anmeldung, Passwort vergessen
  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const anonPage = await anon.newPage();
  const anonProblems = watch(anonPage);
  await anonPage.goto('/login');
  await expect(anonPage.getByTestId('login-email')).toBeVisible();
  await anonPage.goto('/passwort-vergessen');
  await expect(anonPage.getByTestId('forgot-email')).toBeVisible();

  expect([...problems, ...adminProblems, ...anonProblems]).toEqual([]);
  await anon.close();
  await adminCtx.close();
});
