/**
 * Integrationstests Phase 6 (Auswertung) gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Bericht mit Kennzahlen, Konsenslücken und Kommentaren; Benchmark mit Schnappschuss bei Freigabe,
 * Mindestanzahl, Anonymität und Opt-out (TC-REP-*, TC-BM-*, TC-CONS-007, TC-COM-008).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { assessmentScores, blockedDomains, companies, industries } from '../src/db/schema';
import { createMailer, type Mailer } from '../src/mail/mailer';

const url = process.env.TEST_DATABASE_URL;
const H = { 'x-requested-with': 'ai-tpi' };
const PW = 'Tisch7&Laterne';
const USER_PW = 'Kaffee7Mond!';

describe.skipIf(!url)('Phase 6: Bericht und Benchmark (DB)', () => {
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
  async function user(name: string, email: string, role: string, departmentId?: string) {
    const r = await req('POST', '/api/admin/users', c.admin, { name, email, role, departmentId });
    await req('POST', '/api/auth/password-reset', '', { email });
    await req('POST', '/api/auth/password', '', {
      token: tokenFor(email),
      password: USER_PW,
      passwordRepeat: USER_PW,
    });
    const login = await req('POST', '/api/auth/login', '', { email, password: USER_PW });
    return { id: r.json().id as string, cookie: cookieOf(login) };
  }
  const A = () => `/api/assessments/${ids.asm}`;
  const consolidate = (cp: string, value: string, rationale = 'Begründung') =>
    req('PUT', `${A()}/consolidation/${cp}`, c.assessor, { value, version: 0, rationale });

  /** Fremde Firmen derselben Branche mit freigegebenem Ergebnis (alle KB = value). */
  let peerNo = 0;
  async function peers(industryCode: string, values: number[], optIn = true) {
    const [ind] = await handle.db.select().from(industries).where(eq(industries.code, industryCode));
    for (const [i, v] of values.entries()) {
      const [co] = await handle.db
        .insert(companies)
        .values({
          name: `Geheim ${industryCode} ${i}`,
          slug: `p-${industryCode.toLowerCase()}-${peerNo++}`,
          industryId: ind!.id,
          benchmarkOptIn: optIn,
        })
        .returning();
      const [as] = await handle.db
        .execute<{ id: string }>(
          sql`insert into assessment (company_id, project, assessor_name, start_date, catalog_version, status, released_at)
            values (${co!.id}, 'P', 'X', '2026-01-01', '1.0.0-draft', 'released', now()) returning id`,
        )
        .then((r) => r.rows);
      await handle.db.insert(assessmentScores).values({
        assessmentId: as!.id,
        companyId: co!.id,
        catalogVersion: '1.0.0-draft',
        releasedAt: new Date(),
        overallIndex: v,
        aiIndex: v,
        areas: [{ keyAreaId: 'KB01', fulfillment: v, level: 'controlled' }],
      });
    }
  }

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
    for (const name of ['Entwicklung', 'Fachbereich'])
      ids[name] = (await req('POST', '/api/admin/departments', c.admin, { name })).json().id;
    const as = await user('Arne Assessor', 'arne@alpha.de', 'assessor');
    const eva = await user('Eva Entwicklung', 'eva@alpha.de', 'respondent', ids.Entwicklung);
    const fritz = await user('Fritz Fach', 'fritz@alpha.de', 'respondent', ids.Fachbereich);
    const lena = await user('Lena Leser', 'lena@alpha.de', 'reader');
    Object.assign(c, { assessor: as.cookie, eva: eva.cookie, fritz: fritz.cookie, lena: lena.cookie });
    const created = await req('POST', '/api/assessments', c.assessor, {
      project: 'Bericht 2026',
      assessorName: 'Arne Assessor',
      startDate: '2026-11-01',
    });
    ids.asm = created.json().id;
    for (const u of [eva, fritz, lena]) await req('POST', `${A()}/members`, c.assessor, { userId: u.id });
    await req('PUT', `${A()}/assignments/KB01`, c.assessor, {
      departmentIds: [ids.Entwicklung, ids.Fachbereich],
    });
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  describe('Bericht', () => {
    it('TC-REP-004 ohne Antworten: hasData false, keine Division durch 0', async () => {
      const r = (await req('GET', `${A()}/report`, c.lena)).json();
      expect(r.scores.hasData).toBe(false);
      expect(r.company).toMatchObject({ name: 'Alpha GmbH', industryCode: 'RES' });
      expect(r.departments).toEqual(['Entwicklung', 'Fachbereich']);
    });
    it('TC-REP-001/002 Kennzahlen und erreichte Ebene aus den konsolidierten Antworten', async () => {
      // KB01: alle Kontrolliert-KP erfüllt → Ebene Kontrolliert.
      const { catalog } = await import('@ai-tpi/catalog');
      const kb01 = catalog.keyAreas.find((k) => k.id === 'KB01')!;
      for (const cp of kb01.checkpoints.filter((x) => x.level === 'controlled'))
        await consolidate(cp.id, 'yes');
      const firstE = kb01.checkpoints.find((x) => x.level === 'efficient')!;
      await consolidate(firstE.id, 'no');
      const r = (await req('GET', `${A()}/report`, c.assessor)).json();
      const area = r.scores.areas.find((x: { keyAreaId: string }) => x.keyAreaId === 'KB01');
      const nK = kb01.checkpoints.filter((x) => x.level === 'controlled').length;
      expect(area).toMatchObject({ level: 'controlled', yes: nK, no: 1 });
      expect(area.fulfillment).toBeCloseTo(Math.round((nK / kb01.checkpoints.length) * 1000) / 10, 1);
      expect(r.scores.hasData).toBe(true);
      expect(r.answers).toHaveLength(nK + 1);
    });
    it('TC-CONS-007 Konsenslücken; TC-COM-008 Kommentare im Bericht; Befragte sehen keine Konsenslücken', async () => {
      await req('PUT', `${A()}/answers/KB01.K.01`, c.eva, { value: 'yes', version: 0 });
      await req('PUT', `${A()}/answers/KB01.K.01`, c.fritz, { value: 'no', version: 0 });
      await req('POST', `${A()}/comments`, c.eva, { checkpointId: 'KB01.K.01', text: 'PO ist bekannt' });
      const r = (await req('GET', `${A()}/report`, c.assessor)).json();
      expect(r.consensusGaps).toEqual([
        {
          keyAreaId: 'KB01',
          checkpointId: 'KB01.K.01',
          departments: [
            { department: 'Entwicklung', value: 'yes' },
            { department: 'Fachbereich', value: 'no' },
          ],
          consolidated: 'yes',
        },
      ]);
      expect(r.comments[0]).toMatchObject({
        checkpointId: 'KB01.K.01',
        text: 'PO ist bekannt',
        authorName: 'Eva Entwicklung',
      });
      expect((await req('GET', `${A()}/report`, c.eva)).json().consensusGaps).toBeNull();
    });
    it('fremde Firma bzw. Nichtmitglied → 404/403', async () => {
      const outsider = await user('Olga Ohne', 'olga@alpha.de', 'respondent', ids.Entwicklung);
      expect((await req('GET', `${A()}/report`, outsider.cookie)).statusCode).toBe(403);
      expect(
        (await req('GET', '/api/assessments/00000000-0000-4000-8000-000000000000/report', c.assessor))
          .statusCode,
      ).toBe(404);
    });
  });

  describe('Benchmark', () => {
    it('TC-BM-004 nur freigegebene Assessments: vor der Freigabe kein Schnappschuss', async () => {
      expect(await handle.db.select().from(assessmentScores)).toHaveLength(0);
      const b = (await req('GET', '/api/benchmark', c.lena)).json();
      expect(b).toMatchObject({ optedOut: false, own: null });
    });
    it('Freigabe legt Schnappschuss an, Zurücknehmen entfernt ihn', async () => {
      await req('POST', `${A()}/status`, c.assessor, { status: 'consolidating' });
      await req('POST', `${A()}/status`, c.assessor, { status: 'released' });
      expect(await handle.db.select().from(assessmentScores)).toHaveLength(1);
      await req('POST', `${A()}/status`, c.assessor, { status: 'consolidating' });
      expect(await handle.db.select().from(assessmentScores)).toHaveLength(0);
      await req('POST', `${A()}/status`, c.assessor, { status: 'released' });
      const b = (await req('GET', '/api/benchmark', c.lena)).json();
      expect(b.own).toMatchObject({ project: 'Bericht 2026', released: true });
    });
    it('TC-BM-002 weniger als 5 Firmen → kein Branchenwert', async () => {
      await peers('RES', [40, 60, 80]);
      const b = (await req('GET', '/api/benchmark', c.lena)).json();
      expect(b.groups.industry).toMatchObject({ n: 4, enough: false, overall: null, areas: [] });
    });
    it('TC-BM-001 ab 5 Firmen: Median und Quartile, eigene Position', async () => {
      await peers('RES', [20, 100]);
      const b = (await req('GET', '/api/benchmark', c.lena)).json();
      expect(b.groups.industry.n).toBe(6);
      expect(b.groups.industry.enough).toBe(true);
      const kb01 = b.groups.industry.areas.find((x: { keyAreaId: string }) => x.keyAreaId === 'KB01');
      expect(kb01.n).toBe(6);
      expect(kb01.median).toBeGreaterThan(0);
      expect(
        b.groups.industry.position.find((x: { keyAreaId: string }) => x.keyAreaId === 'KB01'),
      ).toMatchObject({
        quartile: expect.any(Number),
        delta: expect.any(Number),
      });
    });
    it('TC-BM-003 Antwort enthält keine Firmennamen, IDs oder Einzelwerte', async () => {
      const raw = (await req('GET', '/api/benchmark', c.admin)).body;
      expect(raw).not.toContain('Geheim');
      const peerIds = (await handle.db.select({ id: companies.id }).from(companies)).map((x) => x.id);
      for (const id of peerIds) expect(raw).not.toContain(id);
      const b = JSON.parse(raw);
      expect(Object.keys(b.groups.all.areas[0]).sort()).toEqual(['keyAreaId', 'median', 'n', 'q1', 'q3']);
    });
    it('TC-BM-005 Opt-out: Firma nicht im Vergleich und sieht selbst keinen Benchmark', async () => {
      await peers('RES', [0, 0, 0, 0, 0], false);
      const before = (await req('GET', '/api/benchmark', c.lena)).json();
      expect(before.groups.industry.n).toBe(6);
      await req('PATCH', '/api/admin/company', c.admin, { benchmarkOptIn: false });
      expect((await req('GET', '/api/benchmark', c.lena)).json()).toMatchObject({ optedOut: true });
      await req('PATCH', '/api/admin/company', c.admin, { benchmarkOptIn: true });
    });
    it('Benchmark für ein bestimmtes Assessment (auch vor Freigabe, nur eigene Werte live)', async () => {
      const b = (await req('GET', `/api/benchmark?assessmentId=${ids.asm}`, c.assessor)).json();
      expect(b.own.assessmentId).toBe(ids.asm);
      expect(
        (await req('GET', '/api/benchmark?assessmentId=00000000-0000-4000-8000-000000000000', c.assessor))
          .statusCode,
      ).toBe(404);
    });
  });
});
