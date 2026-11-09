/**
 * Integrationstests Branchenliste (Admin-Bereich, Reiter „Branchen“) gegen PostgreSQL.
 * Nur mit TEST_DATABASE_URL; die Datenbank wird geleert!
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { industries } from '../src/db/schema';
import { createMailer } from '../src/mail/mailer';

const url = process.env.TEST_DATABASE_URL;
const H = { 'x-requested-with': 'ai-tpi' };
const PW = 'Tisch7&Laterne';

interface Industry {
  code: string;
  nameDe: string;
  nameEn: string;
  naceRef: string | null;
  active: boolean;
  standard: boolean;
  ownCompany: boolean;
}

describe.skipIf(!url)('Branchenliste pflegen (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let admin = '';
  const cookieOf = (res: LightMyRequestResponse) => {
    const c = res.cookies.find((x) => x.name === 'ai_tpi_session');
    return c ? `ai_tpi_session=${c.value}` : '';
  };
  const req = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', u: string, payload?: object, cookie = admin) =>
    app.inject({ method, url: u, payload, headers: { ...H, cookie }, remoteAddress: '127.0.0.1' });
  const list = async () => (await req('GET', '/api/admin/industries')).json() as Industry[];

  beforeAll(async () => {
    handle = createDb(url!);
    await handle.db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    await handle.db.insert(industries).values(DEFAULT_INDUSTRIES);
    const config = loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true', MAIL_TRANSPORT: 'memory' });
    app = await buildApp({ config, db: handle, mailer: createMailer(config) });
    const setup = await req(
      'POST',
      '/api/setup',
      {
        companyName: 'Alpha GmbH',
        companySlug: 'alpha',
        industryCode: 'RES',
        name: 'Anna Alpha',
        email: 'anna@alpha.de',
        password: PW,
        passwordRepeat: PW,
      },
      '',
    );
    admin = cookieOf(setup);
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  it('TC-ADM-048 Liste enthält alle Branchen inkl. Kennzeichnung Standard und eigene Branche', async () => {
    const all = await list();
    expect(all).toHaveLength(DEFAULT_INDUSTRIES.length);
    expect(all.every((i) => i.standard)).toBe(true);
    expect(all.find((i) => i.code === 'RES')).toMatchObject({ ownCompany: true, active: true });
    expect(all.filter((i) => i.ownCompany)).toHaveLength(1);
  });

  it('TC-ADM-049 Branche anlegen: Code wird groß geschrieben; danach in der Auswahl für alle Firmen', async () => {
    const res = await req('POST', '/api/admin/industries', {
      code: 'gam',
      nameDe: 'Spiele und E-Sport',
      nameEn: 'Gaming & eSports',
      naceRef: 'J 58.21',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ code: 'GAM', standard: false, active: true });
    const pub = (await req('GET', '/api/industries')).json() as Array<{ code: string }>;
    expect(pub.map((i) => i.code)).toContain('GAM');
  });

  it('TC-ADM-050 negativ: ungültiger Code, Code oder Bezeichnung schon vergeben, zu kurzer Name', async () => {
    for (const code of ['1AB', 'A', 'ABCDEF', 'A-B'])
      expect(
        (await req('POST', '/api/admin/industries', { code, nameDe: 'Xx Neu', nameEn: 'Xx New' })).json(),
      ).toMatchObject({
        error: 'invalid_input',
        fields: ['code'],
      });
    expect(
      (await req('POST', '/api/admin/industries', { code: 'res', nameDe: 'Neu', nameEn: 'New' })).json()
        .error,
    ).toBe('code_taken');
    expect(
      (
        await req('POST', '/api/admin/industries', {
          code: 'NEU',
          nameDe: 'versicherungen',
          nameEn: 'Something',
        })
      ).json().error,
    ).toBe('name_de_taken');
    expect(
      (
        await req('POST', '/api/admin/industries', { code: 'NEU', nameDe: 'Etwas', nameEn: 'INSURANCE' })
      ).json().error,
    ).toBe('name_en_taken');
    expect(
      (await req('POST', '/api/admin/industries', { code: 'NEU', nameDe: 'X', nameEn: 'Y' })).json().fields,
    ).toEqual(['nameDe', 'nameEn']);
  });

  it('TC-ADM-051 umbenennen (auch Standardbranchen); Code unveränderlich; Namenskonflikt → 409', async () => {
    const r = await req('PATCH', '/api/admin/industries/RES', {
      nameDe: 'Immobilien, Wohnungswirtschaft und Messdienste',
      naceRef: 'L 68, N 81, M 71',
    });
    expect(r.json()).toMatchObject({ code: 'RES', standard: true, naceRef: 'L 68, N 81, M 71' });
    expect((await req('PATCH', '/api/admin/industries/RES', { code: 'XYZ' })).statusCode).toBe(400);
    expect((await req('PATCH', '/api/admin/industries/GAM', { nameEn: 'insurance' })).json().error).toBe(
      'name_en_taken',
    );
    expect((await req('PATCH', '/api/admin/industries/ZZZ', { nameDe: 'Egal' })).statusCode).toBe(404);
    expect((await req('PATCH', '/api/admin/industries/kein!code', { nameDe: 'Egal' })).statusCode).toBe(404);
  });

  it('TC-ADM-052 deaktivieren: nicht bei Verwendung; deaktivierte Branche nicht mehr auswählbar', async () => {
    expect((await req('PATCH', '/api/admin/industries/RES', { active: false })).json().error).toBe(
      'industry_in_use',
    );
    expect((await req('PATCH', '/api/admin/industries/AGR', { active: false })).json()).toMatchObject({
      active: false,
    });
    const pub = (await req('GET', '/api/industries')).json() as Array<{ code: string }>;
    expect(pub.map((i) => i.code)).not.toContain('AGR');
    expect((await req('PATCH', '/api/admin/company', { industryCode: 'AGR' })).statusCode).toBe(400);
    const cross = await req('POST', '/api/admin/companies', {
      company: { name: 'Beta', slug: 'beta', domains: ['beta.de'], industryCode: 'AGR' },
      admin: { name: 'Bernd', email: 'bernd@beta.de' },
    });
    expect(cross.statusCode).toBe(400);
    expect((await req('PATCH', '/api/admin/industries/AGR', { active: true })).json().active).toBe(true);
  });

  it('TC-ADM-053 löschen: nur eigene, unbenutzte Branchen; Standard und verwendete → 409', async () => {
    expect((await req('DELETE', '/api/admin/industries/ITS')).json().error).toBe('standard_industry');
    await req('PATCH', '/api/admin/company', { industryCode: 'GAM' });
    expect((await req('DELETE', '/api/admin/industries/GAM')).json().error).toBe('industry_in_use');
    await req('PATCH', '/api/admin/company', { industryCode: 'RES' });
    expect((await req('DELETE', '/api/admin/industries/GAM')).statusCode).toBe(204);
    expect((await list()).some((i) => i.code === 'GAM')).toBe(false);
  });

  it('Änderungen stehen im Audit-Log; Nicht-Admins erhalten 403', async () => {
    const audit = (await req('GET', '/api/admin/audit?action=industry&limit=50')).json();
    expect(audit.items.map((i: { action: string }) => i.action)).toEqual(
      expect.arrayContaining(['admin.industry_created', 'admin.industry_updated', 'admin.industry_deleted']),
    );
    const u = await req('POST', '/api/admin/users', {
      name: 'Lea Leser',
      email: 'lea@alpha.de',
      role: 'reader',
    });
    expect(u.statusCode).toBe(201);
    await handle.db.execute(
      sql`update app_user set status = 'active', password_hash = ${'x'} where email = 'lea@alpha.de'`,
    );
    // Sitzung direkt anlegen (Passwort-Ablauf ist an anderer Stelle getestet).
    const { createSession } = await import('../src/auth/sessions');
    const token = await createSession(handle.db, u.json().id);
    const reader = `ai_tpi_session=${token}`;
    expect((await req('GET', '/api/admin/industries', undefined, reader)).statusCode).toBe(403);
    expect(
      (await req('POST', '/api/admin/industries', { code: 'NEU', nameDe: 'Neu', nameEn: 'New' }, reader))
        .statusCode,
    ).toBe(403);
  });
});
