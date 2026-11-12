import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { ADMIN_STATE, E2E } from './helpers';

/**
 * TC-A11Y-001 – automatischer Barrierefreiheits-Scan (axe-core, WCAG 2.1 A/AA) aller vorhandenen Seiten.
 * Erwartung laut Katalog: 0 kritische Verstöße. Zusätzlich dürfen keine „schwerwiegenden“ (serious) auftreten.
 * Läuft auf Desktop und iPhone; die übrigen Profile prüfen dieselben Seiten nur funktional.
 */
const PROFILES = ['desktop-chrome', 'mobile-iphone'];

async function scan(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  if (blocking.length)
    await info.attach(`axe-${name}.json`, {
      body: JSON.stringify(blocking, null, 2),
      contentType: 'application/json',
    });
  expect(
    blocking.map(
      (v) => `${v.impact}: ${v.id} – ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    ),
    `Seite ${name}`,
  ).toEqual([]);
}

test.describe('TC-A11Y-001 axe-Scan', () => {
  test.beforeEach(({ isMobile: _isMobile }, info) =>
    test.skip(!PROFILES.includes(info.project.name), 'nur Desktop und iPhone'),
  );

  test('öffentliche Seiten: Anmeldung, Passwort vergessen/festlegen, Ersteinrichtung, 404', async ({
    page,
  }, info) => {
    for (const [name, url, ready] of [
      ['login', `/login/${E2E.slug}`, 'login-card'],
      ['passwort-vergessen', '/passwort-vergessen', 'forgot-card'],
      ['passwort-festlegen', '/passwort-festlegen?token=ungueltig', 'password-set-card'],
      ['einrichtung', '/einrichtung', 'setup-unavailable'],
      ['nicht-gefunden', '/gibt-es-nicht', 'not-found'],
    ] as const) {
      await page.goto(url);
      await expect(page.getByTestId(ready)).toBeVisible();
      await scan(page, info, name);
    }
  });

  test.describe('angemeldet', () => {
    test.use({ storageState: ADMIN_STATE });

    test('Startseite und alle Reiter des Admin-Bereichs', async ({ page }, info) => {
      await page.goto('/start');
      await expect(page.getByTestId('logout')).toBeVisible();
      await scan(page, info, 'start');
      for (const tab of ['users', 'departments', 'company', 'industries', 'cross', 'mail', 'ai', 'audit']) {
        await page.goto(`/admin?tab=${tab}`);
        await expect(page.locator('[role="tabpanel"]')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await scan(page, info, `admin-${tab}`);
      }
    });

    test('Bestätigungsdialog (geöffnet)', async ({ page }, info) => {
      await page.goto('/admin?tab=users');
      const reset = page.getByTestId('user-reset').first();
      test.skip((await reset.count()) === 0, 'kein Nutzer zum Zurücksetzen vorhanden');
      await reset.click();
      await expect(page.getByTestId('confirm-ok')).toBeVisible();
      await scan(page, info, 'dialog');
      await page.getByTestId('confirm-cancel').click();
    });
  });
});
