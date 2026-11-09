import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

/** Firma und Admin aus der Ersteinrichtung (setup.setup.ts). */
export const E2E = {
  companyName: 'E2E Prüffirma GmbH',
  slug: 'e2e-pruef',
  domain: 'e2e-firma.de',
  adminName: 'Ada Admin',
  adminEmail: 'ada.admin@e2e-firma.de',
  adminPassword: 'Tisch7&Laterne',
  userPassword: 'Kaffee7Mond!',
};
export const ADMIN_STATE = 'tests/e2e/.auth/admin.json';
export const CSRF = { 'x-requested-with': 'ai-tpi' };

/** Eindeutige Firmenadresse je Test und Geräteprofil (Tests laufen parallel auf derselben Datenbank). */
export function uniqueEmail(info: TestInfo, prefix = 'nutzer'): string {
  const id = `${info.project.name}-${info.workerIndex}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}.${id}@${E2E.domain}`.toLowerCase();
}

interface OutboxMail {
  to: string;
  subject: string;
  text: string;
}

/** Wartet auf eine E-Mail an `to` (Test-Outbox des Servers) und liefert die neueste passende. */
export async function waitForMail(
  request: APIRequestContext,
  to: string,
  contains: string,
): Promise<OutboxMail> {
  let found: OutboxMail | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/test/outbox?to=${encodeURIComponent(to)}`);
        const mails = (await res.json()) as OutboxMail[];
        found = [...mails].reverse().find((m) => m.text.includes(contains));
        return !!found;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return found!;
}

export function linkFrom(mail: OutboxMail): string {
  const m = mail.text.match(/https?:\/\/\S+/g) ?? [];
  const link = m.find((l) => l.includes('token=')) ?? m[0];
  return new URL(link!).pathname + new URL(link!).search;
}

/** Legt per API (als Admin) einen Nutzer an und lässt ihn sein Passwort über den Einmal-Link festlegen. */
export async function createActiveUser(
  adminRequest: APIRequestContext,
  info: TestInfo,
  role: 'admin' | 'assessor' | 'respondent' | 'reader' = 'respondent',
  prefix = 'nutzer',
): Promise<{ id: string; email: string; password: string; name: string }> {
  const email = uniqueEmail(info, prefix);
  const name = `Test ${prefix}`;
  const created = await adminRequest.post('/api/admin/users', { headers: CSRF, data: { name, email, role } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  await adminRequest.post('/api/auth/password-reset', { headers: CSRF, data: { email } });
  const mail = await waitForMail(adminRequest, email, 'token=');
  const token = new URL(mail.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token');
  const set = await adminRequest.post('/api/auth/password', {
    headers: CSRF,
    data: { token, password: E2E.userPassword, passwordRepeat: E2E.userPassword },
  });
  expect(set.status()).toBe(200);
  return { id, email, password: E2E.userPassword, name };
}

export async function login(page: Page, email: string, password: string, slug = E2E.slug) {
  await page.goto(`/login/${slug}`);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

/** Kurzer, eindeutiger Kennzeichner je Test und Profil (für Firmenkürzel und Domains, max. 20 Zeichen). */
export function uniqueId(info: TestInfo): string {
  const p = info.project.name.replace(/[^a-z]/g, '').slice(0, 4);
  return `${p}${info.workerIndex}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Passwort über „Passwort vergessen“ und den Einmal-Link festlegen (per API). */
export async function activateByEmail(
  request: APIRequestContext,
  email: string,
  password = E2E.userPassword,
) {
  await request.post('/api/auth/password-reset', { headers: CSRF, data: { email } });
  const mail = await waitForMail(request, email, 'token=');
  const token = new URL(mail.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token');
  const set = await request.post('/api/auth/password', {
    headers: CSRF,
    data: { token, password, passwordRepeat: password },
  });
  expect(set.status()).toBe(200);
}

export interface TestCompany {
  id: string;
  name: string;
  slug: string;
  domain: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

/**
 * Legt als Ada (Setup-Admin) eine eigene Firma mit aktivem Admin an (S-01). So laufen Tests, die
 * Firmeneinstellungen ändern, parallel auf allen Geräteprofilen ohne sich gegenseitig zu stören.
 */
export async function createTestCompany(
  adminRequest: APIRequestContext,
  info: TestInfo,
): Promise<TestCompany> {
  const id = uniqueId(info);
  const c = { name: `Testfirma ${id}`, slug: `t-${id}`, domain: `${id}.example.org` };
  const adminEmail = `admin@${c.domain}`;
  const res = await adminRequest.post('/api/admin/companies', {
    headers: CSRF,
    data: {
      company: { name: c.name, slug: c.slug, domains: [c.domain], industryCode: 'ITS' },
      admin: { name: `Admin ${id}`, email: adminEmail },
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  await activateByEmail(adminRequest, adminEmail);
  return {
    ...c,
    id: body.company.id,
    adminId: body.admin.id,
    adminName: `Admin ${id}`,
    adminEmail,
    password: E2E.userPassword,
  };
}

/** Neuer Browser-Kontext, per API angemeldet (Cookies gelten auch für Seiten dieses Kontexts). */
export async function loggedInContext(
  browser: Browser,
  email: string,
  password: string,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const res = await ctx.request.post('/api/auth/login', { headers: CSRF, data: { email, password } });
  expect(res.status()).toBe(200);
  return ctx;
}
