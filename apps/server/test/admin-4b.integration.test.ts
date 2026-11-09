/**
 * Integrationstests Phase 4b gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Firmenübergreifende Admin-Funktionen (S-01, S-10, S-13, S-14, S-15), Benachrichtigungen,
 * Abteilungen, Domains, Mail- und KI-Konfiguration je Firma (S-04), Audit-Log.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { aiModules, blockedDomains, companyMailConfig, industries } from '../src/db/schema';
import { createMailer, type Mailer } from '../src/mail/mailer';

const url = process.env.TEST_DATABASE_URL;
const H = { 'x-requested-with': 'ai-tpi' };
const PW = 'Tisch7&Laterne';
const USER_PW = 'Kaffee7Mond!';

describe.skipIf(!url)('Phase 4b: firmenübergreifende Administration und Konfiguration (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let mailer: Mailer;
  let fake: Server;
  let fakeUrl = '';
  const cookies: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const cookieOf = (res: LightMyRequestResponse) => {
    const c = res.cookies.find((x) => x.name === 'ai_tpi_session');
    return c ? `ai_tpi_session=${c.value}` : '';
  };
  const req = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    u: string,
    cookie = '',
    payload?: object,
  ) => app.inject({ method, url: u, payload, headers: { ...H, cookie }, remoteAddress: '127.0.0.1' });
  const mailsTo = (to: string) => mailer.outbox!.filter((m) => m.to === to);
  const tokenFor = (to: string) => {
    const m = [...mailer.outbox!].reverse().find((x) => x.to === to && x.text.includes('token='));
    return m ? new URL(m.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token')! : null;
  };
  /** Eingeladenen Nutzer aktivieren: Passwort vergessen → Einmal-Link → Passwort setzen → Login. */
  async function activate(email: string, password = USER_PW): Promise<string> {
    await req('POST', '/api/auth/password-reset', '', { email });
    const token = tokenFor(email)!;
    const set = await req('POST', '/api/auth/password', '', { token, password, passwordRepeat: password });
    expect(set.statusCode).toBe(200);
    const login = await req('POST', '/api/auth/login', '', { email, password });
    expect(login.statusCode).toBe(200);
    return cookieOf(login);
  }

  beforeAll(async () => {
    handle = createDb(url!);
    await handle.db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    await handle.db.insert(industries).values(DEFAULT_INDUSTRIES);
    await handle.db.insert(blockedDomains).values([{ domain: 'gmail.com' }, { domain: 'web.de' }]);
    const config = loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true', MAIL_TRANSPORT: 'memory' });
    mailer = createMailer(config);
    app = await buildApp({ config, db: handle, mailer });
    // Nachgebildeter KI-Server für den positiven Verbindungstest.
    fake = createServer((r, s) => {
      if (r.url === '/api/tags') {
        s.writeHead(200, { 'content-type': 'application/json' }).end('{"models":[]}');
      } else if (r.url === '/v1/models') {
        s.writeHead(r.headers.authorization === 'Bearer sk-richtig-1234' ? 200 : 401).end('{}');
      } else s.writeHead(404).end();
    });
    await new Promise<void>((ok) => fake.listen(0, '127.0.0.1', ok));
    fakeUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;

    const setup = await req('POST', '/api/setup', '', {
      companyName: 'Alpha GmbH',
      companySlug: 'alpha',
      industryCode: 'RES',
      name: 'Anna Alpha',
      email: 'anna@alpha.de',
      password: PW,
      passwordRepeat: PW,
    });
    expect(setup.statusCode).toBe(201);
    cookies.a = cookieOf(setup);
    // Zweiter aktiver Admin in Alpha (Empfänger von Benachrichtigungen).
    const a2 = await req('POST', '/api/admin/users', cookies.a, {
      name: 'Arno Alpha',
      email: 'arno@alpha.de',
      role: 'admin',
    });
    ids.a2 = a2.json().id;
    cookies.a2 = await activate('arno@alpha.de');
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
    await new Promise((ok) => fake?.close(ok));
  });

  describe('Abteilungen (FA-8)', () => {
    it('anlegen, doppelter Name (Groß-/Kleinschreibung) → 409, umbenennen', async () => {
      const res = await req('POST', '/api/admin/departments', cookies.a, { name: 'Qualitätssicherung' });
      expect(res.statusCode).toBe(201);
      ids.dep = res.json().id;
      expect(
        (await req('POST', '/api/admin/departments', cookies.a, { name: 'qualitätssicherung' })).json().error,
      ).toBe('name_taken');
      expect((await req('POST', '/api/admin/departments', cookies.a, { name: 'Q' })).statusCode).toBe(400);
      const ren = await req('PATCH', `/api/admin/departments/${ids.dep}`, cookies.a, { name: 'QS' });
      expect(ren.json().name).toBe('QS');
    });
    it('Nutzer mit Abteilung anlegen; Abteilung in Nutzung kann nicht gelöscht werden', async () => {
      const u = await req('POST', '/api/admin/users', cookies.a, {
        name: 'Paula Prüf',
        email: 'paula@alpha.de',
        role: 'respondent',
        departmentId: ids.dep,
      });
      expect(u.statusCode).toBe(201);
      expect(u.json().departmentId).toBe(ids.dep);
      ids.paula = u.json().id;
      const list = await req('GET', '/api/admin/departments', cookies.a);
      expect(list.json()[0]).toMatchObject({ name: 'QS', userCount: 1 });
      expect((await req('DELETE', `/api/admin/departments/${ids.dep}`, cookies.a)).json().error).toBe(
        'department_in_use',
      );
    });
    it('Abteilung deaktivieren; ungenutzte löschen; unbekannte ID → 404', async () => {
      expect(
        (await req('PATCH', `/api/admin/departments/${ids.dep}`, cookies.a, { active: false })).json().active,
      ).toBe(false);
      const tmp = await req('POST', '/api/admin/departments', cookies.a, { name: 'Temporär' });
      expect((await req('DELETE', `/api/admin/departments/${tmp.json().id}`, cookies.a)).statusCode).toBe(
        204,
      );
      expect((await req('DELETE', `/api/admin/departments/${tmp.json().id}`, cookies.a)).statusCode).toBe(
        404,
      );
      expect(
        (await req('PATCH', '/api/admin/departments/kein-uuid', cookies.a, { active: true })).statusCode,
      ).toBe(404);
    });
  });

  describe('Admin für neue Firma anlegen (S-01, M3)', () => {
    const body = (over: Record<string, unknown> = {}, admin: Record<string, unknown> = {}) => ({
      company: { name: 'Beta AG', slug: 'beta', domains: ['beta.de'], industryCode: 'ITS', ...over },
      admin: { name: 'Bernd Beta', email: 'bernd@beta.de', ...admin },
    });
    it('Freemail-Domain → 400, ungültige Domain → 400, eigene Domain → 409', async () => {
      expect(
        (await req('POST', '/api/admin/companies', cookies.a, body({ domains: ['gmail.com'] }))).json().error,
      ).toBe('domain_blocked');
      expect(
        (await req('POST', '/api/admin/companies', cookies.a, body({ domains: ['beta'] }))).json().error,
      ).toBe('domain_invalid');
      const taken = await req('POST', '/api/admin/companies', cookies.a, body({ domains: ['alpha.de'] }));
      expect(taken.statusCode).toBe(409);
      expect(taken.json().error).toBe('domain_taken');
    });
    it('E-Mail passt nicht zur Domain → 400; Kürzel vergeben → 409', async () => {
      expect(
        (await req('POST', '/api/admin/companies', cookies.a, body({}, { email: 'bernd@andere.de' }))).json()
          .error,
      ).toBe('email_domain');
      expect(
        (await req('POST', '/api/admin/companies', cookies.a, body({ slug: 'alpha' }))).json().error,
      ).toBe('slug_taken');
      expect((await req('POST', '/api/admin/companies', cookies.a, body({ slug: 'Beta!' }))).statusCode).toBe(
        400,
      );
    });
    it('neue Firma + Admin → 201, Einladung mit Login-Link der neuen Firma', async () => {
      const res = await req('POST', '/api/admin/companies', cookies.a, body());
      expect(res.statusCode).toBe(201);
      ids.beta = res.json().company.id;
      ids.b1 = res.json().admin.id;
      expect(mailsTo('bernd@beta.de')[0]!.text).toContain('/login/beta');
      cookies.b1 = await activate('bernd@beta.de');
      const me = await req('GET', '/api/auth/me', cookies.b1);
      expect(me.json()).toMatchObject({ role: 'admin', companySlug: 'beta' });
    });
    it('Firmenliste zeigt nur Name und Kürzel anderer Firmen', async () => {
      const list = (await req('GET', '/api/admin/companies', cookies.a)).json();
      expect(list).toEqual([{ id: ids.beta, name: 'Beta AG', slug: 'beta' }]);
    });
  });

  describe('Admin für bestehende Firma, „Von mir angelegte Admins“, Benachrichtigungen (S-01, M4, M4a, M4b)', () => {
    it('eigene Firma → 400; fremde E-Mail-Domain → 400; unbekannte Firma → 404', async () => {
      const own = await req(
        'POST',
        `/api/admin/companies/${(await req('GET', '/api/auth/me', cookies.a)).json().companyId}/admins`,
        cookies.a,
        {
          name: 'X',
          email: 'x@alpha.de',
        },
      );
      expect(own.json().error).toBe('own_company');
      expect(
        (
          await req('POST', `/api/admin/companies/${ids.beta}/admins`, cookies.a, {
            name: 'Bea',
            email: 'bea@alpha.de',
          })
        ).json().error,
      ).toBe('email_domain');
      expect(
        (
          await req('POST', '/api/admin/companies/00000000-0000-4000-8000-000000000000/admins', cookies.a, {
            name: 'Bea',
            email: 'bea@beta.de',
          })
        ).statusCode,
      ).toBe(404);
    });
    it('weiterer Admin für Beta → 201; Admins von Beta werden per Mail informiert', async () => {
      const res = await req('POST', `/api/admin/companies/${ids.beta}/admins`, cookies.a, {
        name: 'Bea Beta',
        email: 'bea@beta.de',
      });
      expect(res.statusCode).toBe(201);
      ids.b2 = res.json().admin.id;
      const notice = mailsTo('bernd@beta.de').find((m) => m.subject.startsWith('Hinweis'));
      expect(notice?.text).toContain('Anna Alpha (anna@alpha.de, Alpha GmbH)');
      expect(notice?.text).toContain('Bea Beta (bea@beta.de)');
    });
    it('Liste „Von mir angelegte Admins“ enthält nur selbst angelegte Konten anderer Firmen', async () => {
      const list = (await req('GET', '/api/admin/created-admins', cookies.a)).json();
      expect(list.map((x: { email: string }) => x.email).sort()).toEqual(['bea@beta.de', 'bernd@beta.de']);
      expect((await req('GET', '/api/admin/created-admins', cookies.a2)).json()).toEqual([]);
    });
    it('TC-TEN-019/TC-TEN-011/TC-ADM-038 anderer Admin hat keinen Zugriff; fremde Nutzer nicht erreichbar, nicht löschbar (404)', async () => {
      expect(
        (await req('PATCH', `/api/admin/created-admins/${ids.b1}`, cookies.a2, { role: 'reader' }))
          .statusCode,
      ).toBe(404);
      expect(
        (await req('PATCH', `/api/admin/users/${ids.b1}`, cookies.a, { role: 'reader' })).statusCode,
      ).toBe(404);
      expect((await req('DELETE', `/api/admin/users/${ids.b1}`, cookies.a)).statusCode).toBe(404);
    });
    it('TC-TEN-015/020/021 letzten aktiven Admin von Beta herabstufen oder deaktivieren → 409 (M4a); nur Rolle/Status änderbar', async () => {
      expect(
        (await req('PATCH', `/api/admin/created-admins/${ids.b1}`, cookies.a, { role: 'reader' })).json()
          .error,
      ).toBe('last_admin');
      expect(
        (await req('PATCH', `/api/admin/created-admins/${ids.b1}`, cookies.a, { active: false })).json()
          .error,
      ).toBe('last_admin');
      expect(
        (await req('PATCH', `/api/admin/created-admins/${ids.b2}`, cookies.a, { role: 'admin' })).statusCode,
      ).toBe(400);
    });
    it('Rolle umstellen und deaktivieren → Beta-Admins werden informiert', async () => {
      const before = mailsTo('bernd@beta.de').length;
      const r1 = await req('PATCH', `/api/admin/created-admins/${ids.b2}`, cookies.a, { role: 'assessor' });
      expect(r1.json()).toMatchObject({ role: 'assessor' });
      const r2 = await req('PATCH', `/api/admin/created-admins/${ids.b2}`, cookies.a, { active: false });
      expect(r2.json()).toMatchObject({ status: 'inactive' });
      const notes = mailsTo('bernd@beta.de').slice(before);
      expect(notes).toHaveLength(2);
      expect(notes[0]!.text).toContain('admin → assessor');
      expect(notes[1]!.subject).toContain('deaktiviert');
      await req('PATCH', `/api/admin/created-admins/${ids.b2}`, cookies.a, { active: true });
    });
    it('TC-ADM-027/039 Löschen eines Admins nur in der eigenen Firma; übrige Admins werden informiert (S-13)', async () => {
      const a3 = await req('POST', '/api/admin/users', cookies.a, {
        name: 'Ali Alpha',
        email: 'ali@alpha.de',
        role: 'admin',
      });
      const before = mailsTo('arno@alpha.de').length;
      expect((await req('DELETE', `/api/admin/users/${a3.json().id}`, cookies.a)).statusCode).toBe(204);
      const note = mailsTo('arno@alpha.de').slice(before);
      expect(note).toHaveLength(1);
      expect(note[0]!.subject).toContain('gelöscht');
      expect(mailsTo('anna@alpha.de').some((m) => m.subject.includes('gelöscht'))).toBe(false);
    });
  });

  describe('Passwort-Reset für Nutzer anderer Firmen (S-10, S-14, S-15)', () => {
    it('eigene Firma → 400 (dafür gibt es die Nutzerliste)', async () => {
      expect(
        (await req('POST', '/api/admin/cross-password-reset', cookies.a, { email: 'paula@alpha.de' })).json()
          .error,
      ).toBe('own_company');
    });
    it('bekannte Adresse: 202, altes Passwort ungültig, neuer Link, Admins der Firma informiert', async () => {
      const res = await req('POST', '/api/admin/cross-password-reset', cookies.a, { email: 'BERND@beta.de' });
      expect(res.statusCode).toBe(202);
      expect(
        (await req('POST', '/api/auth/login', '', { email: 'bernd@beta.de', password: USER_PW })).statusCode,
      ).toBe(401);
      expect((await req('GET', '/api/auth/me', cookies.b1)).statusCode).toBe(401);
      // Bernd ist der einzige aktive Admin von Beta: er erhält den neuen Link (keine zusätzliche Hinweis-Mail).
      expect(mailsTo('bernd@beta.de').at(-1)!.text).toContain(
        'Ein Administrator hat Ihr Passwort zurückgesetzt',
      );
      cookies.b1 = await activate('bernd@beta.de');
    });
    it('unbekannte Adresse: gleiche Antwort 202, keine Mail', async () => {
      const before = mailer.outbox!.length;
      const res = await req('POST', '/api/admin/cross-password-reset', cookies.a, {
        email: 'niemand@gamma.de',
      });
      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ status: 'accepted' });
      expect(mailer.outbox!.length).toBe(before);
    });
    it('TC-ADM-025/034 Limit 3 je Admin und Tag: Reset eines angelegten Admins zählt mit, vierter → 429; anderer Admin unabhängig', async () => {
      expect((await req('GET', '/api/admin/cross-password-reset', cookies.a)).json()).toMatchObject({
        used: 2,
        remaining: 1,
      });
      expect(
        (await req('POST', `/api/admin/created-admins/${ids.b2}/password-reset`, cookies.a)).statusCode,
      ).toBe(202);
      const notice = mailsTo('bernd@beta.de').at(-1)!;
      expect(notice.subject).toContain('Passwort');
      expect(notice.text).toContain('Bea Beta (bea@beta.de)');
      const over = await req('POST', '/api/admin/cross-password-reset', cookies.a, {
        email: 'bernd@beta.de',
      });
      expect(over.statusCode).toBe(429);
      expect(over.json().error).toBe('reset_limit');
      expect(
        (await req('POST', `/api/admin/created-admins/${ids.b2}/password-reset`, cookies.a)).statusCode,
      ).toBe(429);
      expect((await req('GET', '/api/admin/cross-password-reset', cookies.a)).json()).toMatchObject({
        remaining: 0,
      });
      expect((await req('GET', '/api/admin/cross-password-reset', cookies.a2)).json()).toMatchObject({
        remaining: 3,
      });
    });
  });

  describe('Domains der eigenen Firma (M2, M6)', () => {
    it('hinzufügen; Freemail, ungültig, fremd → abgewiesen', async () => {
      const ok = await req('POST', '/api/admin/company/domains', cookies.a, { domain: 'Alpha-Gruppe.de' });
      expect(ok.statusCode).toBe(201);
      expect(ok.json().domains).toEqual(['alpha-gruppe.de', 'alpha.de']);
      expect(
        (await req('POST', '/api/admin/company/domains', cookies.a, { domain: 'web.de' })).json().error,
      ).toBe('domain_blocked');
      expect(
        (await req('POST', '/api/admin/company/domains', cookies.a, { domain: 'kein domain' })).json().error,
      ).toBe('domain_invalid');
      expect(
        (await req('POST', '/api/admin/company/domains', cookies.a, { domain: 'beta.de' })).statusCode,
      ).toBe(409);
    });
    it('Domain mit Nutzern → 409; ungenutzte entfernen; letzte Domain → 409', async () => {
      expect((await req('DELETE', '/api/admin/company/domains/alpha.de', cookies.a)).json().error).toBe(
        'domain_in_use',
      );
      expect(
        (await req('DELETE', '/api/admin/company/domains/alpha-gruppe.de', cookies.a)).json().domains,
      ).toEqual(['alpha.de']);
      expect((await req('DELETE', '/api/admin/company/domains/alpha.de', cookies.a)).json().error).toBe(
        'last_domain',
      );
      expect((await req('DELETE', '/api/admin/company/domains/beta.de', cookies.a)).statusCode).toBe(404);
    });
  });

  describe('E-Mail-Konfiguration je Firma (S-04, N-05)', () => {
    it('Standard ist der Mailversand der Installation', async () => {
      expect((await req('GET', '/api/admin/mail-config', cookies.a)).json()).toMatchObject({
        transport: 'system',
        hasPassword: false,
      });
    });
    it('SMTP ohne Host/Port → 400; ungültiger Port/Absender → 400', async () => {
      const r = await req('PUT', '/api/admin/mail-config', cookies.a, { transport: 'smtp' });
      expect(r.json().fields).toEqual(expect.arrayContaining(['host', 'port']));
      expect(
        (
          await req('PUT', '/api/admin/mail-config', cookies.a, {
            transport: 'smtp',
            host: 'mail.alpha.de',
            port: 70000,
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await req('PUT', '/api/admin/mail-config', cookies.a, {
            transport: 'smtp',
            host: 'mail.alpha.de',
            port: 587,
            fromAddress: 'kein-absender',
          })
        ).json().fields,
      ).toEqual(['fromAddress']);
    });
    it('SMTP speichern: Passwort verschlüsselt, nie im Klartext ausgeliefert; Test-Mail und Einladungen über Firmen-SMTP', async () => {
      const r = await req('PUT', '/api/admin/mail-config', cookies.a, {
        transport: 'smtp',
        host: 'mail.alpha.de',
        port: 587,
        secure: false,
        username: 'versand',
        password: 'Geheim-SMTP-42',
        fromAddress: 'Alpha QS <qs@alpha.de>',
      });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ transport: 'smtp', hasPassword: true });
      expect(JSON.stringify(r.json())).not.toContain('Geheim');
      const [row] = await handle.db.select().from(companyMailConfig);
      expect(row!.passwordEnc).toMatch(/^v1\./);
      expect(row!.passwordEnc).not.toContain('Geheim');
      // Passwort bleibt erhalten, wenn das Feld fehlt.
      await req('PUT', '/api/admin/mail-config', cookies.a, {
        transport: 'smtp',
        host: 'mail.alpha.de',
        port: 2525,
      });
      expect((await req('GET', '/api/admin/mail-config', cookies.a)).json()).toMatchObject({
        port: 2525,
        hasPassword: true,
      });
      const test = await req('POST', '/api/admin/mail-config/test', cookies.a);
      expect(test.json()).toMatchObject({ status: 'sent', to: 'anna@alpha.de' });
      expect(mailsTo('anna@alpha.de').at(-1)!.via).toBe('smtp:mail.alpha.de:2525');
      await req('POST', '/api/admin/users', cookies.a, {
        name: 'Sven Smtp',
        email: 'sven@alpha.de',
        role: 'reader',
      });
      expect(mailsTo('sven@alpha.de')[0]!.via).toBe('smtp:mail.alpha.de:2525');
      // Beta nutzt weiterhin den Standard.
      await req('POST', '/api/admin/users', cookies.b1, {
        name: 'Bob Beta',
        email: 'bob@beta.de',
        role: 'reader',
      });
      expect(mailsTo('bob@beta.de')[0]!.via).toBe('system');
    });
    it('zurück auf Standard', async () => {
      await req('PUT', '/api/admin/mail-config', cookies.a, { transport: 'system', password: null });
      expect((await req('GET', '/api/admin/mail-config', cookies.a)).json()).toMatchObject({
        transport: 'system',
        hasPassword: false,
      });
    });
  });

  describe('KI-Module je Firma (S-04, S-09)', () => {
    it('erstes Modul (regelbasiert) wird Standard; Verbindungstest ok', async () => {
      const r = await req('POST', '/api/admin/ai-modules', cookies.a, {
        name: 'Regeln',
        mode: 'rules',
        provider: 'rules',
      });
      expect(r.statusCode).toBe(201);
      expect(r.json()).toMatchObject({ isDefault: true, baseUrl: null, hasApiKey: false });
      ids.rules = r.json().id;
      expect((await req('POST', `/api/admin/ai-modules/${ids.rules}/test`, cookies.a)).json()).toMatchObject({
        ok: true,
      });
    });
    it('Validierungen: Basis-URL Pflicht, nur http(s), Temperatur 0–1, Timeout 5–300 s, Name eindeutig', async () => {
      const base = { name: 'Cloud', mode: 'cloud', provider: 'openai' };
      expect((await req('POST', '/api/admin/ai-modules', cookies.a, base)).json().fields).toEqual([
        'baseUrl',
      ]);
      expect(
        (await req('POST', '/api/admin/ai-modules', cookies.a, { ...base, baseUrl: 'ftp://x.de' })).json()
          .fields,
      ).toEqual(['baseUrl']);
      expect(
        (
          await req('POST', '/api/admin/ai-modules', cookies.a, {
            ...base,
            baseUrl: 'https://x.de',
            temperature: 2,
          })
        ).json().fields,
      ).toEqual(['temperature']);
      expect(
        (
          await req('POST', '/api/admin/ai-modules', cookies.a, {
            ...base,
            baseUrl: 'https://x.de',
            timeoutSec: 3,
          })
        ).json().fields,
      ).toEqual(['timeoutSec']);
      expect(
        (
          await req('POST', '/api/admin/ai-modules', cookies.a, {
            name: 'regeln',
            mode: 'rules',
            provider: 'rules',
          })
        ).json().error,
      ).toBe('name_taken');
    });
    it('Cloud-Modul: API-Schlüssel verschlüsselt und nur maskiert; Verbindungstest mit falschem/richtigem Schlüssel', async () => {
      const r = await req('POST', '/api/admin/ai-modules', cookies.a, {
        name: 'OpenAI-kompatibel',
        mode: 'cloud',
        provider: 'openai_compatible',
        baseUrl: `${fakeUrl}/v1`,
        model: 'gpt-test',
        apiKey: 'sk-falsch-9999',
      });
      expect(r.statusCode).toBe(201);
      ids.cloud = r.json().id;
      expect(r.json()).toMatchObject({ hasApiKey: true, apiKeyMasked: '••••9999', isDefault: false });
      expect(JSON.stringify(r.json())).not.toContain('sk-falsch');
      const [row] = await handle.db.select().from(aiModules).where(eq(aiModules.id, ids.cloud!));
      expect(row!.apiKeyEnc).not.toContain('sk-falsch');
      expect((await req('POST', `/api/admin/ai-modules/${ids.cloud}/test`, cookies.a)).json()).toMatchObject({
        ok: false,
        error: 'auth_failed',
        status: 401,
      });
      await req('PATCH', `/api/admin/ai-modules/${ids.cloud}`, cookies.a, { apiKey: 'sk-richtig-1234' });
      expect((await req('POST', `/api/admin/ai-modules/${ids.cloud}/test`, cookies.a)).json()).toMatchObject({
        ok: true,
      });
    });
    it('lokales Modul (Ollama) erreichbar bzw. nicht erreichbar', async () => {
      const ok = await req('POST', '/api/admin/ai-modules', cookies.a, {
        name: 'Ollama',
        mode: 'local',
        provider: 'ollama',
        baseUrl: fakeUrl,
        model: 'llama3',
      });
      expect(
        (await req('POST', `/api/admin/ai-modules/${ok.json().id}/test`, cookies.a)).json(),
      ).toMatchObject({ ok: true });
      await req('PATCH', `/api/admin/ai-modules/${ok.json().id}`, cookies.a, {
        baseUrl: 'http://127.0.0.1:9',
      });
      expect(
        (await req('POST', `/api/admin/ai-modules/${ok.json().id}/test`, cookies.a)).json(),
      ).toMatchObject({
        ok: false,
        error: 'unreachable',
      });
    });
    it('Standardmodul wechseln; Standard kann nicht abgewählt werden; Löschen des Standards macht das nächste zum Standard', async () => {
      await req('PATCH', `/api/admin/ai-modules/${ids.cloud}`, cookies.a, { isDefault: true });
      const list = (await req('GET', '/api/admin/ai-modules', cookies.a)).json() as Array<{
        id: string;
        isDefault: boolean;
      }>;
      expect(list.filter((m) => m.isDefault).map((m) => m.id)).toEqual([ids.cloud]);
      expect(
        (await req('PATCH', `/api/admin/ai-modules/${ids.cloud}`, cookies.a, { isDefault: false })).json()
          .error,
      ).toBe('default_required');
      expect((await req('DELETE', `/api/admin/ai-modules/${ids.cloud}`, cookies.a)).statusCode).toBe(204);
      const after = (await req('GET', '/api/admin/ai-modules', cookies.a)).json() as Array<{
        name: string;
        isDefault: boolean;
      }>;
      expect(after.find((m) => m.isDefault)?.name).toBe('Ollama');
    });
    it('TC-TEN-026 Module anderer Firmen sind nicht sichtbar (404)', async () => {
      expect((await req('GET', '/api/admin/ai-modules', cookies.b1)).json()).toEqual([]);
      expect((await req('POST', `/api/admin/ai-modules/${ids.rules}/test`, cookies.b1)).statusCode).toBe(404);
    });
  });

  describe('Audit-Log und Rechte', () => {
    it('Audit-Log der eigenen Firma: Filter nach Aktion; Aktionen fremder Admins sind gekennzeichnet', async () => {
      const own = (await req('GET', '/api/admin/audit?action=department&limit=100', cookies.a)).json();
      expect(own.total).toBeGreaterThanOrEqual(4);
      expect(own.items.every((i: { action: string }) => i.action.includes('department'))).toBe(true);
      const beta = (await req('GET', '/api/admin/audit?action=cross&limit=100', cookies.b1)).json();
      const reset = beta.items.find((i: { action: string }) => i.action === 'admin.cross_password_reset');
      expect(reset).toMatchObject({
        actorEmail: 'anna@alpha.de',
        actorCompany: 'Alpha GmbH',
        external: true,
      });
      // Beta sieht keine reinen Alpha-Einträge.
      const all = (await req('GET', '/api/admin/audit?limit=200', cookies.b1)).json();
      expect(all.items.some((i: { action: string }) => i.action.startsWith('admin.department'))).toBe(false);
    });
    it('Zeitraumfilter und ungültige Parameter', async () => {
      expect(
        (await req('GET', '/api/admin/audit?from=2000-01-01&to=2000-01-02', cookies.a)).json().total,
      ).toBe(0);
      expect((await req('GET', '/api/admin/audit?from=gestern', cookies.a)).statusCode).toBe(400);
    });
    it('CSV-Export mit BOM, Kopfzeile und Schutz vor Formel-Injektion', async () => {
      await req('POST', '/api/admin/departments', cookies.a, { name: '=HYPERLINK("x")' });
      const res = await req('GET', '/api/admin/audit.csv?action=department_created', cookies.a);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.body.charCodeAt(0)).toBe(0xfeff);
      expect(res.body).toContain('"Zeitpunkt";"Aktion"');
      expect(res.body).not.toMatch(/;"=HYPERLINK/);
    });
    it('Nicht-Admins erhalten 403 auf allen neuen Admin-Endpunkten', async () => {
      const paula = await activate('paula@alpha.de');
      for (const [m, u] of [
        ['GET', '/api/admin/companies'],
        ['GET', '/api/admin/created-admins'],
        ['POST', '/api/admin/cross-password-reset'],
        ['GET', '/api/admin/departments'],
        ['GET', '/api/admin/mail-config'],
        ['GET', '/api/admin/ai-modules'],
        ['GET', '/api/admin/audit'],
      ] as const)
        expect((await req(m, u, paula, m === 'POST' ? { email: 'x@beta.de' } : undefined)).statusCode).toBe(
          403,
        );
    });
  });
});
