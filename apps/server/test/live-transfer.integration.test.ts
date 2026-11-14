/**
 * Integrationstests Phase 5b gegen PostgreSQL (nur mit TEST_DATABASE_URL; Datenbank wird geleert!).
 * Live-Aktualisierung per Server-Sent Events und Präsenz (TC-MU-001/003), Duplizieren (TC-ASM-005),
 * JSON-Export und -Import (TC-IO-001…005).
 */
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
const KP = 'KB01.K.01';

/** Liest Ereignisse eines SSE-Stroms mit, bis `until` erfüllt ist (oder die Zeit abläuft). */
async function openStream(base: string, path: string, cookie: string | undefined) {
  const ctrl = new AbortController();
  const res = await fetch(`${base}${path}`, { headers: { cookie: cookie ?? '' }, signal: ctrl.signal });
  const events: { type: string; data: Record<string, unknown> }[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const pump = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const type = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (type && data) events.push({ type, data: JSON.parse(data) });
        }
      }
    } catch {
      /* abgebrochen */
    }
  })();
  const waitFor = async (pred: (e: (typeof events)[number]) => boolean, ms = 2000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = events.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`Ereignis nicht empfangen: ${JSON.stringify(events.map((e) => e.type))}`);
  };
  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    events,
    waitFor,
    close: async () => {
      ctrl.abort();
      await pump;
    },
  };
}

describe.skipIf(!url)('Phase 5b: Live-Aktualisierung, Duplizieren, JSON-Export/-Import (DB)', () => {
  let handle: DbHandle;
  let app: FastifyInstance;
  let mailer: Mailer;
  let base = '';
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
    expect(r.statusCode).toBe(201);
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
    await app.listen({ host: '127.0.0.1', port: 0 });
    base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;

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
    for (const name of ['Entwicklung', 'Fachbereich']) {
      ids[name] = (await req('POST', '/api/admin/departments', c.admin, { name })).json().id;
    }
    const as = await user('Arne Assessor', 'arne@alpha.de', 'assessor');
    const eva = await user('Eva Entwicklung', 'eva@alpha.de', 'respondent', ids.Entwicklung);
    const emil = await user('Emil Entwicklung', 'emil@alpha.de', 'respondent', ids.Entwicklung);
    const fritz = await user('Fritz Fach', 'fritz@alpha.de', 'respondent', ids.Fachbereich);
    Object.assign(c, { assessor: as.cookie, eva: eva.cookie, emil: emil.cookie, fritz: fritz.cookie });
    Object.assign(ids, { assessor: as.id, eva: eva.id, emil: emil.id, fritz: fritz.id });
    const created = await req('POST', '/api/assessments', c.assessor, {
      project: 'Live 2026',
      assessorName: 'Arne Assessor',
      startDate: '2026-11-01',
      interviewCount: 3,
    });
    ids.asm = created.json().id;
    for (const u of ['eva', 'emil', 'fritz'])
      await req('POST', `${A()}/members`, c.assessor, { userId: ids[u] });
    await req('PUT', `${A()}/assignments/KB01`, c.assessor, {
      departmentIds: [ids.Entwicklung, ids.Fachbereich],
    });
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  describe('Live-Aktualisierung (TC-MU-001) und Präsenz (TC-MU-003)', () => {
    it('Ereignisstrom: hello, Antwort der Kollegin erscheint < 2 s, fremde Abteilung nicht', async () => {
      const emil = await openStream(base, `${A()}/events?keyAreaId=KB01&view=questionnaire`, c.emil);
      expect(emil.status).toBe(200);
      expect(emil.contentType).toContain('text/event-stream');
      await emil.waitFor((e) => e.type === 'hello');
      await req('PUT', `${A()}/answers/${KP}`, c.eva, { value: 'yes', version: 0 });
      const ev = await emil.waitFor((e) => e.type === 'answer');
      expect(ev.data).toMatchObject({
        checkpointId: KP,
        value: 'yes',
        version: 1,
        updatedBy: 'Eva Entwicklung',
      });
      // Antwort einer anderen Abteilung wird Befragten nicht zugestellt (US-9.1).
      await req('PUT', `${A()}/answers/${KP}`, c.fritz, { value: 'no', version: 0 });
      await req('POST', `${A()}/comments`, c.fritz, { checkpointId: KP, text: 'Signal' });
      await emil.waitFor((e) => e.type === 'comment');
      expect(emil.events.filter((e) => e.type === 'answer')).toHaveLength(1);
      await emil.close();
    });
    it('Assessor erhält alle Antworten und Zusammenführungen', async () => {
      const as = await openStream(base, `${A()}/events`, c.assessor);
      await as.waitFor((e) => e.type === 'hello');
      await req('PUT', `${A()}/answers/KB01.K.02`, c.fritz, { value: 'partial', version: 0 });
      await as.waitFor((e) => e.type === 'answer' && e.data.checkpointId === 'KB01.K.02');
      await req('PUT', `${A()}/consolidation/KB01.K.02`, c.assessor, { value: 'partial', version: 0 });
      await as.waitFor((e) => e.type === 'consolidated');
      await as.close();
    });
    it('Präsenz: wer welchen Kernbereich bearbeitet; Wechsel und Verlassen werden verteilt', async () => {
      const eva = await openStream(base, `${A()}/events?keyAreaId=KB01&view=questionnaire`, c.eva);
      const hello = await eva.waitFor((e) => e.type === 'hello');
      const emil = await openStream(base, `${A()}/events?keyAreaId=KB01&view=questionnaire`, c.emil);
      const both = await eva.waitFor(
        (e) => e.type === 'presence' && (e.data.users as unknown[]).length === 2,
      );
      expect(both.data.users).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Emil Entwicklung', keyAreaId: 'KB01' })]),
      );
      const moved = await req('POST', `${A()}/presence`, c.eva, {
        connectionId: hello.data.connectionId,
        keyAreaId: 'KB03',
        view: 'questionnaire',
      });
      expect(moved.statusCode).toBe(200);
      await emil.waitFor(
        (e) =>
          e.type === 'presence' &&
          (e.data.users as { name: string; keyAreaId: string }[]).some(
            (u) => u.name === 'Eva Entwicklung' && u.keyAreaId === 'KB03',
          ),
      );
      // Fremde Verbindungs-ID → 404.
      expect(
        (
          await req('POST', `${A()}/presence`, c.emil, {
            connectionId: hello.data.connectionId,
            keyAreaId: 'KB02',
            view: 'questionnaire',
          })
        ).statusCode,
      ).toBe(404);
      await eva.close();
      await emil.waitFor(
        (e) =>
          e.type === 'presence' &&
          !(e.data.users as { name: string }[]).some((u) => u.name === 'Eva Entwicklung'),
      );
      await emil.close();
    });
    it('Ereignisstrom nur für Berechtigte', async () => {
      const outsider = await user('Olga Ohne', 'olga@alpha.de', 'respondent', ids.Entwicklung);
      expect((await req('GET', `${A()}/events`, outsider.cookie)).statusCode).toBe(403);
      expect((await req('GET', `${A()}/events`)).statusCode).toBe(401);
    });
  });

  describe('Duplizieren (TC-ASM-005)', () => {
    it('Kopie mit neuem Namen, gleichen Antworten, Kommentaren und Zuweisungen', async () => {
      expect((await req('POST', `${A()}/duplicate`, c.eva, { project: 'Kopie' })).statusCode).toBe(403);
      expect((await req('POST', `${A()}/duplicate`, c.assessor, { project: '' })).statusCode).toBe(400);
      const r = await req('POST', `${A()}/duplicate`, c.assessor, { project: 'Live 2026 – Kopie' });
      expect(r.statusCode).toBe(201);
      const copy = r.json();
      expect(copy).toMatchObject({
        project: 'Live 2026 – Kopie',
        imported: { departmentAnswers: 3, comments: 1 },
      });
      const orig = (await req('GET', `${A()}/answers`, c.assessor)).json() as {
        checkpointId: string;
        value: string;
      }[];
      const dup = (await req('GET', `/api/assessments/${copy.id}/answers`, c.assessor)).json() as typeof orig;
      const norm = (l: typeof orig) => l.map((x) => `${x.checkpointId}=${x.value}`).sort();
      expect(norm(dup)).toEqual(norm(orig));
      const detail = (await req('GET', `/api/assessments/${copy.id}`, c.eva)).json();
      expect(detail).toMatchObject({ status: 'collecting', interviewCount: 3 });
      expect(detail.assignments).toHaveLength(2);
      const h = (await req('GET', `/api/history?assessmentId=${copy.id}`, c.assessor)).json();
      expect(h.items[0]).toMatchObject({ action: 'assessment.duplicated', oldValue: 'Live 2026' });
    });
  });

  describe('JSON-Export und -Import (US-1.3, TC-IO-001…005)', () => {
    let exported: Record<string, unknown>;
    it('TC-IO-001 Export und Re-Import ergeben identische Daten', async () => {
      const ex = await req('GET', `${A()}/export`, c.eva);
      expect(ex.headers['content-disposition']).toContain('assessment-Live-2026.json');
      exported = ex.json();
      expect(exported).toMatchObject({ format: 'ai-tpi-assessment', schemaVersion: 1 });
      const im = await req('POST', '/api/assessments/import', c.assessor, exported);
      expect(im.statusCode).toBe(201);
      expect(im.json().ignored).toEqual({ checkpoints: [], departments: [], members: [], keyAreas: [] });
      const again = (await req('GET', `/api/assessments/${im.json().id}/export`, c.assessor)).json();
      const strip = (x: Record<string, unknown>) => {
        const { exportedAt: _e, ...rest } = x;
        return {
          ...rest,
          comments: (rest.comments as Record<string, unknown>[]).map(({ createdAt: _c, ...r }) => r),
        };
      };
      expect(strip(again)).toEqual(strip(exported));
    });
    it('Import nur für Assessoren', async () => {
      expect((await req('POST', '/api/assessments/import', c.eva, exported)).statusCode).toBe(403);
    });
    it('TC-IO-002 keine Exportdatei → invalid_format, nichts angelegt', async () => {
      const before = (await req('GET', '/api/assessments', c.assessor)).json().length;
      const r = await app.inject({
        method: 'POST',
        url: '/api/assessments/import',
        payload: 'das ist kein JSON',
        headers: { ...H, cookie: c.assessor, 'content-type': 'application/json' },
      });
      expect(r.statusCode).toBe(400);
      expect((await req('POST', '/api/assessments/import', c.assessor, { foo: 1 })).json().error).toBe(
        'invalid_format',
      );
      expect((await req('GET', '/api/assessments', c.assessor)).json()).toHaveLength(before);
    });
    it('TC-IO-003 unbekannte schemaVersion → unsupported_version', async () => {
      const r = await req('POST', '/api/assessments/import', c.assessor, { ...exported, schemaVersion: 99 });
      expect(r.json()).toEqual({ error: 'unsupported_version', schemaVersion: 99 });
    });
    it('TC-IO-004 unbekannte Kontrollpunkte und Abteilungen werden übersprungen und gemeldet', async () => {
      const data = structuredClone(exported) as {
        departmentAnswers: { department: string; checkpointId: string; value: string }[];
      };
      data.departmentAnswers.push({ department: 'Entwicklung', checkpointId: 'KB99.X.01', value: 'yes' });
      data.departmentAnswers.push({ department: 'Gibt es nicht', checkpointId: KP, value: 'yes' });
      const r = await req('POST', '/api/assessments/import', c.assessor, data);
      expect(r.statusCode).toBe(201);
      expect(r.json().ignored).toMatchObject({ checkpoints: ['KB99.X.01'], departments: ['Gibt es nicht'] });
    });
    it('TC-IO-005 Import überschreibt kein bestehendes Assessment; ungültige Stammdaten → 400', async () => {
      const before = (await req('GET', `${A()}/export`, c.assessor)).json();
      const bad = structuredClone(exported) as { assessment: { endDate: string } };
      bad.assessment.endDate = '2000-01-01';
      expect((await req('POST', '/api/assessments/import', c.assessor, bad)).json()).toEqual({
        error: 'invalid_input',
        fields: ['endDate'],
      });
      const after = (await req('GET', `${A()}/export`, c.assessor)).json();
      expect({ ...after, exportedAt: 0 }).toEqual({ ...before, exportedAt: 0 });
    });
  });
});
