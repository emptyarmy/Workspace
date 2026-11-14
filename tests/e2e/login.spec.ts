import { expect, test } from '@playwright/test';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="200" height="60" fill="#c00"/></svg>`;

test.describe('Login-Seite und Firmenlogo (AUTH)', () => {
  test('TC-AUTH-010 /login/<kürzel> zeigt das Logo der Firma', async ({ page }) => {
    await page.route('**/public/branding/beispiel', (r) =>
      r.fulfill({
        json: {
          name: 'Beispiel GmbH',
          logoUrl: 'https://logos.example/beispiel.svg',
          logoAlt: 'Beispiel GmbH Logo',
        },
      }),
    );
    await page.route('https://logos.example/**', (r) =>
      r.fulfill({ contentType: 'image/svg+xml', body: LOGO_SVG }),
    );
    await page.goto('/login/beispiel');
    const logo = page.getByTestId('company-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', 'https://logos.example/beispiel.svg');
    await expect(logo).toHaveAttribute('alt', 'Beispiel GmbH Logo');
  });

  test('TC-AUTH-011 Logo-URL nicht erreichbar → Platzhalter, Login bleibt bedienbar', async ({ page }) => {
    await page.route('**/public/branding/kaputt', (r) =>
      r.fulfill({
        json: { name: 'Kaputt AG', logoUrl: 'https://logos.example/fehlt.png', logoAlt: 'Kaputt AG' },
      }),
    );
    await page.route('https://logos.example/**', (r) => r.fulfill({ status: 404 }));
    await page.goto('/login/kaputt');
    await expect(page.getByTestId('logo-placeholder')).toBeVisible();
    await expect(page.getByTestId('company-logo')).toHaveCount(0);
    await expect(page.getByTestId('login-submit')).toBeEnabled();
  });

  test('TC-AUTH-012 unbekanntes Firmenkürzel → neutrales Logo, keine Fehlerseite', async ({ page }) => {
    await page.goto('/login/gibt-es-nicht');
    await expect(page.getByTestId('login-card')).toBeVisible();
    await expect(page.getByTestId('logo-placeholder')).toHaveAttribute('aria-label', 'AI_TPI');
  });

  test('TC-AUTH-004 leere Felder → Feldfehler, kein Request', async ({ page }) => {
    await page.goto('/login');
    let requested = false;
    page.on('request', (r) => {
      if (r.url().includes('/api/auth/login')) requested = true;
    });
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-email-error')).toHaveText(
      'Bitte geben Sie Ihre E-Mail-Adresse ein.',
    );
    await expect(page.getByTestId('login-password-error')).toBeVisible();
    await expect(page.getByTestId('login-email')).toHaveAttribute('aria-invalid', 'true');
    expect(requested).toBe(false);
  });

  test('TC-AUTH-004 ungültiges E-Mail-Format → Feldfehler', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('keine-mail');
    await page.getByTestId('login-password').fill('irgendwas');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-email-error')).toHaveText(
      'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    );
  });

  test('TC-AUTH-002/003 falsches Passwort und unbekannte E-Mail → identische Meldung', async ({ page }) => {
    const texts: string[] = [];
    for (const [email, pw] of [
      ['ada.admin@e2e-firma.de', 'Falsch123!x'],
      ['niemand@e2e-firma.de', 'Falsch123!x'],
    ]) {
      await page.goto('/login');
      await page.getByTestId('login-email').fill(email!);
      await page.getByTestId('login-password').fill(pw!);
      await page.getByTestId('login-submit').click();
      await expect(page.getByTestId('login-message')).toBeVisible();
      texts.push((await page.getByTestId('login-message').textContent())!.trim());
      await expect(page.getByTestId('login-password')).toHaveValue('');
    }
    expect(texts[0]).toBe('E-Mail-Adresse oder Passwort ist falsch.');
    expect(texts[1]).toBe(texts[0]);
  });
});

test.describe('Passwort vergessen (RST)', () => {
  test('TC-RST-001/002 gleiche Bestätigung für bekannte und unbekannte Adressen', async ({ page }) => {
    for (const email of ['admin@beispiel.de', 'unbekannt@nirgendwo.de']) {
      await page.goto('/login');
      await page.getByTestId('login-forgot').click();
      await page.getByTestId('forgot-email').fill(email);
      await page.getByTestId('forgot-submit').click();
      await expect(page.getByTestId('forgot-confirmation')).toContainText(
        'Falls die Adresse bei uns registriert ist',
      );
    }
  });

  test('ungültige E-Mail → Feldfehler (negativ)', async ({ page }) => {
    await page.goto('/passwort-vergessen');
    await page.getByTestId('forgot-email').fill('x@');
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-email-error')).toBeVisible();
    await expect(page.getByTestId('forgot-confirmation')).toHaveCount(0);
  });
});

test('unbekannte Seite → „Seite nicht gefunden“ mit Rückweg (negativ)', async ({ page }) => {
  await page.goto('/gibt/es/nicht');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await page.getByRole('link', { name: 'Zur Anmeldung' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('API: Health meldet Datenbank, Katalog erreichbar', async ({ request }) => {
  expect(await (await request.get('/api/health')).json()).toMatchObject({ status: 'ok', db: 'up' });
  const cat = await (await request.get('/api/catalog')).json();
  expect(cat.keyAreas).toHaveLength(19);
});

test('TC-SET-003 Ersteinrichtung nach erfolgter Einrichtung nicht mehr verfügbar', async ({ page }) => {
  await page.goto('/einrichtung');
  await expect(page.getByTestId('setup-unavailable')).toBeVisible();
});

test('TC-SET-006 Ersteinrichtung: Server oder Datenbank nicht erreichbar → eigene Meldung statt „nicht verfügbar“', async ({
  page,
}) => {
  await page.route('**/api/setup/status', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"db_unavailable"}' }),
  );
  await page.goto('/einrichtung');
  await expect(page.getByTestId('setup-error')).toContainText('HTTP 503');
  await expect(page.getByTestId('setup-unavailable')).toHaveCount(0);

  await page.route('**/api/setup/status', (r) => r.abort('connectionrefused'));
  await page.reload();
  await expect(page.getByTestId('setup-error')).toContainText('nicht erreichbar');

  // Andere Anwendung auf SERVER_PORT: 404, aber nicht die Antwort des AI_TPI-Servers
  await page.route('**/api/setup/status', (r) =>
    r.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not Found</h1>' }),
  );
  await page.reload();
  await expect(page.getByTestId('setup-error')).toContainText('andere Anwendung');
  await expect(page.getByTestId('setup-unavailable')).toHaveCount(0);
});

test('TC-AUTH-006 geschützte Seite ohne Anmeldung → Login, danach Rückkehr zur Seite', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)admin/);
  await page.getByTestId('login-email').fill('ada.admin@e2e-firma.de');
  await page.getByTestId('login-password').fill('Tisch7&Laterne');
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/admin$/);
});
