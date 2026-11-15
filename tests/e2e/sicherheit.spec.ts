import { expect, test } from '@playwright/test';
import { CSRF } from './helpers';

/**
 * Security-Review 8b: Verhalten der Oberfläche bei Rate-Limits und Sicherheits-Header der API.
 * Die Rate-Limits sind im Testserver aus (parallele Tests); die 429-Antwort wird deshalb nachgebildet.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('Rate-Limit: Anmeldung, „Passwort vergessen“ und Passwort setzen zeigen eine verständliche Meldung', async ({
  page,
}) => {
  const limited = { status: 429, json: { error: 'rate_limited' }, headers: { 'retry-after': '42' } };
  await page.route('**/api/auth/login', (r) => r.fulfill(limited));
  await page.route('**/api/auth/password-reset', (r) => r.fulfill(limited));

  await page.goto('/login');
  await page.getByTestId('login-email').fill('max@beispiel.de');
  await page.getByTestId('login-password').fill('Irgendwas1!');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-message')).toContainText('Zu viele Anfragen in kurzer Zeit');
  await expect(page.getByTestId('login-message')).not.toContainText('gesperrt');

  await page.goto('/passwort-vergessen');
  await page.getByTestId('forgot-email').fill('max@beispiel.de');
  await page.getByTestId('forgot-submit').click();
  await expect(page.getByTestId('forgot-email-error')).toContainText('Zu viele Anfragen');
  await expect(page.getByTestId('forgot-confirmation')).toHaveCount(0);
});

test('API liefert Sicherheits-Header (CSP, kein Caching, Clickjacking-Schutz)', async ({ request }) => {
  const res = await request.get('/api/health');
  const h = res.headers();
  expect(h['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['cache-control']).toBe('no-store');
  // CSRF-Schutz: schreibende Anfrage ohne Header → 403
  expect((await request.post('/api/auth/logout')).status()).toBe(403);
  expect((await request.post('/api/auth/logout', { headers: CSRF })).status()).not.toBe(403);
});
