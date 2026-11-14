/**
 * Integrationstests Phase 5 (Erfassung) gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Assessments, Team, Zuweisung, Abteilungsantworten mit Versionsprüfung, Abgabe, Kommentare, Quellen,
 * Zusammenführung, Änderungshistorie (append-only) und Rechte je Rolle.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { blockedDomains, industries } from '../src/db/schema';
import { createMailer, type Mailer } from '../src/mail/mailer';

const url = process.env.TEST_DATABASE_URL;
const H = { 'x-requested-with': 'ai-tpi' };
const PW = 'Tisch7&Laterne';
const USER_PW = 'Kaffee7Mond!';
const KP = 'KB01.K.01';

describe.skipIf(!url)('Phase 5: Erfassung (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let mailer: Mailer;
  const c: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const cookieOf = (res: LightMyRequestResponse) => {
    const k = res.cookies.find((x) => x.name === 'ai_tpi_session');
    return k ? `ai_tpi_session=${k.value}` : '';
  };
  const req = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    u: string,
    cookie = '',
    payload?: object,
  ) => app.inject({ method, url: u, payload, headers: { ...H, cookie }, remoteAddress: '127.0.0.1' });
  const tokenFor = (to: string) => {
    const m = [...mailer.outbox!].reverse().find((x) => x.to === to && x.text.includes('token='));
    return new URL(m!.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token')!;
  };
  async function user(cookie: string, name: string, email: string, role: string, departmentId?: string) {
    const r = await req('POST', '/api/admin/users', cookie, { name, email, role, departmentId });
    expect(r.statusCode).toBe(201);
    await req('POST', '/api/auth/password-reset', '', { email });
    await req('POST', '/api/auth/password', '', {
      token: tokenFor(email),
      password: USER_PW,
      passwordRepeat: USER_PW,
    });
    const login = await req('POST', '/api/auth/login', '', { email, password: USER_PW });
    expect(login.statusCode).toBe(200);
    return { id: r.json().id as string, cookie: cookieOf(login) };
  }
  const A = () => `/api/assessments/${ids.asm}`;

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

    const setup = await req('POST', '/api/setup', '', {
      companyName: 'Alpha GmbH',
      companySlug: 'alpha',
      industryCode: 'RES',
      name: 'Anna Admin',
      email: 'anna@alpha.de',
      password: PW,
      passwordRepeat: PW,
    });
    c.admin = cookieOf(setup);
    for (const name of ['Entwicklung', 'Fachbereich', 'Betrieb']) {
      const d = await req('POST', '/api/admin/departments', c.admin, { name });
      ids[name] = d.json().id;
    }
    const as = await user(c.admin, 'Arne Assessor', 'arne@alpha.de', 'assessor');
    c.assessor = as.cookie;
    ids.assessor = as.id;
    const e = await user(c.admin, 'Eva Entwicklung', 'eva@alpha.de', 'respondent', ids.Entwicklung);
    const e2 = await user(c.admin, 'Emil Entwicklung', 'emil@alpha.de', 'respondent', ids.Entwicklung);
    const f = await user(c.admin, 'Fritz Fach', 'fritz@alpha.de', 'respondent', ids.Fachbereich);
    const b = await user(c.admin, 'Berta Betrieb', 'berta@alpha.de', 'respondent', ids.Betrieb);
    const l = await user(c.admin, 'Lena Leser', 'lena@alpha.de', 'reader');
    Object.assign(c, { eva: e.cookie, emil: e2.cookie, fritz: f.cookie, berta: b.cookie, lena: l.cookie });
    Object.assign(ids, { eva: e.id, emil: e2.id, fritz: f.id, berta: b.id, lena: l.id });

    // Zweite Firma für Mandantentests.
    const other = await req('POST', '/api/admin/companies', c.admin, {
      company: { name: 'Beta AG', slug: 'beta', domains: ['beta.de'], industryCode: 'RES' },
      admin: { name: 'Bodo Beta', email: 'bodo@beta.de' },
    });
    expect(other.statusCode).toBe(201);
    await req('POST', '/api/auth/password-reset', '', { email: 'bodo@beta.de' });
    await req('POST', '/api/auth/password', '', {
      token: tokenFor('bodo@beta.de'),
      password: USER_PW,
      passwordRepeat: USER_PW,
    });
    c.beta = cookieOf(await req('POST', '/api/auth/login', '', { email: 'bodo@beta.de', password: USER_PW }));
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  describe('Assessment anlegen (US-1.1, TC-ASM-001…004)', () => {
    const master = { project: 'Testprozess 2026', assessorName: 'Arne Assessor', startDate: '2026-11-01' };
    it('nur Assessoren legen an; Pflichtfelder und Datumsregel', async () => {
      expect((await req('POST', '/api/assessments', c.eva, master)).statusCode).toBe(403);
      expect((await req('POST', '/api/assessments', c.admin, master)).statusCode).toBe(403);
      const noName = await req('POST', '/api/assessments', c.assessor, { ...master, project: '' });
      expect(noName.json()).toMatchObject({ error: 'invalid_input', fields: ['project'] });
      const badDate = await req('POST', '/api/assessments', c.assessor, { ...master, endDate: '2026-10-01' });
      expect(badDate.json().fields).toEqual(['endDate']);
      const badCount = await req('POST', '/api/assessments', c.assessor, { ...master, interviewCount: -2 });
      expect(badCount.json().fields).toEqual(['interviewCount']);
      const ok = await req('POST', '/api/assessments', c.assessor, { ...master, interviewCount: 4 });
      expect(ok.statusCode).toBe(201);
      expect(ok.json()).toMatchObject({ status: 'collecting', catalogVersion: expect.any(String) });
      ids.asm = ok.json().id;
    });
    it('Liste: Assessor (Mitglied) und Admin sehen es, Befragte ohne Mitgliedschaft nicht', async () => {
      expect((await req('GET', '/api/assessments', c.assessor)).json()).toHaveLength(1);
      expect((await req('GET', '/api/assessments', c.admin)).json()).toHaveLength(1);
      expect((await req('GET', '/api/assessments', c.eva)).json()).toHaveLength(0);
      expect((await req('GET', A(), c.eva)).statusCode).toBe(403);
      expect((await req('GET', A(), c.beta)).statusCode).toBe(404);
      expect((await req('GET', '/api/assessments/keine-uuid', c.assessor)).statusCode).toBe(404);
    });
    it('Admin hat nur Lesezugriff (S-11)', async () => {
      const r = await req('GET', A(), c.admin);
      expect(r.statusCode).toBe(200);
      expect(r.json().me).toMatchObject({ canManage: false, canAnswer: false, canConsolidate: false });
      expect((await req('PATCH', A(), c.admin, { ...master, project: 'X' })).statusCode).toBe(403);
    });
  });

  describe('Team und Zuweisung (US-1.2, TC-ASM-009)', () => {
    it('Mitglieder aufnehmen; Admins und fremde Nutzer nicht', async () => {
      const cand = (await req('GET', `${A()}/candidates`, c.assessor)).json() as {
        id: string;
        role: string;
      }[];
      expect(cand.map((x) => x.role)).not.toContain('admin');
      for (const u of ['eva', 'emil', 'fritz', 'lena'])
        expect((await req('POST', `${A()}/members`, c.assessor, { userId: ids[u] })).statusCode).toBe(201);
      const adminId = (await req('GET', '/api/auth/me', c.admin)).json().id;
      expect((await req('POST', `${A()}/members`, c.assessor, { userId: adminId })).statusCode).toBe(404);
      expect((await req('POST', `${A()}/members`, c.eva, { userId: ids.berta })).statusCode).toBe(403);
    });
    it('Kernbereich mehreren Abteilungen zuweisen; fremde Abteilung → 400; unbekannter KB → 404', async () => {
      const r = await req('PUT', `${A()}/assignments/KB01`, c.assessor, {
        departmentIds: [ids.Entwicklung, ids.Fachbereich],
      });
      expect(r.json().departmentIds).toHaveLength(2);
      expect(
        (
          await req('PUT', `${A()}/assignments/KB01`, c.assessor, {
            departmentIds: ['00000000-0000-4000-8000-000000000000'],
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (await req('PUT', `${A()}/assignments/KB99`, c.assessor, { departmentIds: [] })).statusCode,
      ).toBe(404);
      const detail = (await req('GET', A(), c.eva)).json();
      expect(detail.assignments).toHaveLength(2);
      expect(detail.me).toMatchObject({ canAnswer: true, departmentName: 'Entwicklung' });
    });
  });

  describe('Abteilungsantworten (US-9.1, TC-ANS, TC-MU, TC-CONS-001/008)', () => {
    it('Antwort speichern, Version steigt; veraltete Version → 409 mit aktuellem Stand', async () => {
      const first = await req('PUT', `${A()}/answers/${KP}`, c.eva, { value: 'yes', version: 0 });
      expect(first.json()).toEqual({ value: 'yes', version: 1 });
      // Emil (gleiche Abteilung) kennt noch Version 0 → Konflikt (TC-MU-002).
      const stale = await req('PUT', `${A()}/answers/${KP}`, c.emil, { value: 'no', version: 0 });
      expect(stale.statusCode).toBe(409);
      expect(stale.json()).toMatchObject({
        error: 'version_conflict',
        current: { value: 'yes', version: 1 },
      });
      const second = await req('PUT', `${A()}/answers/${KP}`, c.emil, { value: 'partial', version: 1 });
      expect(second.json()).toEqual({ value: 'partial', version: 2 });
    });
    it('Abteilungen überschreiben sich nicht; Befragte sehen nur die eigene Abteilung', async () => {
      await req('PUT', `${A()}/answers/${KP}`, c.fritz, { value: 'no', version: 0 });
      const eva = (await req('GET', `${A()}/answers`, c.eva)).json() as { value: string }[];
      expect(eva.map((a) => a.value)).toEqual(['partial']);
      const all = (await req('GET', `${A()}/answers`, c.assessor)).json() as { value: string }[];
      expect(all.map((a) => a.value).sort()).toEqual(['no', 'partial']);
    });
    it('Antwort zurücknehmen (offen) entfernt sie', async () => {
      const r = await req('PUT', `${A()}/answers/KB01.K.02`, c.eva, { value: 'na', version: 0 });
      const back = await req('PUT', `${A()}/answers/KB01.K.02`, c.eva, {
        value: 'open',
        version: r.json().version,
      });
      expect(back.json()).toEqual({ value: 'open', version: 0 });
    });
    it('nicht zugewiesener KB, fremde Rolle, unbekannter KP → 403/404 (TC-MU-004)', async () => {
      expect(
        (await req('PUT', `${A()}/answers/KB02.K.01`, c.eva, { value: 'yes', version: 0 })).statusCode,
      ).toBe(403);
      expect(
        (await req('PUT', `${A()}/answers/${KP}`, c.lena, { value: 'yes', version: 0 })).statusCode,
      ).toBe(403);
      expect(
        (await req('PUT', `${A()}/answers/${KP}`, c.assessor, { value: 'yes', version: 0 })).statusCode,
      ).toBe(403);
      expect(
        (await req('PUT', `${A()}/answers/KB01.X.99`, c.eva, { value: 'yes', version: 0 })).statusCode,
      ).toBe(404);
      expect(
        (await req('PUT', `${A()}/answers/${KP}`, c.eva, { value: 'vielleicht', version: 2 })).statusCode,
      ).toBe(400);
    });
    it('Assessor mit Abteilung antwortet für seine Abteilung', async () => {
      await req('PATCH', `/api/admin/users/${ids.assessor}`, c.admin, { departmentId: ids.Betrieb });
      await req('PUT', `${A()}/assignments/KB05`, c.assessor, { departmentIds: [ids.Betrieb] });
      expect((await req('GET', A(), c.assessor)).json().me.canAnswer).toBe(true);
      const r = await req('PUT', `${A()}/answers/KB05.K.01`, c.assessor, { value: 'yes', version: 0 });
      expect(r.json()).toEqual({ value: 'yes', version: 1 });
      expect(
        (await req('PUT', `${A()}/answers/${KP}`, c.assessor, { value: 'yes', version: 0 })).statusCode,
      ).toBe(403);
    });
    it('Abgabe sperrt die Abteilung; Assessor öffnet wieder', async () => {
      expect((await req('POST', `${A()}/submission`, c.fritz)).statusCode).toBe(201);
      const locked = await req('PUT', `${A()}/answers/KB01.K.03`, c.fritz, { value: 'yes', version: 0 });
      expect(locked.json().error).toBe('submitted');
      expect((await req('DELETE', `${A()}/submissions/${ids.Fachbereich}`, c.eva)).statusCode).toBe(403);
      expect((await req('DELETE', `${A()}/submissions/${ids.Fachbereich}`, c.assessor)).statusCode).toBe(204);
      expect(
        (await req('PUT', `${A()}/answers/KB01.K.03`, c.fritz, { value: 'yes', version: 0 })).statusCode,
      ).toBe(200);
    });
  });

  describe('Quellen und Kommentare (US-3.1, US-3.2, TC-SRC, TC-COM)', () => {
    it('Quelle anlegen, Duplikat → 409, ohne Namen → 400', async () => {
      const s = await req('POST', `${A()}/sources`, c.assessor, { name: 'Lisa Lead', role: 'Testmanagerin' });
      expect(s.statusCode).toBe(201);
      ids.src = s.json().id;
      expect(
        (await req('POST', `${A()}/sources`, c.assessor, { name: 'lisa lead', role: 'testmanagerin' })).json()
          .error,
      ).toBe('duplicate');
      expect((await req('POST', `${A()}/sources`, c.assessor, { name: ' ' })).statusCode).toBe(400);
      expect((await req('POST', `${A()}/sources`, c.eva, { name: 'Neu' })).statusCode).toBe(403);
    });
    it('Kommentar mit Verfasser und Quelle; leer/zu lang abgewiesen; HTML bleibt Text', async () => {
      const r = await req('POST', `${A()}/comments`, c.eva, {
        checkpointId: KP,
        text: '<script>alert(1)</script> Risk Poker im Refinement',
        sourceId: ids.src,
      });
      expect(r.statusCode).toBe(201);
      ids.comment = r.json().id;
      expect(
        (await req('POST', `${A()}/comments`, c.eva, { checkpointId: KP, text: '   ' })).statusCode,
      ).toBe(400);
      expect(
        (await req('POST', `${A()}/comments`, c.eva, { checkpointId: KP, text: 'x'.repeat(2001) }))
          .statusCode,
      ).toBe(400);
      expect(
        (await req('POST', `${A()}/comments`, c.lena, { checkpointId: KP, text: 'Leser' })).statusCode,
      ).toBe(403);
      const list = (await req('GET', `${A()}/comments`, c.fritz)).json();
      expect(list[0]).toMatchObject({
        authorName: 'Eva Entwicklung',
        sourceName: 'Lisa Lead',
        departmentName: 'Entwicklung',
      });
      expect(list[0].text).toContain('<script>');
    });
    it('nur der Verfasser ändert; andere Befragte löschen nicht; Assessor darf löschen (TC-MU-007)', async () => {
      expect(
        (await req('PATCH', `${A()}/comments/${ids.comment}`, c.fritz, { text: 'fremd' })).statusCode,
      ).toBe(403);
      const ed = await req('PATCH', `${A()}/comments/${ids.comment}`, c.eva, { text: 'Risk Poker' });
      expect(ed.json()).toMatchObject({ text: 'Risk Poker', updatedAt: expect.any(String) });
      expect((await req('DELETE', `${A()}/comments/${ids.comment}`, c.emil)).statusCode).toBe(403);
    });
    it('verwendete Quelle nicht löschbar, deaktivierte Quelle nicht mehr wählbar (TC-SRC-004, TC-COM-009)', async () => {
      expect((await req('DELETE', `${A()}/sources/${ids.src}`, c.assessor)).json().error).toBe('in_use');
      await req('PATCH', `${A()}/sources/${ids.src}`, c.assessor, { active: false });
      const r = await req('POST', `${A()}/comments`, c.eva, {
        checkpointId: KP,
        text: 'neu',
        sourceId: ids.src,
      });
      expect(r.json().fields).toEqual(['sourceId']);
      expect((await req('DELETE', `${A()}/comments/${ids.comment}`, c.assessor)).statusCode).toBe(204);
    });
  });

  describe('Zusammenführung (US-9.2, TC-CONS-002…006)', () => {
    it('Vergleichsansicht mit Vorschlag; Befragte haben keinen Zugriff', async () => {
      expect((await req('GET', `${A()}/consolidation`, c.eva)).statusCode).toBe(403);
      const v = (await req('GET', `${A()}/consolidation`, c.assessor)).json();
      const item = v.items.find((i: { checkpointId: string }) => i.checkpointId === KP);
      expect(item).toMatchObject({ suggestion: 'no', disagree: true, consolidated: null });
      expect(item.departments.map((d: { value: string }) => d.value).sort()).toEqual(['no', 'partial']);
    });
    it('Begründung Pflicht bei Uneinigkeit; mit Begründung gespeichert; Leser darf nicht', async () => {
      const no = await req('PUT', `${A()}/consolidation/${KP}`, c.assessor, { value: 'no', version: 0 });
      expect(no.json()).toMatchObject({ error: 'rationale_required', suggestion: 'no' });
      expect(
        (await req('PUT', `${A()}/consolidation/${KP}`, c.lena, { value: 'no', version: 0, rationale: 'x' }))
          .statusCode,
      ).toBe(403);
      const ok = await req('PUT', `${A()}/consolidation/${KP}`, c.assessor, {
        value: 'partial',
        version: 0,
        rationale: 'Risikoanalyse findet statt, ist aber nicht dokumentiert.',
      });
      expect(ok.json()).toMatchObject({ value: 'partial', version: 1, suggestion: 'no' });
    });
    it('einstimmige Antwort ohne Begründung übernehmbar', async () => {
      // KB01.K.03: nur Fachbereich hat geantwortet (yes), Entwicklung offen → Vorschlag yes, nicht uneinig.
      const ok = await req('PUT', `${A()}/consolidation/KB01.K.03`, c.assessor, { value: 'yes', version: 0 });
      expect(ok.statusCode).toBe(200);
    });
  });

  describe('Status und Vorgehensmodell (TC-ASM-008)', () => {
    it('Statuswechsel nur in erlaubter Reihenfolge; Erfassung danach gesperrt', async () => {
      expect((await req('POST', `${A()}/status`, c.assessor, { status: 'released' })).json().error).toBe(
        'invalid_transition',
      );
      expect((await req('POST', `${A()}/status`, c.assessor, { status: 'consolidating' })).statusCode).toBe(
        200,
      );
      expect(
        (await req('PUT', `${A()}/answers/KB01.K.04`, c.eva, { value: 'yes', version: 0 })).json().error,
      ).toBe('not_collecting');
      await req('POST', `${A()}/status`, c.assessor, { status: 'collecting' });
    });
    it('klassisch: agile Kontrollpunkte gehören nicht zum Umfang', async () => {
      const { catalog } = await import('@ai-tpi/catalog');
      const agile = catalog.keyAreas.flatMap((a) => a.checkpoints).find((cp) => cp.tags.includes('agile'))!;
      const area = agile.id.slice(0, 4);
      await req('PUT', `${A()}/assignments/${area}`, c.assessor, { departmentIds: [ids.Entwicklung] });
      const detail = (await req('GET', A(), c.assessor)).json();
      await req('PATCH', A(), c.assessor, { ...detail, project: detail.project, methodModel: 'classic' });
      expect(
        (await req('PUT', `${A()}/answers/${agile.id}`, c.eva, { value: 'yes', version: 0 })).statusCode,
      ).toBe(404);
      const v = (await req('GET', `${A()}/consolidation`, c.assessor)).json();
      expect(v.items.some((i: { checkpointId: string }) => i.checkpointId === agile.id)).toBe(false);
    });
  });

  describe('Änderungshistorie (US-9.3, TC-HIST-001/003/004/005)', () => {
    it('Antwortänderung mit Person, Abteilung, alt → neu', async () => {
      const h = (await req('GET', `/api/history?assessmentId=${ids.asm}&checkpointId=${KP}`, c.lena)).json();
      const change = h.items.find(
        (i: { action: string; userName: string }) =>
          i.action === 'answer.changed' && i.userName === 'Emil Entwicklung',
      );
      expect(change).toMatchObject({
        oldValue: 'yes',
        newValue: 'partial',
        departmentName: 'Entwicklung',
        keyAreaId: 'KB01',
      });
      const cons = h.items.find((i: { action: string }) => i.action === 'consolidated.changed');
      expect(cons).toMatchObject({
        newValue: 'partial',
        rationale: expect.stringContaining('Risikoanalyse'),
      });
    });
    it('Filter nach Person; CSV-Export; fremde Firma sieht nichts', async () => {
      const byEva = (await req('GET', `/api/history?userId=${ids.eva}`, c.assessor)).json();
      expect(byEva.total).toBeGreaterThan(0);
      expect(byEva.items.every((i: { userName: string }) => i.userName === 'Eva Entwicklung')).toBe(true);
      const csv = await req('GET', `/api/history.csv?assessmentId=${ids.asm}`, c.assessor);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.body).toContain('answer.changed');
      expect((await req('GET', '/api/history', c.beta)).json().total).toBe(0);
      expect((await req('GET', `/api/history?assessmentId=${ids.asm}`, c.beta)).json().total).toBe(0);
      const facets = (await req('GET', '/api/history/facets', c.assessor)).json();
      expect(facets.users.map((u: { name: string }) => u.name)).toContain('Eva Entwicklung');
    });
    it('Nichtmitglied sieht die Historie des Assessments nicht', async () => {
      expect((await req('GET', `/api/history?assessmentId=${ids.asm}`, c.berta)).json().total).toBe(0);
    });
    it('keine Änderung oder Löschung möglich – weder per API noch in der Datenbank', async () => {
      expect((await req('DELETE', '/api/history', c.admin)).statusCode).toBe(404);
      expect((await req('PATCH', '/api/history', c.admin, {})).statusCode).toBe(404);
      await expect(handle.db.execute(sql`delete from change_history`)).rejects.toThrow();
      await expect(handle.db.execute(sql`update change_history set action = 'x'`)).rejects.toThrow();
    });
  });

  describe('Löschen', () => {
    it('Assessor löscht; Historie bleibt erhalten', async () => {
      expect((await req('DELETE', A(), c.eva)).statusCode).toBe(403);
      expect((await req('DELETE', A(), c.assessor)).statusCode).toBe(204);
      expect((await req('GET', A(), c.assessor)).statusCode).toBe(404);
      const h = (await req('GET', `/api/history?assessmentId=${ids.asm}`, c.admin)).json();
      expect(h.items[0].action).toBe('assessment.deleted');
    });
  });
});
