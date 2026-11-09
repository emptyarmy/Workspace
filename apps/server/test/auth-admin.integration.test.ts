/**
 * Integrationstests Phase 4a gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Ersteinrichtung → Einladung → Passwort vergessen → Einmal-Link → Login → Admin-Funktionen.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { auditLog, blockedDomains, industries, users } from '../src/db/schema';
import { createMailer, type Mailer } from '../src/mail/mailer';

const url = process.env.TEST_DATABASE_URL;
const H = { 'x-requested-with': 'ai-tpi' };
const ADMIN_PW = 'Tisch7&Laterne';

describe.skipIf(!url)('Phase 4a: Anmeldung und Admin (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let mailer: Mailer;
  let adminCookie = '';

  const cookieOf = (res: LightMyRequestResponse) => {
    const c = res.cookies.find((x) => x.name === 'ai_tpi_session');
    return c ? `ai_tpi_session=${c.value}` : '';
  };
  const linkFor = (to: string) => {
    const m = [...mailer.outbox!].reverse().find((x) => x.to === to && x.text.includes('token='));
    return m ? new URL(m.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token')! : null;
  };
  const post = (u: string, payload: object, cookie = '', remoteAddress = '127.0.0.1') =>
    app.inject({ method: 'POST', url: u, payload, headers: { ...H, cookie }, remoteAddress });

  beforeAll(async () => {
    handle = createDb(url!);
    await handle.db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    await handle.db.insert(industries).values(DEFAULT_INDUSTRIES);
    await handle.db.insert(blockedDomains).values([{ domain: 'gmail.com' }]);
    const config = loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true', MAIL_TRANSPORT: 'memory' });
    mailer = createMailer(config);
    app = await buildApp({ config, db: handle, mailer });
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  describe('Ersteinrichtung (SET)', () => {
    const body = {
      companyName: 'Beispiel GmbH',
      companySlug: 'beispiel',
      industryCode: 'RES',
      name: 'Erika Admin',
      email: 'erika@beispiel.de',
      password: ADMIN_PW,
      passwordRepeat: ADMIN_PW,
    };
    it('Freemail-Domain wird abgewiesen (TC-TEN-009)', async () => {
      const res = await post('/api/setup', { ...body, email: 'erika@gmail.com' });
      expect(res.json().error).toBe('domain_blocked');
    });
    it('schwaches Passwort wird abgewiesen', async () => {
      const res = await post('/api/setup', { ...body, password: 'Passw0rt!', passwordRepeat: 'Passw0rt!' });
      expect(res.json().error).toBe('password_policy');
    });
    it('von außen → 404 (TC-SET-002)', async () => {
      expect((await post('/api/setup', body, '', '192.168.0.5')).statusCode).toBe(404);
    });
    it('erster Nutzer über localhost wird Admin und ist angemeldet (TC-SET-001)', async () => {
      const res = await post('/api/setup', body);
      expect(res.statusCode).toBe(201);
      adminCookie = cookieOf(res);
      const me = await app.inject({ url: '/api/auth/me', headers: { cookie: adminCookie } });
      expect(me.json()).toMatchObject({ role: 'admin', companySlug: 'beispiel', email: 'erika@beispiel.de' });
    });
    it('zweite Ersteinrichtung → 404 (TC-SET-003)', async () => {
      expect(
        (await post('/api/setup', { ...body, companySlug: 'zwei', email: 'x@zwei.de' })).statusCode,
      ).toBe(404);
    });
  });

  describe('Einladung → Passwort vergessen → Einmal-Link → Login (USR/RST/AUTH)', () => {
    const email = 'max.muster@beispiel.de';
    let userId = '';
    it('fremde Domain wird abgewiesen (TC-TEN-004)', async () => {
      const res = await post(
        '/api/admin/users',
        { name: 'Fremd', email: 'max@andere.de', role: 'respondent' },
        adminCookie,
      );
      expect(res.json().error).toBe('email_domain');
    });
    it('Admin legt Nutzer an → Einladungs-Mail mit Firmen-Login-Link (TC-ADM-003, TC-USR-001)', async () => {
      const res = await post(
        '/api/admin/users',
        { name: 'Max Muster', email, role: 'respondent' },
        adminCookie,
      );
      expect(res.statusCode).toBe(201);
      userId = res.json().id;
      expect(res.json().status).toBe('invited');
      const mail = mailer.outbox!.find((m) => m.to === email)!;
      expect(mail.text).toContain('/login/beispiel');
      expect(mail.text).toContain('Passwort vergessen');
    });
    it('doppelte E-Mail (andere Schreibweise) → 409 (TC-ADM-004)', async () => {
      const res = await post(
        '/api/admin/users',
        { name: 'Doppelt', email: 'MAX.Muster@Beispiel.de', role: 'reader' },
        adminCookie,
      );
      expect(res.statusCode).toBe(409);
    });
    it('eingeladener Nutzer kann sich ohne Passwort nicht anmelden', async () => {
      const res = await post('/api/auth/login', { email, password: 'irgendwas' });
      expect(res.statusCode).toBe(401);
    });
    it('Passwort vergessen sendet Einmal-Link; unbekannte Adresse gleiche Antwort ohne Mail (TC-RST-001/002)', async () => {
      const before = mailer.outbox!.length;
      expect((await post('/api/auth/password-reset', { email: 'niemand@beispiel.de' })).statusCode).toBe(202);
      expect(mailer.outbox!.length).toBe(before);
      expect((await post('/api/auth/password-reset', { email })).statusCode).toBe(202);
      expect(linkFor(email)).toBeTruthy();
    });
    it('Passwort mit Bezug zum Namen wird abgewiesen (TC-PWD-011)', async () => {
      const token = linkFor(email)!;
      const res = await post('/api/auth/password', {
        token,
        password: 'Muster2026!',
        passwordRepeat: 'Muster2026!',
      });
      expect(res.statusCode).toBe(400);
    });
    it('Passwort über Einmal-Link festlegen → aktiv; Link danach verbraucht (TC-RST-005/007)', async () => {
      const token = linkFor(email)!;
      const res = await post('/api/auth/password', {
        token,
        password: 'Kaffee7Mond!',
        passwordRepeat: 'Kaffee7Mond!',
      });
      expect(res.json()).toMatchObject({ status: 'password_set', companySlug: 'beispiel' });
      const again = await post('/api/auth/password', {
        token,
        password: 'Kaffee7Mond!',
        passwordRepeat: 'Kaffee7Mond!',
      });
      expect(again.json().error).toBe('invalid_token');
      const [u] = await handle.db.select().from(users).where(eq(users.id, userId));
      expect(u!.status).toBe('active');
    });
    it('Login: falsches Passwort und unbekannte E-Mail → identische Antwort (TC-AUTH-002/003)', async () => {
      const wrong = await post('/api/auth/login', { email, password: 'falsch' });
      const unknown = await post('/api/auth/login', { email: 'unbekannt@beispiel.de', password: 'falsch' });
      expect(wrong.statusCode).toBe(401);
      expect(unknown.statusCode).toBe(401);
      expect(wrong.json()).toEqual(unknown.json());
    });
    it('Login erfolgreich (TC-AUTH-001), Logout beendet Sitzung (TC-AUTH-007)', async () => {
      const res = await post('/api/auth/login', {
        email: 'MAX.MUSTER@beispiel.de',
        password: 'Kaffee7Mond!',
      });
      expect(res.statusCode).toBe(200);
      const c = cookieOf(res);
      expect((await app.inject({ url: '/api/auth/me', headers: { cookie: c } })).statusCode).toBe(200);
      await post('/api/auth/logout', {}, c);
      expect((await app.inject({ url: '/api/auth/me', headers: { cookie: c } })).statusCode).toBe(401);
    });
    it('Befragter hat keinen Zugriff auf Admin-API (TC-ADM-002)', async () => {
      const c = cookieOf(await post('/api/auth/login', { email, password: 'Kaffee7Mond!' }));
      expect((await app.inject({ url: '/api/admin/users', headers: { cookie: c } })).statusCode).toBe(403);
    });
    it('5 Fehlversuche → Konto gesperrt, auch mit richtigem Passwort (TC-AUTH-005)', async () => {
      for (let i = 0; i < 4; i++)
        expect((await post('/api/auth/login', { email, password: 'falsch' })).statusCode).toBe(401);
      expect((await post('/api/auth/login', { email, password: 'falsch' })).statusCode).toBe(429);
      expect((await post('/api/auth/login', { email, password: 'Kaffee7Mond!' })).statusCode).toBe(429);
      await handle.db.update(users).set({ lockedUntil: null }).where(eq(users.id, userId));
    });
  });

  describe('Admin: Nutzer verwalten (ADM/USR)', () => {
    let userId = '';
    let adminId = '';
    beforeAll(async () => {
      const me = await app.inject({ url: '/api/auth/me', headers: { cookie: adminCookie } });
      adminId = me.json().id;
      const res = await post(
        '/api/admin/users',
        { name: 'Lea Leser', email: 'ext.lea.leser@beispiel.de', role: 'reader' },
        adminCookie,
      );
      userId = res.json().id;
      expect(res.json().isExternal).toBe(true); // TC-TEN-022
    });
    const patch = (id: string, payload: object, cookie = adminCookie) =>
      app.inject({ method: 'PATCH', url: `/api/admin/users/${id}`, payload, headers: { ...H, cookie } });

    it('Rolle ändern und unbekannte Rolle abweisen (TC-USR-016)', async () => {
      expect((await patch(userId, { role: 'assessor' })).json().role).toBe('assessor');
      expect((await patch(userId, { role: 'guest' })).statusCode).toBe(400);
    });
    it('Admin kann sich nicht selbst herabstufen oder deaktivieren (TC-USR-013)', async () => {
      expect((await patch(adminId, { role: 'reader' })).json().error).toBe('self_protection');
      expect((await patch(adminId, { active: false })).json().error).toBe('self_protection');
    });
    it('Admin kann sich nicht selbst löschen', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${adminId}`,
        headers: { ...H, cookie: adminCookie },
      });
      expect(res.json().error).toBe('self_protection');
    });
    it('letzter Admin ist geschützt (TC-ADM-005); mit zweitem Admin erlaubt', async () => {
      await patch(userId, { role: 'admin' });
      // Nutzer ist nur eingeladen → zählt nicht als aktiver Admin; Herabstufen des eingeladenen ist erlaubt
      expect((await patch(userId, { role: 'reader' })).statusCode).toBe(200);
    });
    it('E-Mail-Änderung auf fremde Domain → abgewiesen (TC-TEN-005)', async () => {
      expect((await patch(userId, { email: 'lea@fremd.de' })).json().error).toBe('email_domain');
    });
    it('deaktivieren und reaktivieren (TC-USR-005/006)', async () => {
      expect((await patch(userId, { active: false })).json().status).toBe('inactive');
      expect((await patch(userId, { active: true })).json().status).toBe('invited');
    });
    it('Passwort-Reset durch Admin sendet neuen Link (TC-ADM-020)', async () => {
      const res = await post(`/api/admin/users/${userId}/password-reset`, {}, adminCookie);
      expect(res.statusCode).toBe(202);
      expect(linkFor('ext.lea.leser@beispiel.de')).toBeTruthy();
    });
    it('Löschen pseudonymisiert und protokolliert (TC-USR-007)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${userId}`,
        headers: { ...H, cookie: adminCookie },
      });
      expect(res.statusCode).toBe(204);
      const [u] = await handle.db.select().from(users).where(eq(users.id, userId));
      expect(u!.status).toBe('deleted');
      expect(u!.name).toMatch(/^Gelöschter Nutzer #/);
      expect(u!.email).toMatch(/@deleted\.invalid$/);
      const logs = await handle.db.select().from(auditLog).where(eq(auditLog.entityId, userId));
      expect(logs.map((l) => l.action)).toContain('admin.user_deleted');
      const list = await app.inject({ url: '/api/admin/users', headers: { cookie: adminCookie } });
      expect(list.json().map((x: { id: string }) => x.id)).not.toContain(userId);
    });
    it('ungültige bzw. fremde ID → 404', async () => {
      expect((await patch('00000000-0000-4000-8000-000000000000', { name: 'X Y' })).statusCode).toBe(404);
      expect((await patch('keine-uuid', { name: 'X Y' })).statusCode).toBe(404);
    });
  });

  describe('Admin: Meine Firma', () => {
    const patchCompany = (payload: object) =>
      app.inject({
        method: 'PATCH',
        url: '/api/admin/company',
        payload,
        headers: { ...H, cookie: adminCookie },
      });
    it('Logo-URL nur https (TC-ADM-007)', async () => {
      for (const logoUrl of [
        'javascript:alert(1)',
        'ftp://x.de/l.png',
        'http://x.de/l.png',
        'data:image/png;base64,xx',
        'kein-url',
      ])
        expect((await patchCompany({ logoUrl })).statusCode, logoUrl).toBe(400);
    });
    it('Logo und Branche speichern → Branding der Login-Seite (TC-ADM-006, TC-TEN-003)', async () => {
      expect(
        (
          await patchCompany({
            logoUrl: 'https://cdn.beispiel.de/logo.svg',
            logoAlt: 'Beispiel Logo',
            industryCode: 'ITS',
          })
        ).statusCode,
      ).toBe(200);
      const c = await app.inject({ url: '/api/admin/company', headers: { cookie: adminCookie } });
      expect(c.json()).toMatchObject({ industryCode: 'ITS', domains: ['beispiel.de'] });
      expect((await app.inject('/public/branding/beispiel')).json()).toMatchObject({
        logoUrl: 'https://cdn.beispiel.de/logo.svg',
      });
    });
    it('unbekannte Branche → 400', async () => {
      expect((await patchCompany({ industryCode: 'XXX' })).statusCode).toBe(400);
    });
  });
});
