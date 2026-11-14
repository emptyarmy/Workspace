import AxeBuilder from '@axe-core/playwright';
import { expect, request as pwRequest, test, type Page, type TestInfo } from '@playwright/test';
import {
  activateByEmail,
  ADMIN_STATE,
  createTestCompany,
  CSRF,
  E2E,
  loggedInContext,
  uniqueId,
} from './helpers';

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

  test('Erfassung: Assessments, Anlage, Detail-Reiter, Fragebogen mit Kommentaren, Zusammenführung, Historie', async ({
    browser,
    baseURL,
  }, info) => {
    const admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
    const id = uniqueId(info);
    // Eigene Firma, damit die Listen der E2E-Firma klein bleiben.
    const company = await createTestCompany(admin, info);
    const companyAdmin = await loggedInContext(browser, company.adminEmail, company.password);
    const dep = (
      await (
        await companyAdmin.request.post('/api/admin/departments', {
          headers: CSRF,
          data: { name: `A11y ${id}` },
        })
      ).json()
    ).id as string;
    const mk = async (role: string) => {
      const email = `a11y-${role}.${id}@${company.domain}`;
      const r = await companyAdmin.request.post('/api/admin/users', {
        headers: CSRF,
        data: { name: `A11y ${role}`, email, role, departmentId: dep },
      });
      expect(r.status()).toBe(201);
      await activateByEmail(admin, email);
      return { id: (await r.json()).id as string, email };
    };
    const assessor = await mk('assessor');
    const respondent = await mk('respondent');
    const ctx = await loggedInContext(browser, assessor.email, E2E.userPassword);
    const created = await ctx.request.post('/api/assessments', {
      headers: CSRF,
      data: { project: `A11y ${id}`, assessorName: 'A11y', startDate: '2026-11-01' },
    });
    const asm = (await created.json()).id as string;
    await ctx.request.post(`/api/assessments/${asm}/members`, {
      headers: CSRF,
      data: { userId: respondent.id },
    });
    await ctx.request.put(`/api/assessments/${asm}/assignments/KB01`, {
      headers: CSRF,
      data: { departmentIds: [dep] },
    });
    await ctx.request.post(`/api/assessments/${asm}/sources`, {
      headers: CSRF,
      data: { name: 'Quelle A11y' },
    });
    const page = await ctx.newPage();

    const visit = async (name: string, url: string, ready: string) => {
      await page.goto(url);
      await expect(page.getByTestId(ready).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await scan(page, info, name);
    };
    await visit('assessments', '/assessments', 'assessment-list');
    await visit('assessment-neu', '/assessments/neu', 'master-form');
    for (const tab of ['overview', 'team', 'sources'])
      await visit(`assessment-${tab}`, `/assessments/${asm}?tab=${tab}`, `atab-${tab}`);
    await visit('zusammenfuehrung', `/assessments/${asm}/zusammenfuehrung`, 'consolidation');
    await visit('historie', `/admin?tab=history&assessmentId=${asm}`, 'history-panel');

    const r = await loggedInContext(browser, respondent.email, E2E.userPassword);
    const rp = await r.newPage();
    await rp.goto(`/assessments/${asm}/fragebogen/KB01`);
    await rp.getByTestId('cp-KB01.K.01').getByTestId('answer-yes').click();
    await expect(rp.getByTestId('cp-KB01.K.01').getByTestId('save-state')).toContainText('✓ gespeichert');
    await rp.getByTestId('cp-KB01.K.01').getByTestId('toggle-comments').click();
    await expect(rp.getByTestId('comment-form')).toBeVisible();
    await scan(rp, info, 'fragebogen');
    await r.close();
    await ctx.close();
    await companyAdmin.close();
    await admin.dispose();
  });
});
