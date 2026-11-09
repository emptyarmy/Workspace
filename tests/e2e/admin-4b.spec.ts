import { expect, request as pwRequest, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  ADMIN_STATE,
  createActiveUser,
  createTestCompany,
  CSRF,
  E2E,
  loggedInContext,
  uniqueEmail,
  uniqueId,
  waitForMail,
} from './helpers';

/**
 * Phase 4b – firmenübergreifende Administration (S-01, S-10, S-13, S-14, S-15), Abteilungen,
 * Domains, E-Mail- und KI-Konfiguration je Firma (S-04), Audit-Log.
 * docs/05_test/02_testfallkatalog.md: ADM, TEN, DEP, MAIL, KI, AUD (Auszug).
 */
let ada: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  ada = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => ada.dispose());

const openTab = (page: Page, tab: string) => page.goto(`/admin?tab=${tab}`);

test.describe('Abteilungen', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-ADM-040…044 Abteilungen: anlegen, Duplikat, umbenennen, zuordnen, löschen nur ohne Nutzer', async ({
    page,
  }, info) => {
    const id = uniqueId(info);
    const name = `QS ${id}`;
    await openTab(page, 'departments');

    // negativ: leerer Name → Feldfehler, kein Request
    await page.getByTestId('department-create').click();
    await expect(page.getByTestId('department-name-error')).toBeVisible();

    await page.getByTestId('department-name').fill(name);
    await page.getByTestId('department-create').click();
    await expect(page.getByTestId('admin-notice')).toContainText('Abteilung angelegt');
    const row = page.getByTestId(`department-row-${name}`);
    await expect(row).toContainText('0 Nutzer');

    // negativ: gleicher Name in anderer Schreibweise → 409
    await page.getByTestId('department-name').fill(name.toUpperCase());
    await page.getByTestId('department-create').click();
    await expect(page.getByTestId('admin-notice')).toContainText('gibt es bereits');

    // umbenennen
    await row.getByTestId('department-edit').click();
    await row.getByTestId('department-edit-input').fill(`${name} neu`);
    await row.getByTestId('department-save').click();
    const renamed = page.getByTestId(`department-row-${name} neu`);
    await expect(renamed).toBeVisible();

    // Nutzer mit Abteilung anlegen → Abteilung in der Nutzerliste sichtbar
    const email = uniqueEmail(info, 'dep');
    await openTab(page, 'users');
    await page.getByTestId('user-name').fill('Dora Abteilung');
    await page.getByTestId('user-email').fill(email);
    await page.getByTestId('user-department').selectOption({ label: `${name} neu` });
    await page.getByTestId('user-create').click();
    await expect(page.getByTestId(`user-row-${email}`).getByTestId('user-department-name')).toHaveText(
      `${name} neu`,
    );

    // negativ: Abteilung mit Nutzer kann nicht gelöscht werden
    await openTab(page, 'departments');
    await expect(renamed).toContainText('1 Nutzer');
    await renamed.getByTestId('department-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('admin-notice')).toContainText('noch Nutzer zugeordnet');

    // deaktivieren
    await renamed.getByTestId('department-toggle').click();
    await expect(renamed.getByTestId('department-status')).toHaveText('inaktiv');

    // Nutzer umhängen → löschen möglich
    const users = (await (await ada.get('/api/admin/users')).json()) as Array<{ id: string; email: string }>;
    const u = users.find((x) => x.email === email)!;
    await ada.patch(`/api/admin/users/${u.id}`, { headers: CSRF, data: { departmentId: null } });
    await page.reload();
    await renamed.getByTestId('department-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('admin-notice')).toContainText('Abteilung gelöscht');
    await expect(renamed).toHaveCount(0);
  });
});

test.describe('Andere Firmen (S-01)', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-TEN-006 neue Firma + Admin über die Oberfläche → Einladung mit Login-Link der neuen Firma', async ({
    page,
  }, info) => {
    const id = uniqueId(info);
    const domain = `${id}.example.net`;
    const email = `chefin@${domain}`;
    await openTab(page, 'cross');
    await page.getByTestId('nc-name').fill(`Gämma Groß ${id}`);
    await expect(page.getByTestId('nc-slug')).toHaveValue(`gaemma-gross-${id}`);
    await page.getByTestId('nc-admin-name').fill('Gerda Gamma');
    await page.getByTestId('nc-admin-email').fill(email);
    await expect(page.getByTestId('nc-domains')).toHaveValue(domain); // Vorschlag aus der Admin-Adresse
    await page.getByTestId('nc-industry').selectOption('ITS');
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('cross-new-notice')).toContainText(`Einladung an ${email}`);

    const row = page.getByTestId(`created-row-${email}`);
    await expect(row).toContainText(`gaemma-gross-${id}`);
    await expect(row.getByTestId('created-status')).toHaveText('eingeladen');
    const invite = await waitForMail(ada, email, `/login/gaemma-gross-${id}`);
    expect(invite.text).toContain('Passwort vergessen');
  });

  test('TC-TEN-007/008/009 negativ: Pflichtfelder, ungültiges Kürzel, Freemail-Domain, fremde bzw. vergebene Domain', async ({
    page,
  }, info) => {
    const id = uniqueId(info);
    await openTab(page, 'cross');
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('cross-new-company-form').locator('.error-text').first()).toBeVisible();

    await page.getByTestId('nc-name').fill(`Delta ${id}`);
    await page.getByTestId('nc-slug').fill('Delta!');
    await page.getByTestId('nc-admin-name').fill('Dieter Delta');
    await page.getByTestId('nc-admin-email').fill('keine-adresse');
    await page.getByTestId('nc-industry').selectOption('ITS');
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('nc-slug-error')).toBeVisible();
    await expect(page.getByTestId('nc-admin-email-error')).toBeVisible();

    await page.getByTestId('nc-slug').fill(`delta-${id}`);
    await page.getByTestId('nc-admin-email').fill(`dieter@gmail.com`);
    await page.getByTestId('nc-domains').fill('gmail.com');
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('cross-new-notice')).toContainText('Freemail');

    await page.getByTestId('nc-domains').fill(`${id}.example.net`);
    await page.getByTestId('nc-admin-email').fill(`dieter@andere-${id}.example.net`);
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('cross-new-notice')).toContainText('gehört nicht zu einer Domain');

    // eigene Domain gehört schon Adas Firma
    await page.getByTestId('nc-domains').fill(E2E.domain);
    await page.getByTestId('nc-admin-email').fill(`dieter@${E2E.domain}`);
    await page.getByTestId('nc-submit').click();
    await expect(page.getByTestId('cross-new-notice')).toContainText('bereits einer anderen Firma');
  });

  test('TC-TEN-016/017/018/020 TC-ADM-026 Admin für bestehende Firma → Admins informiert; letzter Admin geschützt; Rollenwechsel', async ({
    page,
  }, info) => {
    const b = await createTestCompany(ada, info);
    const second = `zweite@${b.domain}`;
    await openTab(page, 'cross');
    await page.getByTestId('ex-company').selectOption({ label: `${b.name} (${b.slug})` });
    await page.getByTestId('ex-name').fill('Zora Zweite');
    // negativ: Adresse einer fremden Domain
    await page.getByTestId('ex-email').fill(`zora@${E2E.domain}`);
    await page.getByTestId('ex-submit').click();
    await expect(page.getByTestId('cross-existing-notice')).toContainText('gehört nicht zu einer Domain');
    await page.getByTestId('ex-email').fill(second);
    await page.getByTestId('ex-submit').click();
    await expect(page.getByTestId('cross-existing-notice')).toContainText(`Einladung an ${second}`);

    const notice = await waitForMail(ada, b.adminEmail, 'Zora Zweite');
    expect(notice.subject).toContain('Neuer Admin angelegt');
    expect(notice.text).toContain(`${E2E.adminName} (${E2E.adminEmail}, ${E2E.companyName})`);

    // M4a: einziger aktiver Admin von B kann nicht deaktiviert werden
    const first = page.getByTestId(`created-row-${b.adminEmail}`);
    await first.getByTestId('created-toggle').click();
    await expect(page.getByTestId('created-notice')).toContainText('letzte aktive Admin');

    // Rolle des zweiten (eingeladenen) Admins ändern → Hinweis an B
    const row2 = page.getByTestId(`created-row-${second}`);
    await row2.getByTestId('created-role').selectOption('reader');
    await expect(page.getByTestId('created-notice')).toContainText('Änderung gespeichert');
    await expect(row2.getByTestId('created-role')).toHaveValue('reader');
    const roleNote = await waitForMail(ada, b.adminEmail, 'admin → reader');
    expect(roleNote.subject).toContain('Rolle geändert');
  });

  test('TC-ADM-023/032/033/034 Passwort für Nutzer anderer Firmen: eigene Firma abgewiesen, neutrale Antwort, Hinweis-Mail, Tageslimit 3', async ({
    browser,
  }, info) => {
    const b = await createTestCompany(ada, info);
    const bUser = `nutzer@${b.domain}`;
    const bAdminReq = (await loggedInContext(browser, b.adminEmail, b.password)).request;
    expect(
      (
        await bAdminReq.post('/api/admin/users', {
          headers: CSRF,
          data: { name: 'Nina Nutzer', email: bUser, role: 'reader' },
        })
      ).status(),
    ).toBe(201);

    // Eigener frischer Admin: das Tageslimit gilt je Admin.
    const x = await createActiveUser(ada, info, 'admin', 'limit');
    const ctx = await loggedInContext(browser, x.email, x.password);
    const page = await ctx.newPage();
    await openTab(page, 'cross');
    await expect(page.getByTestId('cross-reset-quota')).toContainText('3 von 3');

    // negativ: ungültige Adresse (Client) und eigene Firma (Server)
    await page.getByTestId('cross-reset-email').fill('kein@');
    await page.getByTestId('cross-reset-submit').click();
    await expect(page.getByTestId('cross-reset-email-error')).toBeVisible();
    await page.getByTestId('cross-reset-email').fill(E2E.adminEmail);
    await page.getByTestId('cross-reset-submit').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('cross-reset-notice')).toContainText('eigenen Firma');

    // bekannte Adresse: Bestätigung abbrechen ändert nichts
    await page.getByTestId('cross-reset-email').fill(bUser);
    await page.getByTestId('cross-reset-submit').click();
    await page.getByTestId('confirm-cancel').click();
    await expect(page.getByTestId('cross-reset-quota')).toContainText('3 von 3');

    // bekannte Adresse: neutrale Meldung, Link an die Person, Hinweis an die Admins von B
    await page.getByTestId('cross-reset-submit').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('cross-reset-notice')).toContainText('Anfrage ausgeführt');
    await expect(page.getByTestId('cross-reset-quota')).toContainText('2 von 3');
    await waitForMail(ada, bUser, 'Ein Administrator hat Ihr Passwort zurückgesetzt');
    const note = await waitForMail(ada, b.adminEmail, 'Nina Nutzer');
    expect(note.subject).toContain('Passwort zurückgesetzt');
    expect(note.text).toContain(x.email);

    // unbekannte Adresse: gleiche Meldung, zählt zum Limit
    await page.getByTestId('cross-reset-email').fill(`niemand@${b.domain}`);
    await page.getByTestId('cross-reset-submit').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('cross-reset-notice')).toContainText('Anfrage ausgeführt');
    await expect(page.getByTestId('cross-reset-quota')).toContainText('1 von 3');

    await page.getByTestId('cross-reset-email').fill(bUser);
    await page.getByTestId('cross-reset-submit').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('cross-reset-quota')).toContainText('0 von 3');
    await expect(page.getByTestId('cross-reset-submit')).toBeDisabled();

    // Server weist auch bei Umgehung der Oberfläche ab (429)
    const over = await ctx.request.post('/api/admin/cross-password-reset', {
      headers: CSRF,
      data: { email: bUser },
    });
    expect(over.status()).toBe(429);
    await ctx.close();
  });
});

test.describe('Firmeneinstellungen (isolierte Testfirma je Profil)', () => {
  test('TC-TEN-014/029 Domains: hinzufügen, Freemail und fremde Domain abgewiesen, letzte/genutzte Domain bleibt', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    const page = await ctx.newPage();
    await openTab(page, 'company');
    const extra = `zweit.${c.domain}`;
    await page.getByTestId('domain-input').fill(extra.toUpperCase());
    await page.getByTestId('domain-add').click();
    await expect(page.getByTestId('domain-notice')).toContainText(`Domain ${extra} hinzugefügt`);
    await expect(page.getByTestId(`domain-row-${extra}`)).toBeVisible();

    await page.getByTestId('domain-input').fill('web.de');
    await page.getByTestId('domain-add').click();
    await expect(page.getByTestId('domain-notice')).toContainText('Freemail');
    await page.getByTestId('domain-input').fill(E2E.domain);
    await page.getByTestId('domain-add').click();
    await expect(page.getByTestId('domain-notice')).toContainText('anderen Firma');

    // Hauptdomain hat Nutzer (den Admin) → nicht entfernbar
    await page.getByTestId(`domain-row-${c.domain}`).getByTestId('domain-remove').click();
    await expect(page.getByTestId('domain-notice')).toContainText('noch Nutzer');
    await page.getByTestId(`domain-row-${extra}`).getByTestId('domain-remove').click();
    await expect(page.getByTestId('domain-notice')).toContainText(`Domain ${extra} entfernt`);
    await page.getByTestId(`domain-row-${c.domain}`).getByTestId('domain-remove').click();
    await expect(page.getByTestId('domain-notice')).toContainText(/letzte Domain|noch Nutzer/);
    await ctx.close();
  });

  test('TC-ADM-015/045 TC-TEN-027 E-Mail: SMTP-Pflichtfelder, Passwort nie sichtbar, Test-Mail über Firmen-SMTP, zurück auf Standard', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    const page = await ctx.newPage();
    await openTab(page, 'mail');
    await expect(page.getByTestId('mail-transport-system')).toBeChecked();
    await expect(page.getByTestId('mail-smtp-fields')).toHaveCount(0);

    await page.getByTestId('mail-transport-smtp').check();
    await page.getByTestId('mail-port').fill('70000');
    await page.getByTestId('mail-save').click();
    await expect(page.getByTestId('mail-host-error')).toBeVisible();
    await expect(page.getByTestId('mail-port-error')).toBeVisible();

    await page.getByTestId('mail-host').fill('smtp.testfirma.example');
    await page.getByTestId('mail-port').fill('2525');
    await page.getByTestId('mail-from').fill('ohne-at');
    await page.getByTestId('mail-save').click();
    await expect(page.getByTestId('mail-from-error')).toBeVisible();
    await page.getByTestId('mail-from').fill(`QS-Team <qs@${c.domain}>`);
    await page.getByTestId('mail-username').fill('versand');
    await page.getByTestId('mail-password').fill('Geheim-SMTP-42');
    await page.getByTestId('mail-save').click();
    await expect(page.getByTestId('mail-notice')).toContainText('Gespeichert');

    // Passwort wird nicht zurückgeliefert, nur „gespeichert“ angezeigt
    await page.reload();
    await expect(page.getByTestId('mail-password')).toHaveValue('');
    await expect(page.getByTestId('mail-password')).toHaveAttribute('placeholder', /gespeichert/);
    const api = await (await ctx.request.get('/api/admin/mail-config')).text();
    expect(api).not.toContain('Geheim');

    await page.getByTestId('mail-test').click();
    await expect(page.getByTestId('mail-notice')).toContainText('SMTP smtp.testfirma.example:2525');
    const res = await ada.get(`/api/test/outbox?to=${encodeURIComponent(c.adminEmail)}`);
    const mails = (await res.json()) as Array<{ subject: string; via: string }>;
    expect(mails.find((m) => m.subject.startsWith('Test-Mail'))?.via).toBe(
      'smtp:smtp.testfirma.example:2525',
    );

    await page.getByTestId('mail-transport-system').check();
    await page.getByTestId('mail-save').click();
    await expect(page.getByTestId('mail-notice')).toContainText('Gespeichert');
    await ctx.close();
  });

  test('TC-ADM-008…012/046 KI-Module: Validierung, Verbindungstest ok/nicht erreichbar, Schlüssel maskiert, Standard, Löschen', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    const page = await ctx.newPage();
    await openTab(page, 'ai');
    await expect(page.getByTestId('ai-list')).toContainText('Noch kein KI-Modul');

    // negativ: Pflichtfelder und Wertebereiche
    await page.getByTestId('ai-add').click();
    await page.getByTestId('ai-base-url').fill('ftp://modell.local');
    await page.getByTestId('ai-temperature').fill('2');
    await page.getByTestId('ai-timeout').fill('3');
    await page.getByTestId('ai-save').click();
    await expect(page.getByTestId('ai-base-url-error')).toBeVisible();
    await expect(page.getByTestId('ai-temperature-error')).toBeVisible();
    await expect(page.getByTestId('ai-timeout-error')).toBeVisible();

    // lokales Modell (Ollama-Nachbildung des Testservers) → Verbindung ok, erstes Modul wird Standard
    const serverBase = `http://127.0.0.1:${process.env.E2E_SERVER_PORT ?? 3100}`;
    await page.getByTestId('ai-name').fill('Lokal');
    await page.getByTestId('ai-mode').selectOption('local');
    await page.getByTestId('ai-provider').selectOption('ollama');
    await page.getByTestId('ai-base-url').fill(`${serverBase}/api/test/fake-ollama`);
    await page.getByTestId('ai-model').fill('llama3');
    await page.getByTestId('ai-temperature').fill('0.3');
    await page.getByTestId('ai-timeout').fill('10');
    await page.getByTestId('ai-save').click();
    await expect(page.getByTestId('ai-notice')).toContainText('KI-Modul angelegt');
    const local = page.getByTestId('ai-row-Lokal');
    await expect(local.getByTestId('ai-default')).toBeVisible();
    await local.getByTestId('ai-test').click();
    await expect(local.getByTestId('ai-test-result')).toContainText('Verbindung erfolgreich');

    // nicht erreichbarer Server
    await local.getByTestId('ai-edit').click();
    await page.getByTestId('ai-base-url').fill('http://127.0.0.1:9');
    await page.getByTestId('ai-save').click();
    await local.getByTestId('ai-test').click();
    await expect(local.getByTestId('ai-test-result')).toContainText('nicht erreichbar');

    // Cloud-Modul mit API-Schlüssel: nur maskiert sichtbar
    await page.getByTestId('ai-add').click();
    await page.getByTestId('ai-name').fill('Cloud');
    await page.getByTestId('ai-mode').selectOption('cloud');
    await page.getByTestId('ai-provider').selectOption('anthropic');
    await expect(page.getByTestId('ai-base-url')).toHaveValue('https://api.anthropic.com');
    await page.getByTestId('ai-api-key').fill('sk-test-geheim-7788');
    await page.getByTestId('ai-save').click();
    const cloud = page.getByTestId('ai-row-Cloud');
    await expect(cloud.getByTestId('ai-key-masked')).toContainText('••••7788');
    await expect(page.locator('body')).not.toContainText('sk-test-geheim');

    // negativ: doppelter Name
    await page.getByTestId('ai-add').click();
    await page.getByTestId('ai-name').fill('cloud');
    await page.getByTestId('ai-mode').selectOption('rules');
    await page.getByTestId('ai-save').click();
    await expect(page.getByTestId('ai-notice')).toContainText('gibt es bereits');
    await page.getByTestId('ai-cancel').click();

    // Standard wechseln und Standardmodul löschen → anderes Modul wird Standard
    await cloud.getByTestId('ai-make-default').click();
    await expect(cloud.getByTestId('ai-default')).toBeVisible();
    await expect(local.getByTestId('ai-default')).toHaveCount(0);
    await cloud.getByTestId('ai-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(cloud).toHaveCount(0);
    await expect(local.getByTestId('ai-default')).toBeVisible();
    await ctx.close();
  });

  test('TC-ADM-014/047 Audit-Log: Filter, Bezeichnungen, Aktionen anderer Firmen gekennzeichnet, CSV-Export, ungültiger Zeitraum', async ({
    browser,
  }, info) => {
    const c = await createTestCompany(ada, info);
    // Aktion eines fremden Admins (Ada) an dieser Firma
    expect(
      (
        await ada.post(`/api/admin/companies/${c.id}/admins`, {
          headers: CSRF,
          data: { name: 'Fremd Angelegt', email: `fremd@${c.domain}` },
        })
      ).status(),
    ).toBe(201);
    const ctx = await loggedInContext(browser, c.adminEmail, c.password);
    await ctx.request.post('/api/admin/departments', { headers: CSRF, data: { name: 'Audit-Abteilung' } });
    const page = await ctx.newPage();
    await openTab(page, 'audit');
    await expect(
      page.getByTestId('audit-row-admin.cross_admin_created').getByTestId('audit-external'),
    ).toBeVisible();
    await expect(page.getByTestId('audit-row-admin.cross_admin_created')).toContainText(E2E.adminEmail);

    await page.getByTestId('audit-action').fill('department');
    await page.getByTestId('audit-apply').click();
    await expect(page.getByTestId('audit-row-admin.department_created')).toContainText('Abteilung angelegt');
    await expect(page.getByTestId('audit-list').locator('li')).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('audit-csv').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);

    // negativ: Startdatum nach Enddatum
    await page.getByTestId('audit-from').fill('2026-12-31');
    await page.getByTestId('audit-to').fill('2026-01-01');
    await page.getByTestId('audit-apply').click();
    await expect(page.getByTestId('audit-notice')).toContainText('Startdatum');
    await ctx.close();
  });
});

test.describe('Admin-Bereich auf allen Geräten', () => {
  test.use({ storageState: ADMIN_STATE });

  test('TC-ADM-001 TC-RWD-001 alle Reiter ohne horizontales Scrollen; Reiter per Tastatur und Adresse erreichbar', async ({
    page,
  }) => {
    for (const tab of ['users', 'departments', 'company', 'industries', 'cross', 'mail', 'ai', 'audit']) {
      await openTab(page, tab);
      await expect(page.getByTestId(`admin-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `Reiter ${tab}`).toBeLessThanOrEqual(1);
    }
    await page.getByTestId('admin-tab-audit').focus();
    await page.keyboard.press('Home');
    await expect(page.getByTestId('admin-tab-users')).toBeFocused();
    await expect(page).toHaveURL(/tab=users/);
    await page.keyboard.press('End');
    await expect(page.getByTestId('admin-tab-audit')).toHaveAttribute('aria-selected', 'true');
  });

  test('TC-ADM-024 Nicht-Admins erhalten auf die neuen Admin-Schnittstellen 403', async ({
    browser,
  }, info) => {
    const u = await createActiveUser(ada, info, 'assessor', 'rechte');
    const ctx = await loggedInContext(browser, u.email, u.password);
    for (const path of [
      '/api/admin/companies',
      '/api/admin/departments',
      '/api/admin/mail-config',
      '/api/admin/ai-modules',
      '/api/admin/audit',
    ])
      expect((await ctx.request.get(path)).status(), path).toBe(403);
    expect(
      (
        await ctx.request.post('/api/admin/cross-password-reset', {
          headers: CSRF,
          data: { email: 'x@y.de' },
        })
      ).status(),
    ).toBe(403);
    await ctx.close();
  });
});
