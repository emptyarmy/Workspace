import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { activateByEmail, createTestCompany, CSRF, E2E, loggedInContext, uniqueId } from './helpers';

/**
 * Gemeinsame Bausteine der Erfassungstests (Phase 5): eigene Testfirma mit Team und Assessment je Test.
 * Eigene Firma statt E2E-Firma: Sonst wächst deren Benutzer- und Abteilungsliste so stark, dass Admin-Tests langsam werden.
 */
export const KP = 'KB01.K.01';

export interface Person {
  id: string;
  email: string;
  name: string;
}

/** Testfirma mit angemeldetem Admin (legt Abteilungen und Nutzer an). */
export interface Org {
  request: APIRequestContext;
  domain: string;
  slug: string;
}

export async function org(admin: APIRequestContext, browser: Browser, info: TestInfo): Promise<Org> {
  const c = await createTestCompany(admin, info);
  const ctx = await loggedInContext(browser, c.adminEmail, c.password);
  return { request: ctx.request, domain: c.domain, slug: c.slug };
}

export async function department(o: Org, name: string): Promise<string> {
  const r = await o.request.post('/api/admin/departments', { headers: CSRF, data: { name } });
  expect(r.status()).toBe(201);
  return (await r.json()).id;
}

export async function person(
  admin: APIRequestContext,
  o: Org,
  info: TestInfo,
  role: 'assessor' | 'respondent' | 'reader',
  name: string,
  departmentId?: string,
): Promise<Person> {
  const email = `${role}.${uniqueId(info)}@${o.domain}`;
  const r = await o.request.post('/api/admin/users', {
    headers: CSRF,
    data: { name, email, role, departmentId },
  });
  expect(r.status()).toBe(201);
  await activateByEmail(admin, email);
  return { id: (await r.json()).id, email, name };
}

/** Komplettes Team mit eigenem Assessment je Test (Tests laufen parallel auf derselben Datenbank). */
export async function team(
  admin: APIRequestContext,
  browser: Browser,
  info: TestInfo,
  opts: { methodModel?: 'classic' | 'agile' } = {},
) {
  const id = uniqueId(info);
  const o = await org(admin, browser, info);
  const dev = await department(o, `Entwicklung ${id}`);
  const biz = await department(o, `Fachbereich ${id}`);
  const assessor = await person(admin, o, info, 'assessor', 'Arne Assessor');
  const eva = await person(admin, o, info, 'respondent', 'Eva Entwicklung', dev);
  const emil = await person(admin, o, info, 'respondent', 'Emil Entwicklung', dev);
  const fritz = await person(admin, o, info, 'respondent', 'Fritz Fach', biz);
  const lena = await person(admin, o, info, 'reader', 'Lena Leser');
  const ctx = await loggedInContext(browser, assessor.email, E2E.userPassword);
  const project = `Assessment ${id}`;
  const created = await ctx.request.post('/api/assessments', {
    headers: CSRF,
    data: {
      project,
      assessorName: assessor.name,
      startDate: '2026-11-01',
      methodModel: opts.methodModel ?? 'agile',
    },
  });
  expect(created.status()).toBe(201);
  const asm = (await created.json()).id as string;
  for (const p of [eva, emil, fritz, lena])
    expect(
      (
        await ctx.request.post(`/api/assessments/${asm}/members`, { headers: CSRF, data: { userId: p.id } })
      ).status(),
    ).toBe(201);
  await ctx.request.put(`/api/assessments/${asm}/assignments/KB01`, {
    headers: CSRF,
    data: { departmentIds: [dev, biz] },
  });
  return {
    org: o,
    id,
    dev,
    biz,
    devName: `Entwicklung ${id}`,
    assessor,
    eva,
    emil,
    fritz,
    lena,
    asm,
    project,
    assessorCtx: ctx,
  };
}

export async function as(browser: Browser, p: Person): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await loggedInContext(browser, p.email, E2E.userPassword);
  return { ctx, page: await ctx.newPage() };
}
