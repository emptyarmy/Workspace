/**
 * Integrationstests Phase 7 (Handlungsempfehlungen) gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Der KI-Dienst wird durch einen lokalen HTTP-Server nachgebildet (OpenAI-kompatibel).
 * TC-REC-001…012.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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

type Rec = {
  id: string;
  horizon: 'short' | 'long';
  part: string;
  checkpointIds: string[];
  origin: string;
  status: string;
  version: number;
  title: string;
  aiModuleName: string | null;
  aiModel: string | null;
  ownerName: string | null;
  edited: boolean;
  nextStep: string | null;
  ruleText: string;
};

describe.skipIf(!url)('Phase 7: Handlungsempfehlungen (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let mailer: Mailer;
  let llm: Server;
  let llmBase = '';
  /** Aufrufe des nachgebildeten KI-Dienstes je Szenario. */
  const calls: Record<string, number> = {};
  const bodies: Record<string, unknown> = {};
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
  const consolidate = (cp: string, value: string) =>
    req('PUT', `${A()}/consolidation/${cp}`, c.assessor, { value, version: 0, rationale: 'Begründung' });
  async function aiModule(name: string, scenario: string, extra: object = {}) {
    const r = await req('POST', '/api/admin/ai-modules', c.admin, {
      name,
      mode: 'local',
      provider: 'openai_compatible',
      baseUrl: `${llmBase}/${scenario}`,
      model: `modell-${scenario}`,
      apiKey: 'sk-test',
      timeoutSec: 5,
      ...extra,
    });
    expect(r.statusCode).toBe(201);
    return r.json().id as string;
  }
  const generate = (moduleId: string | null | undefined, consent?: boolean, cookie = c.assessor) =>
    req('POST', `${A()}/recommendations/generate`, cookie, {
      moduleId: moduleId ?? null,
      consent,
      lang: 'de',
    });

  beforeAll(async () => {
    // Nachgebildeter KI-Dienst: Szenario = erstes Pfadsegment.
    llm = createServer((rq, rs) => {
      const scenario = (rq.url ?? '').split('/')[1] ?? '';
      let raw = '';
      rq.on('data', (d) => (raw += d));
      rq.on('end', () => {
        calls[scenario] = (calls[scenario] ?? 0) + 1;
        const body = JSON.parse(raw || '{}');
        bodies[scenario] = body;
        const send = (status: number, content?: string) => {
          rs.writeHead(status, { 'content-type': 'application/json' });
          rs.end(
            JSON.stringify(content === undefined ? { error: 'x' } : { choices: [{ message: { content } }] }),
          );
        };
        if (scenario === 'http401') return send(401);
        if (scenario === 'http500') return send(500);
        if (scenario === 'timeout') return void setTimeout(() => send(200, '{}'), 8000);
        if (scenario === 'invalid') return send(200, 'Das ist kein JSON');
        const ctx = JSON.parse(body.messages[1].content);
        const ids = (ctx.candidates as { checkpointId: string }[]).map((x) => x.checkpointId);
        if (scenario === 'unknown')
          return send(
            200,
            JSON.stringify({
              recommendations: [{ horizon: 'short', checkpointIds: ['KB99.Z.01'], title: 't', text: 'x' }],
            }),
          );
        send(
          200,
          JSON.stringify({
            recommendations: [
              {
                horizon: 'short',
                checkpointIds: [ids[0]],
                title: `${scenario}: Risiko-Poker einführen`,
                text: 'Im nächsten Refinement.',
                nextStep: 'Termin',
                benefit: 'Fokus',
                metric: 'Fehler',
                ownerRole: 'PO',
              },
              {
                horizon: 'long',
                checkpointIds: ids.slice(1, 3),
                title: `${scenario}: Metriken aufbauen`,
                text: 'Quartalsweise.',
              },
            ],
          }),
        );
      });
    });
    await new Promise<void>((r) => llm.listen(0, '127.0.0.1', () => r()));
    llmBase = `http://127.0.0.1:${(llm.address() as AddressInfo).port}`;

    handle = createDb(url!);
    await handle.db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    await handle.db.insert(industries).values(DEFAULT_INDUSTRIES);
    await handle.db.insert(blockedDomains).values([{ domain: 'gmail.com' }]);
    const config = loadConfig({
      NODE_ENV: 'test',
      SETUP_ENABLED: 'true',
      MAIL_TRANSPORT: 'memory',
      SECRET_ENCRYPTION_KEY: 'test-key-0123456789abcdef0123456789abcdef',
    });
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
    ids.dep = (await req('POST', '/api/admin/departments', c.admin, { name: 'Entwicklung' })).json().id;
    const as = await user('Arne Assessor', 'arne@alpha.de', 'assessor');
    const eva = await user('Eva Entwicklung', 'eva@alpha.de', 'respondent', ids.dep);
    const lena = await user('Lena Leser', 'lena@alpha.de', 'reader');
    const otto = await user('Otto Ohne', 'otto@alpha.de', 'assessor');
    Object.assign(c, { assessor: as.cookie, eva: eva.cookie, lena: lena.cookie });
    Object.assign(ids, { eva: eva.id, otto: otto.id });
    const created = await req('POST', '/api/assessments', c.assessor, {
      project: 'Empfehlungen 2026',
      assessorName: 'Arne Assessor',
      startDate: '2026-11-01',
    });
    ids.asm = created.json().id;
    for (const u of [eva, lena]) await req('POST', `${A()}/members`, c.assessor, { userId: u.id });
    await req('PUT', `${A()}/assignments/KB01`, c.assessor, { departmentIds: [ids.dep] });
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
    await new Promise((r) => llm?.close(r));
  });

  it('TC-REC-012 Befragte, Leser und Admins dürfen keine Module wählen oder Empfehlungen erzeugen', async () => {
    for (const [ck, reason] of [
      [c.eva, 'role_read_only'],
      [c.lena, 'role_read_only'],
      [c.admin, 'admin_read_only'],
    ] as const) {
      expect((await req('GET', `${A()}/ai-modules`, ck)).statusCode).toBe(403);
      const g = await generate(null, undefined, ck);
      expect(g.statusCode).toBe(403);
      expect(g.json()).toMatchObject({ error: 'forbidden', reason });
      expect((await req('POST', `${A()}/recommendations/preview`, ck, { moduleId: null })).statusCode).toBe(
        403,
      );
    }
    // Lesen ist erlaubt (Admin: lesend, S-11)
    const r = await req('GET', `${A()}/recommendations`, c.lena);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ items: [], canEdit: false, members: [] });
    expect((await req('GET', `${A()}/recommendations`, c.admin)).statusCode).toBe(200);
  });

  it('TC-REC-009 ohne nicht/teilweise erfüllte KP: Hinweis „keine Handlungsfelder“', async () => {
    const r = await generate(null);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ origin: 'rule', notice: 'nothing_to_do', created: 0, items: [] });
    expect(r.json().openCount).toBeGreaterThan(0);
  });

  it('TC-REC-001/002 regelbasierte Empfehlungen, Horizont nach Aufwand, Aufteilung teilweise + M', async () => {
    await consolidate('KB01.K.01', 'no'); // S → kurzfristig
    await consolidate('KB01.K.03', 'partial'); // M + teilweise → beides
    await consolidate('KB01.O.02', 'no'); // L → langfristig
    await consolidate('KB01.K.02', 'yes');
    const r = await generate(null);
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toMatchObject({ origin: 'rule', notice: null, canEdit: true });
    const items = body.items as Rec[];
    const short = items.filter((x) => x.horizon === 'short');
    const long = items.filter((x) => x.horizon === 'long');
    expect(short.map((x) => [x.checkpointIds, x.part])).toEqual([
      [['KB01.K.01'], 'whole'],
      [['KB01.K.03'], 'first_step'],
    ]);
    expect(long.map((x) => [x.checkpointIds, x.part])).toEqual([
      [['KB01.K.03'], 'full'],
      [['KB01.O.02'], 'whole'],
    ]);
    expect(short[1]!.title).toMatch(/^Erster Schritt: /);
    expect(items.every((x) => x.origin === 'rule' && x.status === 'proposed' && x.aiModel === null)).toBe(
      true,
    );
    // Mitglieder für die Auswahl der Verantwortlichen
    expect(body.members.map((m: { name: string }) => m.name)).toEqual([
      'Arne Assessor',
      'Eva Entwicklung',
      'Lena Leser',
    ]);
  });

  it('TC-REC-011 Admin legt Standardmodul fest → Vorbelegung für den Assessor', async () => {
    ids.ok = await aiModule('KI lokal', 'ok');
    ids.alt = await aiModule('KI zweit', 'alt');
    let list = (await req('GET', `${A()}/ai-modules`, c.assessor)).json().modules;
    expect(list[0]).toMatchObject({ id: ids.ok, isDefault: true }); // erstes Modul wird Standard
    expect(JSON.stringify(list)).not.toContain('sk-test');
    expect(list[0]).not.toHaveProperty('baseUrl');
    await req('PATCH', `/api/admin/ai-modules/${ids.alt}`, c.admin, { isDefault: true });
    list = (await req('GET', `${A()}/ai-modules`, c.assessor)).json().modules;
    expect(list[0]).toMatchObject({ id: ids.alt, isDefault: true });
    expect(list.find((m: { id: string }) => m.id === ids.ok).isDefault).toBe(false);
  });

  it('TC-REC-007 ohne Zustimmung kein Aufruf des KI-Dienstes; Vorschau sendet nichts', async () => {
    const r = await generate(ids.ok);
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toBe('consent_required');
    expect((await generate(ids.ok, false)).statusCode).toBe(400);
    const p = await req('POST', `${A()}/recommendations/preview`, c.assessor, {
      moduleId: ids.ok,
      lang: 'de',
    });
    expect(p.statusCode).toBe(200);
    const prev = p.json();
    expect(prev).toMatchObject({
      mode: 'local',
      target: llmBase.replace('http://', ''),
      module: { name: 'KI lokal' },
    });
    const ctx = JSON.parse(prev.messages.user);
    expect(ctx.candidates.map((x: { checkpointId: string }) => x.checkpointId)).toEqual(
      expect.arrayContaining(['KB01.K.01', 'KB01.K.03', 'KB01.O.02']),
    );
    expect(ctx).not.toHaveProperty('comments'); // sendComments = false
    expect(prev.messages.user).not.toContain('Alpha GmbH');
    expect(calls.ok ?? 0).toBe(0);
  });

  it('Vorschau mit Kommentaren pseudonymisiert Namen und E-Mail-Adressen', async () => {
    await req('POST', `${A()}/comments`, c.eva, {
      checkpointId: 'KB01.K.01',
      text: 'Laut Eva Entwicklung (eva@alpha.de) fehlt der PO.',
    });
    const id = await aiModule('KI mit Kommentaren', 'ok', { sendComments: true, pseudonymize: true });
    const p = (await req('POST', `${A()}/recommendations/preview`, c.assessor, { moduleId: id })).json();
    const ctx = JSON.parse(p.messages.user);
    expect(ctx.comments).toEqual([
      { checkpointId: 'KB01.K.01', text: 'Laut [Person] ([E-Mail]) fehlt der PO.' },
    ]);
    await req('DELETE', `/api/admin/ai-modules/${id}`, c.admin);
  });

  it('TC-REC-003 KI-Empfehlungen mit Kennzeichnung, Modul und Modell', async () => {
    const r = await generate(ids.ok, true);
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toMatchObject({ origin: 'ai', notice: null, created: 2 });
    const items = body.items as Rec[];
    expect(items.map((x) => x.title)).toEqual(['ok: Risiko-Poker einführen', 'ok: Metriken aufbauen']);
    expect(items[0]).toMatchObject({
      origin: 'ai',
      aiModuleName: 'KI lokal',
      aiModel: 'modell-ok',
      nextStep: 'Termin',
    });
    expect(items[0]!.ruleText).toContain('KB01.K.01');
    expect(calls.ok).toBe(1);
    // Schlüssel und Modell gehen an den Dienst
    expect(bodies.ok).toMatchObject({ model: 'modell-ok' });
  });

  it('TC-REC-010 zweites Modul gewählt → Modul/Modell an der Empfehlung gespeichert', async () => {
    const items = (await generate(ids.alt, true)).json().items as Rec[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((x) => x.aiModuleName === 'KI zweit' && x.aiModel === 'modell-alt')).toBe(true);
  });

  it('TC-REC-004 Zeitüberschreitung → Fallback auf Regeln mit Hinweis', { timeout: 20_000 }, async () => {
    const id = await aiModule('KI langsam', 'timeout');
    const body = (await generate(id, true)).json();
    expect(body).toMatchObject({ origin: 'rule', notice: 'ai_timeout' });
    expect((body.items as Rec[]).every((x) => x.origin === 'rule' && x.aiModuleName === 'KI langsam')).toBe(
      true,
    );
  });

  it('TC-REC-005 ungültiges JSON bzw. unbekannte KP-ID → verworfen, Fallback, Hinweis', async () => {
    for (const [scenario, detail] of [
      ['invalid', 'invalid_json'],
      ['unknown', 'unknown_checkpoint'],
    ] as const) {
      const id = await aiModule(`KI ${scenario}`, scenario);
      const body = (await generate(id, true)).json();
      expect(body).toMatchObject({ origin: 'rule', notice: 'ai_invalid_response', noticeDetail: detail });
      expect((body.items as Rec[]).length).toBe(4);
    }
  });

  it('TC-REC-006 HTTP 401 / 500 → verständlicher Hinweis, Fallback; Audit-Eintrag', async () => {
    const a = await aiModule('KI 401', 'http401');
    expect((await generate(a, true)).json()).toMatchObject({
      notice: 'ai_auth_failed',
      status: 401,
      origin: 'rule',
    });
    const b = await aiModule('KI 500', 'http500');
    expect((await generate(b, true)).json()).toMatchObject({ notice: 'ai_http_error', status: 500 });
    const logs = await handle.db.execute<{ action: string }>(
      sql`select action from audit_log where action like 'ai.recommendations%' order by created_at`,
    );
    expect(logs.rows.map((x) => x.action)).toContain('ai.recommendations_failed');
    expect(logs.rows.map((x) => x.action)).toContain('ai.recommendations');
  });

  it('TC-REC-008 annehmen, bearbeiten, Verantwortliche und Termin setzen; Konflikt und Validierung', async () => {
    const items = (await generate(null)).json().items as Rec[];
    const rec = items.find((x) => x.checkpointIds[0] === 'KB01.K.01')!;
    const P = `${A()}/recommendations/${rec.id}`;
    // Leser / Befragte: 403
    expect((await req('PATCH', P, c.lena, { version: rec.version, status: 'accepted' })).statusCode).toBe(
      403,
    );
    expect((await req('PATCH', P, c.admin, { version: rec.version, status: 'accepted' })).statusCode).toBe(
      403,
    );
    // Verantwortliche muss Mitglied sein
    expect(
      (await req('PATCH', P, c.assessor, { version: rec.version, ownerUserId: ids.otto })).json().error,
    ).toBe('invalid_owner');
    expect(
      (await req('PATCH', P, c.assessor, { version: rec.version, dueDate: '31.12.2026' })).statusCode,
    ).toBe(400);
    const r = await req('PATCH', P, c.assessor, {
      version: rec.version,
      status: 'accepted',
      title: 'PO verbindlich benennen',
      ownerUserId: ids.eva,
      dueDate: '2026-12-15',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      status: 'accepted',
      title: 'PO verbindlich benennen',
      ownerName: 'Eva Entwicklung',
      dueDate: '2026-12-15',
      edited: true,
      version: rec.version + 1,
    });
    // veraltete Version → 409
    const stale = await req('PATCH', P, c.assessor, { version: rec.version, status: 'done' });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().current.status).toBe('accepted');
    // Historie
    const h = await handle.db.execute<{ action: string }>(
      sql`select action from change_history where entity_type = 'recommendation' and entity_id = ${rec.id}`,
    );
    expect(h.rows.map((x) => x.action)).toEqual(['recommendation.status_accepted']);
    // Neu erzeugen: angenommene Empfehlung bleibt, wird nicht doppelt vorgeschlagen
    const again = (await generate(null)).json().items as Rec[];
    const forK01 = again.filter((x) => x.checkpointIds.includes('KB01.K.01') && x.horizon === 'short');
    expect(forK01).toHaveLength(1);
    expect(forK01[0]).toMatchObject({ id: rec.id, status: 'accepted' });
  });

  it('fremdes Assessment / unbekannte Empfehlung → 404, ungültiges Modul → 400', async () => {
    expect(
      (await req('GET', '/api/assessments/00000000-0000-0000-0000-000000000000/recommendations', c.assessor))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await req('PATCH', `${A()}/recommendations/00000000-0000-0000-0000-000000000000`, c.assessor, {
          version: 1,
        })
      ).statusCode,
    ).toBe(404);
    expect((await generate('00000000-0000-0000-0000-000000000000', true)).json().error).toBe(
      'invalid_module',
    );
  });
});
