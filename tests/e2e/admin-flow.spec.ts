import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE, createActiveUser, E2E, linkFrom, login, uniqueEmail, waitForMail } from './helpers';

/**
 * Phase 4a – Anmeldung, Einladung, Einmal-Link und Admin-Bereich der eigenen Firma.
 * docs/05_test/02_testfallkatalog.md: USR, RST, AUTH, ADM, TEN (Auszug).
 */
let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

test.describe('Einladung bis zur ersten Anmeldung', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-USR-002 Admin legt Nutzer an → Einladung → Passwort vergessen → Einmal-Link → Login', async ({
    page,
    browser,
  }, info) => {
    const email = uniqueEmail(info, 'ext.berater');
    await page.goto('/admin');
    await expect(page.getByTestId('domain-hint')).toContainText(E2E.domain);
    await page.getByTestId('user-name').fill('Bea Beraterin');
    await page.getByTestId('user-email').fill(email);
    await page.getByTestId('user-role').selectOption('assessor');
    await page.getByTestId('user-create').click();
    await expect(page.getByTestId('admin-notice')).toContainText('Einladungs-Mail');
    const row = page.getByTestId(`user-row-${email}`);
    await expect(row.getByTestId('user-status')).toHaveText('eingeladen');
    await expect(row.getByTestId('badge-external')).toBeVisible(); // TC-TEN-022

    // TC-USR-001 Einladungs-Mail: Link zur Firmen-Login-Seite + Anleitung
    const invite = await waitForMail(admin, email, `/login/${E2E.slug}`);
    expect(invite.text).toContain('Passwort vergessen');

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const guest = await ctx.newPage();
    await guest.goto(linkFrom(invite));
    await expect(guest).toHaveURL(new RegExp(`/login/${E2E.slug}$`));
    await guest.getByTestId('login-forgot').click();
    await guest.getByTestId('forgot-email').fill(email);
    await guest.getByTestId('forgot-submit').click();
    await expect(guest.getByTestId('forgot-confirmation')).toBeVisible();

    const linkMail = await waitForMail(admin, email, 'token=');
    await guest.goto(linkFrom(linkMail));
    await guest.getByTestId('pw-new-input').fill(E2E.userPassword);
    await guest.getByTestId('pw-repeat-input').fill(E2E.userPassword);
    await guest.getByTestId('password-save').click();
    await expect(guest).toHaveURL(new RegExp(`/login/${E2E.slug}\\?passwordSet=1`));
    await expect(guest.getByTestId('login-message')).toContainText('Passwort wurde gespeichert');

    await guest.getByTestId('login-email').fill(email);
    await guest.getByTestId('login-password').fill(E2E.userPassword);
    await guest.getByTestId('login-submit').click();
    await expect(guest).toHaveURL(/\/start$/);
    await expect(guest.getByTestId('home-role')).toContainText('Assessor');

    // TC-RST-005 derselbe Link ein zweites Mal → abgewiesen
    await guest.goto(linkFrom(linkMail));
    await guest.getByTestId('pw-new-input').fill('Wolke7&Regen');
    await guest.getByTestId('pw-repeat-input').fill('Wolke7&Regen');
    await guest.getByTestId('password-save').click();
    await expect(guest.getByTestId('password-message')).toContainText('abgelaufen');
    await ctx.close();
  });

  test('TC-TEN-004 Nutzer mit fremder Domain → Fehlermeldung, kein Nutzer angelegt', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('user-name').fill('Fremd Firma');
    await page.getByTestId('user-email').fill('fremd@andere-firma.de');
    await page.getByTestId('user-create').click();
    await expect(page.getByTestId('admin-notice')).toContainText('gehört nicht zu einer Domain Ihrer Firma');
    await expect(page.getByTestId('user-row-fremd@andere-firma.de')).toHaveCount(0);
  });

  test('ungültiges E-Mail-Format im Formular → Feldfehler (negativ)', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('user-name').fill('Ohne Mail');
    await page.getByTestId('user-email').fill('keine-mail');
    await page.getByTestId('user-create').click();
    await expect(page.getByTestId('user-email-error')).toBeVisible();
  });

  test('TC-USR-015 Rollenauswahl: genau vier Rollen', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByTestId('user-role').locator('option')).toHaveText([
      'Admin',
      'Assessor',
      'Befragter',
      'Leser',
    ]);
  });
});

test.describe('Löschen mit Bestätigungsdialog', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-USR-008/009/010 Abbrechen, Esc und Fokus auf „Abbrechen“ – Nutzer bleibt erhalten', async ({
    page,
  }, info) => {
    const u = await createActiveUser(admin, info, 'reader', 'loeschtest');
    await page.goto('/admin');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-delete').click();
    const dlg = page.getByTestId('confirm-dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText(u.email);
    await expect(page.getByTestId('confirm-cancel')).toBeFocused();
    await page.getByTestId('confirm-cancel').click();
    await expect(dlg).toBeHidden();
    await expect(row).toBeVisible();

    await row.getByTestId('user-delete').click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(row).toBeVisible();
  });

  test('TC-USR-007 Löschen bestätigen → Nutzer entfernt, Anmeldung nicht mehr möglich', async ({
    page,
    browser,
  }, info) => {
    const u = await createActiveUser(admin, info, 'respondent', 'geloescht');
    await page.goto('/admin');
    await page.getByTestId(`user-row-${u.email}`).getByTestId('user-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('admin-notice')).toContainText('gelöscht');
    await expect(page.getByTestId(`user-row-${u.email}`)).toHaveCount(0);

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await ctx.newPage();
    await login(p, u.email, u.password);
    await expect(p.getByTestId('login-message')).toContainText('falsch');
    await ctx.close();
  });
});

test.describe('Benutzer verwalten', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-USR-005/006 deaktivieren sperrt die Anmeldung, aktivieren gibt sie wieder frei', async ({
    page,
    browser,
  }, info) => {
    const u = await createActiveUser(admin, info, 'respondent', 'inaktiv');
    await page.goto('/admin');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-toggle-active').click();
    await expect(row.getByTestId('user-status')).toHaveText('inaktiv');

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await ctx.newPage();
    await login(p, u.email, u.password);
    await expect(p.getByTestId('login-message')).toBeVisible(); // TC-AUTH-009

    await row.getByTestId('user-toggle-active').click();
    await expect(row.getByTestId('user-status')).toHaveText('aktiv');
    await login(p, u.email, u.password);
    await expect(p).toHaveURL(/\/start$/);
    await ctx.close();
  });

  test('TC-USR-017 Rollenwechsel wird sofort gespeichert', async ({ page }, info) => {
    const u = await createActiveUser(admin, info, 'respondent', 'rolle');
    await page.goto('/admin');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-row-role').selectOption('assessor');
    await expect(page.getByTestId('admin-notice')).toContainText('gespeichert');
    await page.reload();
    await expect(page.getByTestId(`user-row-${u.email}`).getByTestId('user-row-role')).toHaveValue(
      'assessor',
    );
  });

  test('TC-ADM-020/021/022 Passwort zurücksetzen: Abbrechen ändert nichts; Bestätigen → altes Passwort ungültig, neuer Link', async ({
    page,
    browser,
  }, info) => {
    const u = await createActiveUser(admin, info, 'reader', 'reset');
    await page.goto('/admin');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-reset').click();
    await page.getByTestId('confirm-cancel').click();
    await expect(row.getByTestId('user-status')).toHaveText('aktiv');

    await row.getByTestId('user-reset').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('admin-notice')).toContainText('neuen Link');
    await expect(row.getByTestId('user-status')).toHaveText('eingeladen');
    const mail = await waitForMail(admin, u.email, 'Administrator hat Ihr Passwort zurückgesetzt');
    expect(mail.text).toContain('token=');

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await ctx.newPage();
    await login(p, u.email, u.password);
    await expect(p.getByTestId('login-message')).toContainText('falsch');
    await ctx.close();
  });

  test('eigene Zeile hat keine Lösch-/Deaktivieren-Aktionen (TC-USR-013, UI)', async ({ page }) => {
    await page.goto('/admin');
    const own = page.getByTestId(`user-row-${E2E.adminEmail}`);
    await expect(own).toContainText('Sie');
    await expect(own.getByTestId('user-delete')).toHaveCount(0);
    await expect(own.getByTestId('user-toggle-active')).toHaveCount(0);
  });
});

test.describe('Rollen und Rechte', () => {
  test('TC-ADM-002 Befragter: kein Admin-Menü, /admin wird abgewiesen', async ({ page }, info) => {
    const u = await createActiveUser(admin, info, 'respondent', 'befragt');
    await login(page, u.email, u.password);
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByTestId('nav-admin')).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByTestId('access-denied')).toBeVisible();
    expect((await page.request.get('/api/admin/users')).status()).toBe(403);
  });

  test('TC-AUTH-007 Abmelden beendet die Sitzung', async ({ page }, info) => {
    const u = await createActiveUser(admin, info, 'reader', 'logout');
    await login(page, u.email, u.password);
    await expect(page).toHaveURL(/\/start$/);
    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(new RegExp(`/login/${E2E.slug}$`));
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
    await page.goto('/start');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-005 fünf Fehlversuche → Konto vorübergehend gesperrt', async ({ page }, info) => {
    const u = await createActiveUser(admin, info, 'reader', 'sperre');
    for (let i = 0; i < 5; i++) {
      await login(page, u.email, `Falsch${i}!x`);
      await expect(page.getByTestId('login-message')).toBeVisible();
    }
    await expect(page.getByTestId('login-message')).toContainText('gesperrt');
    await login(page, u.email, u.password);
    await expect(page.getByTestId('login-message')).toContainText('gesperrt');
  });
});

test.describe('Meine Firma', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-ADM-007 ungültige Logo-URL → Fehler, nicht gespeichert', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('admin-tab-company').click();
    for (const bad of ['http://unsicher.de/logo.png', 'javascript:alert(1)', 'ftp://x.de/l.png']) {
      await page.getByTestId('company-logo-url').fill(bad);
      await page.getByTestId('company-save').click();
      await expect(page.getByTestId('company-logo-error')).toBeVisible();
    }
  });

  test('TC-ADM-006 Logo und Branche speichern → Vorschau und Login-Seite zeigen das Logo', async ({
    page,
    browser,
  }) => {
    const logo = 'https://logos.e2e-firma.de/logo.svg';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="200" height="60" fill="#0a7"/></svg>';
    await page.route('https://logos.e2e-firma.de/**', (r) =>
      r.fulfill({ contentType: 'image/svg+xml', body: svg }),
    );
    await page.goto('/admin');
    await page.getByTestId('admin-tab-company').click();
    await expect(page.getByTestId('company-login-url')).toContainText(`/login/${E2E.slug}`);
    await expect(page.getByTestId('company-domains')).toHaveText(E2E.domain);
    await page.getByTestId('company-logo-url').fill(logo);
    await page.getByTestId('company-logo-alt').fill('E2E Logo');
    await page.getByTestId('company-industry').selectOption('BNK');
    await expect(page.getByTestId('company-logo-preview').getByTestId('company-logo')).toBeVisible();
    await page.getByTestId('company-save').click();
    await expect(page.getByTestId('company-notice')).toHaveText('Gespeichert.');

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await ctx.newPage();
    await p.route('https://logos.e2e-firma.de/**', (r) =>
      r.fulfill({ contentType: 'image/svg+xml', body: svg }),
    );
    await p.goto(`/login/${E2E.slug}`);
    await expect(p.getByTestId('company-logo')).toHaveAttribute('src', logo);
    await expect(p.getByTestId('company-logo')).toHaveAttribute('alt', 'E2E Logo');
    await ctx.close();
  });
});
