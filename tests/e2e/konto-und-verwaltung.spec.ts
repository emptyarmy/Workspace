import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import {
  ADMIN_STATE,
  createActiveUser,
  createTestCompany,
  CSRF,
  E2E,
  loggedInContext,
  uniqueEmail,
  waitForMail,
} from './helpers';

/**
 * Lücken aus dem Testfallkatalog für bereits umgesetzte Funktionen:
 * Einmal-Link (RST), Passwort (PWD), Sitzung und Kopfzeile (AUTH), Nutzerverwaltung (USR),
 * Externe (TEN), Benachrichtigungen in der eigenen Firma, Mailfehler, Anmeldelink (ADM), Drehen (RWD).
 */
let ada: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  ada = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => ada.dispose());

/** Anmeldeversuch in einem frischen Kontext – darf Adas Sitzung nicht überschreiben. */
async function canLogin(baseURL: string | undefined, email: string, password: string) {
  const ctx = await pwRequest.newContext({ baseURL });
  const status = (await ctx.post('/api/auth/login', { headers: CSRF, data: { email, password } })).status();
  await ctx.dispose();
  return status;
}

const outbox = async (to: string) =>
  (await (await ada.get(`/api/test/outbox?to=${encodeURIComponent(to)}`)).json()) as Array<{
    subject: string;
    text: string;
  }>;
const tokenLink = (text: string) => new URL(text.match(/https?:\/\/\S+token=\S+/)![0]);
/** Wartet auf eine **neue** Mail mit Einmal-Link (ältere aus dem Anlegen des Nutzers zählen nicht). */
async function newLinkMail(to: string, before: number) {
  await expect.poll(async () => (await outbox(to)).length, { timeout: 10_000 }).toBeGreaterThan(before);
  const mails = await outbox(to);
  return [...mails].reverse().find((m) => m.text.includes('token='))!;
}

test.describe('Einmal-Link und Passwort', () => {
  test('TC-RST-003 Einmal-Link aus der Mail öffnen → „Passwort festlegen“ mit Regelliste', async ({
    page,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'rst3');
    await page.goto('/passwort-vergessen');
    const before = (await outbox(u.email)).length;
    await page.getByTestId('forgot-email').fill(u.email);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-confirmation')).toBeVisible();
    const mail = await newLinkMail(u.email, before);
    const link = tokenLink(mail.text);
    await page.goto(`${link.pathname}${link.search}`);
    await expect(page.getByTestId('password-set-card')).toBeVisible();
    await expect(page.getByTestId('pw-new-rules')).toBeVisible();
    await expect(page.getByTestId('pw-new-rules').locator('li')).toHaveCount(4);
  });

  test('TC-RST-004 negativ: abgelaufener Einmal-Link (30 min) wird abgewiesen', async ({
    page,
    baseURL,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'rst4');
    const before = (await outbox(u.email)).length;
    await ada.post('/api/auth/password-reset', { headers: CSRF, data: { email: u.email } });
    const link = tokenLink((await newLinkMail(u.email, before)).text);
    expect(
      (await (await ada.post('/api/test/expire-tokens', { headers: CSRF, data: { email: u.email } })).json())
        .updated,
    ).toBeGreaterThan(0);
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByTestId('pw-new-input').fill('Wolke8$Fenster');
    await page.getByTestId('pw-repeat-input').fill('Wolke8$Fenster');
    await page.getByTestId('password-save').click();
    await expect(page.getByTestId('password-message')).toContainText(/abgelaufen|bereits verwendet/);
    // altes Passwort gilt weiter
    expect(await canLogin(baseURL, u.email, u.password)).toBe(200);
  });

  test('TC-RST-009 negativ: „Passwort vergessen“ für inaktiven Nutzer → gleiche Meldung, keine Mail', async ({
    page,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'rst9');
    await ada.patch(`/api/admin/users/${u.id}`, { headers: CSRF, data: { active: false } });
    const before = (await outbox(u.email)).length;
    await page.goto('/passwort-vergessen');
    await page.getByTestId('forgot-email').fill(u.email);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-confirmation')).toBeVisible();
    await page.waitForTimeout(500);
    expect((await outbox(u.email)).length).toBe(before);
  });

  test('TC-PWD-025 negativ: neues Passwort = bisheriges → Hinweis, nichts geändert', async ({
    page,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'pwd25');
    const before = (await outbox(u.email)).length;
    await ada.post('/api/auth/password-reset', { headers: CSRF, data: { email: u.email } });
    const link = tokenLink((await newLinkMail(u.email, before)).text);
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByTestId('pw-new-input').fill(u.password);
    await page.getByTestId('pw-repeat-input').fill(u.password);
    await page.getByTestId('password-save').click();
    await expect(page.getByTestId('password-message')).toContainText('nicht dem bisherigen entsprechen');
  });
});

test.describe('Sitzung und Kopfzeile', () => {
  test('TC-AUTH-008 negativ: Sitzung abgelaufen → Anmeldung mit Hinweis, danach zurück zur Seite', async ({
    browser,
  }, info) => {
    const u = await createActiveUser(ada, info, 'admin', 'sess');
    const ctx = await loggedInContext(browser, u.email, u.password);
    const page = await ctx.newPage();
    await page.goto('/admin?tab=users');
    await expect(page.getByTestId('users-panel')).toBeVisible();
    // 61 Minuten ohne Aktivität (Leerlauf-Timeout 60 min)
    await ada.post('/api/test/expire-sessions', { headers: CSRF, data: { email: u.email } });
    await page.getByTestId('admin-tab-departments').click();
    await expect(page).toHaveURL(new RegExp(`/login/${E2E.slug}\\?.*expired=1`));
    await expect(page.getByTestId('login-message')).toContainText('Sitzung ist abgelaufen');
    await page.getByTestId('login-email').fill(u.email);
    await page.getByTestId('login-password').fill(u.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/admin/);
    await ctx.close();
  });

  test('TC-AUTH-013 Kopfzeile zeigt nach dem Login das Logo der eigenen Firma', async ({ browser }, info) => {
    const c = await createTestCompany(ada, info);
    const logoUrl = `https://logo.example.test/${c.slug}.svg`;
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    await ctx.route(logoUrl, (r) =>
      r.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#1f3a5f"/></svg>',
      }),
    );
    const page = await ctx.newPage();
    await page.goto('/start');
    await expect(page.getByTestId('header-logo')).toHaveCount(0); // noch kein Logo hinterlegt
    await page.goto('/admin?tab=company');
    await page.getByTestId('company-logo-url').fill(logoUrl);
    await page.getByTestId('company-logo-alt').fill(`Logo ${c.name}`);
    await page.getByTestId('company-save').click();
    const logo = page.getByTestId('header-logo');
    await expect(logo).toHaveAttribute('src', logoUrl);
    await expect(logo).toHaveAttribute('alt', `Logo ${c.name}`);
    await page.goto('/start');
    await expect(logo).toBeVisible();
    // Andere Firma (Ada) sieht dieses Logo nicht
    expect(await (await ada.get('/api/auth/me')).text()).not.toContain(logoUrl);
    await ctx.close();
  });
});

test.describe('Nutzerverwaltung', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-USR-003/004 Name und E-Mail ändern; vergebene Adresse (andere Schreibweise) → Fehler', async ({
    page,
    baseURL,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'usr3');
    const other = await createActiveUser(ada, info, 'reader', 'usr4');
    await page.goto('/admin?tab=users');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-edit').click();
    await row.getByTestId('user-edit-email').fill(other.email.toUpperCase());
    await row.getByTestId('user-edit-save').click();
    await expect(page.getByTestId('admin-notice')).toContainText('bereits vergeben');

    const newEmail = uniqueEmail(info, 'umbenannt');
    await row.getByTestId('user-edit-name').fill('Renate Neuname');
    await row.getByTestId('user-edit-email').fill(newEmail);
    await row.getByTestId('user-edit-save').click();
    await expect(page.getByTestId('admin-notice')).toContainText('gespeichert');
    const renamed = page.getByTestId(`user-row-${newEmail}`);
    await expect(renamed).toContainText('Renate Neuname');
    // alte Adresse meldet sich nicht mehr an, neue schon
    expect(await canLogin(baseURL, u.email, u.password)).toBe(401);
    expect(await canLogin(baseURL, newEmail, u.password)).toBe(200);
  });

  test('negativ: Name/E-Mail-Bearbeitung mit leerem Namen oder ungültiger Adresse → Feldfehler', async ({
    page,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'usr3n');
    await page.goto('/admin?tab=users');
    const row = page.getByTestId(`user-row-${u.email}`);
    await row.getByTestId('user-edit').click();
    await row.getByTestId('user-edit-name').fill(' ');
    await row.getByTestId('user-edit-save').click();
    await expect(row.getByTestId('user-edit-error')).toBeVisible();
    await row.getByTestId('user-edit-name').fill('Gültiger Name');
    await row.getByTestId('user-edit-email').fill('kein-at');
    await row.getByTestId('user-edit-save').click();
    await expect(row.getByTestId('user-edit-error')).toBeVisible();
  });

  test('TC-USR-011 Rolle Admin zuweisen → Person sieht nach Neuladen den Admin-Bereich', async ({
    page,
    browser,
  }, info) => {
    const u = await createActiveUser(ada, info, 'reader', 'usr11');
    const ctx = await loggedInContext(browser, u.email, u.password);
    const theirs = await ctx.newPage();
    await theirs.goto('/start');
    await expect(theirs.getByTestId('nav-admin')).toHaveCount(0);

    await page.goto('/admin?tab=users');
    await page.getByTestId(`user-row-${u.email}`).getByTestId('user-row-role').selectOption('admin');
    await expect(page.getByTestId('admin-notice')).toContainText('gespeichert');

    await theirs.reload();
    await expect(theirs.getByTestId('nav-admin')).toBeVisible();
    await theirs.getByTestId('nav-admin').click();
    await expect(theirs.getByTestId('users-panel')).toBeVisible();
    await ctx.close();
  });

  test('TC-USR-012 negativ: genau eine Rolle – Auswahl ohne Mehrfachauswahl, API mit zwei Rollen → 400', async ({
    page,
  }, info) => {
    await page.goto('/admin?tab=users');
    await expect(page.getByTestId('user-role')).not.toHaveAttribute('multiple', /.*/);
    const res = await ada.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Zwei Rollen', email: uniqueEmail(info, 'usr12'), role: ['admin', 'reader'] },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-TEN-024 negativ: externe Adresse mit fremder Domain (ext.max@beratung.de) → abgewiesen', async ({
    page,
  }) => {
    await page.goto('/admin?tab=users');
    await page.getByTestId('user-name').fill('Max Berater');
    await page.getByTestId('user-email').fill('ext.max@beratung.de');
    await page.getByTestId('user-create').click();
    await expect(page.getByTestId('admin-notice')).toContainText('Domain');
    await expect(page.getByTestId('user-row-ext.max@beratung.de')).toHaveCount(0);
  });

  test('TC-TEN-028 negativ: kein Feld „extern“; isExternal im Request wird ignoriert, Kennzeichen nur aus der Adresse', async ({
    page,
  }, info) => {
    await page.goto('/admin?tab=users');
    await expect(page.getByTestId('user-create-form').getByLabel(/extern/i)).toHaveCount(0);
    const normal = uniqueEmail(info, 'ten28');
    const r1 = await ada.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Nicht Extern', email: normal, role: 'reader', isExternal: true },
    });
    expect(r1.status()).toBe(201);
    expect((await r1.json()).isExternal).toBe(false);
    const ext = `ext.${uniqueEmail(info, 'ten28x')}`;
    const r2 = await ada.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Echt Extern', email: ext, role: 'reader', isExternal: false },
    });
    expect((await r2.json()).isExternal).toBe(true);
  });

  test('TC-ADM-017 Notfallweg: Anmeldelink eines eingeladenen Nutzers anzeigen/kopieren und öffnen', async ({
    page,
    browser,
    browserName,
  }, info) => {
    const email = uniqueEmail(info, 'adm17');
    await ada.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Ina Eingeladen', email, role: 'reader' },
    });
    if (browserName === 'chromium')
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/admin?tab=users');
    await page.getByTestId(`user-row-${email}`).getByTestId('user-copy-link').click();
    const notice = page.getByTestId('admin-notice');
    await expect(notice).toContainText(`/login/${E2E.slug}`);
    if (browserName === 'chromium') {
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip).toMatch(new RegExp(`/login/${E2E.slug}$`));
    }
    const link = (await notice.textContent())!.match(/https?:\/\/\S+\/login\/[a-z0-9-]+/)![0];
    // Link so öffnen, wie ihn die eingeladene Person öffnet: ohne Anmeldung
    const guest = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const guestPage = await guest.newPage();
    await guestPage.goto(new URL(link).pathname);
    await expect(guestPage.getByTestId('login-email')).toBeVisible();
    await guest.close();
  });
});

test.describe('Benachrichtigungen und Mailfehler (isolierte Testfirma)', () => {
  test('TC-ADM-035/028 Reset und Rollenwechsel in der eigenen Firma → Link versendet, keine Hinweis-Mails', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    const req = ctx.request;
    const second = `zweit@${c.domain}`;
    const user = `nutzer@${c.domain}`;
    await req.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Zweiter Admin', email: second, role: 'admin' },
    });
    await req.post('/api/admin/users', {
      headers: CSRF,
      data: { name: 'Nora Nutzer', email: user, role: 'reader' },
    });

    const page = await ctx.newPage();
    await page.goto('/admin?tab=users');
    await page.getByTestId(`user-row-${second}`).getByTestId('user-reset').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('admin-notice')).toContainText('neuen Link');
    await waitForMail(ada, second, 'Ein Administrator hat Ihr Passwort zurückgesetzt');

    await page.getByTestId(`user-row-${user}`).getByTestId('user-row-role').selectOption('assessor');
    await expect(page.getByTestId('admin-notice')).toContainText('gespeichert');
    await page.waitForTimeout(500);
    for (const to of [c.adminEmail, second, user])
      expect(
        (await outbox(to)).filter((m) => m.subject.startsWith('Hinweis')),
        to,
      ).toHaveLength(0);
    await ctx.close();
  });

  test('TC-ADM-016 negativ: SMTP mit falschem Host → Test-Mail schlägt fehl, Einstellung bleibt erhalten', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    const page = await ctx.newPage();
    await page.goto('/admin?tab=mail');
    await page.getByTestId('mail-transport-smtp').check();
    await page.getByTestId('mail-host').fill('smtp.kaputt.invalid');
    await page.getByTestId('mail-port').fill('587');
    await page.getByTestId('mail-save').click();
    await expect(page.getByTestId('mail-notice')).toContainText('Gespeichert');
    await page.getByTestId('mail-test').click();
    await expect(page.getByTestId('mail-notice')).toContainText('konnte nicht versendet werden');
    await page.reload();
    await expect(page.getByTestId('mail-transport-smtp')).toBeChecked();
    await expect(page.getByTestId('mail-host')).toHaveValue('smtp.kaputt.invalid');
    await ctx.close();
  });
});

test.describe('Mobilgeräte', () => {
  test('TC-RWD-003 Drehen Hoch ↔ Quer: Layout passt sich an, Eingaben bleiben erhalten', async ({
    page,
  }, info) => {
    test.skip(!info.project.use.isMobile, 'nur für Tablet- und Mobilprofile');
    const portrait = page.viewportSize()!;
    await page.goto(`/login/${E2E.slug}`);
    await page.getByTestId('login-email').fill('drehen@example.org');
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    for (const size of [
      { width: portrait.height, height: portrait.width },
      { width: portrait.width, height: portrait.height },
    ]) {
      await page.setViewportSize(size);
      await expect(page.getByTestId('login-email')).toBeVisible();
      expect(await overflow()).toBeLessThanOrEqual(1);
      await expect(page.getByTestId('login-email')).toHaveValue('drehen@example.org');
    }
  });
});
