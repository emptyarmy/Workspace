import {
  expect,
  request as pwRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type TestInfo,
} from '@playwright/test';
import { ADMIN_STATE, CSRF, E2E, linkFrom, loggedInContext, uniqueId, waitForMail } from './helpers';
import { as, KP, team, type Org } from './erfassung-helpers';
import { PasswordSetPage } from './pages/password-set.page';

/**
 * Phase 8a – Mandantentrennung und Rechte (TC-TEN-001/002/010/025, TC-ADM-013/029/030/031/036/037,
 * TC-USR-014/018/019, TC-RST-006). Jeder Test legt eigene Firmen an (parallel lauffähig).
 */
test.describe.configure({ timeout: 120_000 });

const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 3100);
const NIL = '00000000-0000-0000-0000-000000000000';

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

type Team = Awaited<ReturnType<typeof team>>;

async function consolidate(ctx: BrowserContext, asm: string, cp: string, value: string) {
  const r = await ctx.request.put(`/api/assessments/${asm}/consolidation/${cp}`, {
    headers: CSRF,
    data: { value, version: 0, rationale: 'Festgelegt im Workshop' },
  });
  expect(r.status()).toBe(200);
}

/** Team mit Daten: Antwort und Kommentar von Eva, Zusammenführung, regelbasierte Empfehlungen. */
async function filled(browser: Parameters<typeof team>[1], info: TestInfo, comment: string) {
  const t = await team(admin, browser, info);
  const { ctx } = await as(browser, t.eva);
  expect(
    (
      await ctx.request.put(`/api/assessments/${t.asm}/answers/${KP}`, {
        headers: CSRF,
        data: { value: 'partial', version: 0 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await ctx.request.post(`/api/assessments/${t.asm}/comments`, {
        headers: CSRF,
        data: { checkpointId: KP, text: comment },
      })
    ).status(),
  ).toBe(201);
  await ctx.close();
  await consolidate(t.assessorCtx, t.asm, KP, 'no');
  await consolidate(t.assessorCtx, t.asm, 'KB01.O.02', 'no');
  const g = await t.assessorCtx.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
    headers: CSRF,
    data: { moduleId: null, lang: 'de' },
  });
  expect(g.status()).toBe(200);
  return t;
}

/** Alle lesenden Endpunkte eines Assessments – für fremde Firmen müssen alle 404 liefern. */
const readEndpoints = (asm: string) => [
  `/api/assessments/${asm}`,
  `/api/assessments/${asm}/answers`,
  `/api/assessments/${asm}/comments`,
  `/api/assessments/${asm}/consolidation`,
  `/api/assessments/${asm}/report`,
  `/api/assessments/${asm}/recommendations`,
  `/api/assessments/${asm}/recommendations.csv`,
  `/api/assessments/${asm}/export`,
  `/api/assessments/${asm}/sources`,
];

/** Schreibversuche auf ein Assessment (Antwort, Kommentar, Zusammenführung, Stammdaten, Team, Empfehlungen). */
async function writeAttempts(r: APIRequestContext, asm: string, userId: string) {
  return {
    answer: (
      await r.put(`/api/assessments/${asm}/answers/${KP}`, {
        headers: CSRF,
        data: { value: 'yes', version: 0 },
      })
    ).status(),
    comment: (
      await r.post(`/api/assessments/${asm}/comments`, {
        headers: CSRF,
        data: { checkpointId: KP, text: 'x' },
      })
    ).status(),
    consolidation: (
      await r.put(`/api/assessments/${asm}/consolidation/${KP}`, {
        headers: CSRF,
        data: { value: 'yes', version: 1, rationale: 'x' },
      })
    ).status(),
    patch: (
      await r.patch(`/api/assessments/${asm}`, { headers: CSRF, data: { project: 'Übernahme' } })
    ).status(),
    member: (await r.post(`/api/assessments/${asm}/members`, { headers: CSRF, data: { userId } })).status(),
    generate: (
      await r.post(`/api/assessments/${asm}/recommendations/generate`, {
        headers: CSRF,
        data: { moduleId: null, lang: 'de' },
      })
    ).status(),
  };
}

test('TC-TEN-001/002/010 TC-ADM-037 Firma B sieht nichts von Firma A – weder Assessor noch Admin (UI + API)', async ({
  browser,
}, info) => {
  const a = await filled(browser, info, 'Geheimer Kommentar der Firma A');
  const b = await team(admin, browser, info);

  // TC-TEN-002: Liste enthält nur eigene Assessments
  const list = (await (await b.assessorCtx.request.get('/api/assessments')).json()) as { id: string }[];
  expect(list.map((x) => x.id)).toContain(b.asm);
  expect(list.map((x) => x.id)).not.toContain(a.asm);
  const page = await b.assessorCtx.newPage();
  await page.goto('/assessments');
  await expect(page.getByText(b.project)).toBeVisible();
  await expect(page.getByText(a.project)).toHaveCount(0);

  // TC-TEN-001: fremde Assessment-ID → 404 in API und Oberfläche
  for (const url of readEndpoints(a.asm))
    expect((await b.assessorCtx.request.get(url)).status(), url).toBe(404);
  expect(Object.values(await writeAttempts(b.assessorCtx.request, a.asm, b.eva.id))).toEqual([
    404, 404, 404, 404, 404, 404,
  ]);
  const hist = (await (await b.assessorCtx.request.get(`/api/history?assessmentId=${a.asm}`)).json()) as {
    items: unknown[];
  };
  expect(hist.items).toEqual([]);
  await page.goto(`/assessments/${a.asm}`);
  await expect(page.getByTestId('assessment-load-error')).toBeVisible();
  await page.goto(`/assessments/${a.asm}/bericht`);
  await expect(page.getByTestId('report-error')).toBeVisible();
  await expect(page.getByText('Geheimer Kommentar der Firma A')).toHaveCount(0);

  // TC-TEN-010 / TC-ADM-037: Admin von Firma B
  const adminB = b.org.request;
  for (const url of readEndpoints(a.asm)) expect((await adminB.get(url)).status(), url).toBe(404);
  const users = JSON.stringify(await (await adminB.get('/api/admin/users')).json());
  expect(users).not.toContain(a.assessor.email);
  expect(users).not.toContain(a.eva.email);
  expect(
    (
      await adminB.patch(`/api/admin/users/${a.eva.id}`, { headers: CSRF, data: { role: 'reader' } })
    ).status(),
  ).toBe(404);
  expect((await adminB.delete(`/api/admin/users/${a.eva.id}`, { headers: CSRF })).status()).toBe(404);
  expect((await adminB.post(`/api/admin/users/${a.eva.id}/password-reset`, { headers: CSRF })).status()).toBe(
    404,
  );
  expect(
    (await adminB.patch(`/api/admin/departments/${a.dev}`, { headers: CSRF, data: { name: 'X' } })).status(),
  ).toBe(404);
  const moduleA = await a.org.request.post('/api/admin/ai-modules', {
    headers: CSRF,
    data: { name: 'Modul A', mode: 'rules', provider: 'rules' },
  });
  const moduleAId = (await moduleA.json()).id as string;
  expect(
    (
      await adminB.patch(`/api/admin/ai-modules/${moduleAId}`, { headers: CSRF, data: { name: 'gekapert' } })
    ).status(),
  ).toBe(404);
  expect(JSON.stringify(await (await adminB.get('/api/admin/ai-modules')).json())).not.toContain(moduleAId);
  expect(JSON.stringify(await (await adminB.get('/api/admin/company')).json())).not.toContain(a.org.domain);
  // Oberfläche als Admin B
  const adminCtx = await loggedInContext(browser, b.org.adminEmail, b.org.adminPassword);
  const ap = await adminCtx.newPage();
  await ap.goto(`/assessments/${a.asm}/bericht`);
  await expect(ap.getByTestId('report-error')).toBeVisible();
  await ap.goto(`/assessments/${a.asm}/empfehlungen`);
  await expect(ap.getByTestId('recs-error')).toBeVisible();
  await adminCtx.close();
  // unbekannte IDs verhalten sich gleich (kein Rückschluss auf Existenz)
  expect((await b.assessorCtx.request.get(`/api/assessments/${NIL}`)).status()).toBe(404);
});

test('TC-ADM-029/036 TC-USR-019 Admin liest Bericht, Antworten, Kommentare und Empfehlungen der eigenen Firma – ohne Bearbeitung', async ({
  browser,
}, info) => {
  const t = await filled(browser, info, 'Kommentar für den Admin sichtbar');
  const ctx = await loggedInContext(browser, t.org.adminEmail, t.org.adminPassword);
  const page = await ctx.newPage();

  await page.goto(`/assessments/${t.asm}`);
  await expect(page.getByTestId('assessment-readonly')).toBeVisible();
  await expect(page.getByTestId('duplicate-box')).toHaveCount(0);

  await page.goto(`/assessments/${t.asm}/bericht`);
  await expect(page.getByTestId('report')).toBeVisible();
  await expect(page.getByTestId('report-error')).toHaveCount(0);

  await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
  await expect(page.getByTestId('questionnaire')).toBeVisible();
  await page.getByTestId('view-department').selectOption(t.dev);
  await expect(page.getByTestId('answer-yes').first()).toBeDisabled();
  await expect(page.getByTestId('department-submit')).toHaveCount(0);
  await expect(page.getByTestId('comment-form')).toHaveCount(0);

  await page.goto(`/assessments/${t.asm}/zusammenfuehrung/KB01`);
  await expect(page.getByTestId('consolidation')).toBeVisible();
  await expect(page.getByTestId('cons-value')).toHaveCount(0);

  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(page.getByTestId('recs-readonly')).toContainText('Als Admin haben Sie hier nur Lesezugriff');
  await expect(page.getByTestId('rec-card').first()).toBeVisible();
  await expect(page.getByTestId('rec-accept')).toHaveCount(0);

  // Lesen per API: Antworten und Kommentare der eigenen Firma sichtbar
  expect((await ctx.request.get(`/api/assessments/${t.asm}/answers`)).status()).toBe(200);
  expect(
    JSON.stringify(await (await ctx.request.get(`/api/assessments/${t.asm}/comments`)).json()),
  ).toContain('Kommentar für den Admin sichtbar');
  // TC-ADM-036 / TC-USR-019: keine Schreibrechte
  const w = await writeAttempts(ctx.request, t.asm, t.emil.id);
  expect(w).toEqual({
    answer: 403,
    comment: 403,
    consolidation: 403,
    patch: 403,
    member: 403,
    generate: 403,
  });
  await ctx.close();
});

test('TC-ADM-030 Admin öffnet die Benchmark-Ansicht: nur aggregierte Kennzahlen', async ({
  browser,
}, info) => {
  const t = await filled(browser, info, 'Kommentar darf nicht im Benchmark stehen');
  const ctx = await loggedInContext(browser, t.org.adminEmail, t.org.adminPassword);
  const page = await ctx.newPage();
  await page.goto('/benchmark');
  await expect(page.getByTestId('benchmark-view')).toBeVisible();
  await expect(page.getByText('Kommentar darf nicht im Benchmark stehen')).toHaveCount(0);
  await expect(page.getByText(KP)).toHaveCount(0);
  const bm = await ctx.request.get(`/api/benchmark?assessmentId=${t.asm}`);
  expect(bm.status()).toBe(200);
  const json = JSON.stringify(await bm.json());
  expect(json).not.toContain(KP);
  expect(json).not.toContain('Kommentar darf nicht');
  expect(json).not.toContain('Eva Entwicklung');
  await ctx.close();
});

test('TC-ADM-031 Admin-Historie: Ereignisse der eigenen Firma, nichts von anderen Firmen', async ({
  browser,
}, info) => {
  const a = await filled(browser, info, 'Kommentar A');
  const b = await filled(browser, info, 'Kommentar B');
  const ctx = await loggedInContext(browser, a.org.adminEmail, a.org.adminPassword);
  const hist = (await (await ctx.request.get('/api/history')).json()) as {
    items: { assessmentName: string | null; action: string }[];
  };
  const names = new Set(hist.items.map((h) => h.assessmentName));
  expect(names.has(a.project)).toBe(true);
  expect(names.has(b.project)).toBe(false);
  expect(hist.items.some((h) => h.assessmentName === a.project && h.action.startsWith('answer'))).toBe(true);
  // Oberfläche
  const page = await ctx.newPage();
  await page.goto(`/admin?tab=history&assessmentId=${a.asm}`);
  await expect(page.getByTestId('history-row').first()).toBeVisible();
  await expect(page.getByTestId('history-panel')).not.toContainText(b.project);
  // Verwaltungsereignisse: die firmenübergreifende Anlage der Firma durch den Setup-Admin steht im Audit-Log
  const audit = JSON.stringify(await (await ctx.request.get('/api/admin/audit')).json());
  expect(audit).not.toContain(b.org.domain);
  await ctx.close();
});

test('TC-USR-014/018 Leser: Bericht lesbar, keine Bearbeitungselemente, Schreib-API 403', async ({
  browser,
}, info) => {
  const t = await filled(browser, info, 'Kommentar für Lena');
  const { ctx, page } = await as(browser, t.lena);
  await page.goto(`/assessments/${t.asm}/bericht`);
  await expect(page.getByTestId('report')).toBeVisible();
  await expect(page.getByTestId('report-error')).toHaveCount(0);
  await page.goto(`/assessments/${t.asm}`);
  await expect(page.getByTestId('assessment-readonly')).toBeVisible();
  await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
  await page.getByTestId('view-department').selectOption(t.dev);
  await expect(page.getByTestId('answer-yes').first()).toBeDisabled();
  await expect(page.getByTestId('comment-form')).toHaveCount(0);
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(page.getByTestId('recs-readonly')).toBeVisible();
  await expect(page.getByTestId('recs-start')).toHaveCount(0);
  const w = await writeAttempts(ctx.request, t.asm, t.emil.id);
  expect(w).toEqual({
    answer: 403,
    comment: 403,
    consolidation: 403,
    patch: 403,
    member: 403,
    generate: 403,
  });
  await ctx.close();
});

/** KI-Modul der Firma auf den nachgebildeten KI-Dienst des Testservers. */
async function llmModule(o: Org, info: TestInfo, name: string, provider: string, scenario: string) {
  const token = `${uniqueId(info)}-${name.replace(/\W+/g, '')}`;
  const r = await o.request.post('/api/admin/ai-modules', {
    headers: CSRF,
    data: {
      name,
      mode: provider === 'anthropic' ? 'cloud' : 'local',
      provider,
      baseUrl: `http://127.0.0.1:${SERVER_PORT}/test-llm/${token}/${scenario}`,
      model: `modell-${scenario}`,
      apiKey: 'sk-e2e',
      timeoutSec: 5,
    },
  });
  expect(r.status()).toBe(201);
  return { id: (await r.json()).id as string, token };
}
const llm = async (token: string) =>
  (await (await admin.get(`/api/test/llm-calls/${token}`)).json()) as {
    calls: number;
    format: string | null;
    last: Record<string, unknown> | null;
  };
async function generate(t: Team, moduleId: string) {
  const r = await t.assessorCtx.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
    headers: CSRF,
    data: { moduleId, consent: true, lang: 'de' },
  });
  return {
    status: r.status(),
    body: (await r.json()) as Record<string, unknown> & { items?: Record<string, unknown>[] },
  };
}

test('TC-TEN-025 Firma A und B mit unterschiedlichen KI-Modulen: jede Firma nur über ihr eigenes Modul', async ({
  browser,
}, info) => {
  const a = await filled(browser, info, 'A');
  const b = await filled(browser, info, 'B');
  const ma = await llmModule(a.org, info, 'KI Firma A', 'openai_compatible', 'ok');
  const mb = await llmModule(b.org, info, 'KI Firma B', 'openai_compatible', 'alt');

  const ra = await generate(a, ma.id);
  expect(ra.body).toMatchObject({ origin: 'ai', notice: null });
  expect(ra.body.items!.every((x) => x.aiModuleName === 'KI Firma A')).toBe(true);
  expect(String(ra.body.items![0]!.title)).toMatch(/^KI-Vorschlag/);
  const rb = await generate(b, mb.id);
  expect(String(rb.body.items![0]!.title)).toMatch(/^Alt-KI-Vorschlag/);
  expect((await llm(ma.token)).calls).toBe(1);
  expect((await llm(mb.token)).calls).toBe(1);

  // Modul der anderen Firma ist nicht nutzbar und nicht sichtbar
  expect((await generate(a, mb.id)).body).toMatchObject({ error: 'invalid_module' });
  expect((await llm(mb.token)).calls).toBe(1);
  const listA = JSON.stringify(
    await (await a.assessorCtx.request.get(`/api/assessments/${a.asm}/ai-modules`)).json(),
  );
  expect(listA).toContain('KI Firma A');
  expect(listA).not.toContain('KI Firma B');
});

test('TC-ADM-013 Anbieterwechsel Ollama → Claude: Empfehlungen laufen über den neuen Adapter', async ({
  browser,
}, info) => {
  const t = await filled(browser, info, 'X');
  const m = await llmModule(t.org, info, 'Wechselmodul', 'ollama', 'ok');
  const first = await generate(t, m.id);
  expect(first.body).toMatchObject({ origin: 'ai', notice: null });
  expect(first.body.items!.every((x) => x.aiProvider === 'ollama')).toBe(true);
  expect(await llm(m.token)).toMatchObject({ calls: 1, format: 'ollama' });

  // Admin stellt auf Anthropic (Claude) um – gleicher Token, neues Szenario/Modell
  const switched = await t.org.request.patch(`/api/admin/ai-modules/${m.id}`, {
    headers: CSRF,
    data: {
      mode: 'cloud',
      provider: 'anthropic',
      baseUrl: `http://127.0.0.1:${SERVER_PORT}/test-llm/${m.token}/claude`,
      model: 'claude-test',
      apiKey: 'sk-ant-e2e',
    },
  });
  expect(switched.status()).toBe(200);
  const second = await generate(t, m.id);
  expect(second.body).toMatchObject({ origin: 'ai', notice: null });
  expect(second.body.items!.every((x) => x.aiProvider === 'anthropic' && x.aiModel === 'claude-test')).toBe(
    true,
  );
  expect(String(second.body.items![0]!.title)).toMatch(/^Claude-Vorschlag/);
  const calls = await llm(m.token);
  expect(calls).toMatchObject({ calls: 2, format: 'anthropic' });
  // Anthropic-Format: System-Prompt als eigenes Feld, max_tokens gesetzt
  expect(calls.last).toMatchObject({ model: 'claude-test' });
  expect(typeof calls.last!.system).toBe('string');
  expect(typeof calls.last!.max_tokens).toBe('number');

  // Oberfläche zeigt Kennzeichnung mit neuem Modell
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(page.getByTestId('rec-ai').first()).toContainText('Wechselmodul · claude-test');
});

test('TC-RST-006 Während der Passwortvergabe per Einmal-Link andere Seite aufrufen → Anmeldung verlangt, Link bleibt gültig', async ({
  browser,
}, info) => {
  const t = await team(admin, browser, info);
  const email = `neu.${uniqueId(info)}@${t.org.domain}`;
  expect(
    (
      await t.org.request.post('/api/admin/users', {
        headers: CSRF,
        data: { name: 'Nina Neu', email, role: 'reader' },
      })
    ).status(),
  ).toBe(201);
  await admin.post('/api/auth/password-reset', { headers: CSRF, data: { email } });
  const link = linkFrom(await waitForMail(admin, email, 'token='));

  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto(link);
  await expect(page.getByTestId('password-set-card')).toBeVisible();
  // geschützte Seiten direkt aufrufen: keine Sitzung → Anmeldung
  for (const url of ['/start', '/assessments', `/assessments/${t.asm}/bericht`, '/admin']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/login/);
  }
  expect((await ctx.request.get('/api/auth/me')).status()).toBe(401);
  // zurück zum Link: Token wurde durch die Navigation nicht verbraucht
  await page.goto(link);
  const pw = new PasswordSetPage(page);
  await expect(page.getByTestId('password-set-card')).toBeVisible();
  await pw.input.fill(E2E.userPassword);
  await pw.repeat.fill(E2E.userPassword);
  await pw.save.click();
  await expect(page).toHaveURL(/\/login\/.*passwordSet=1/);
  // danach Anmeldung ohne weiteren Pflichtdialog (R-07)
  const login = await ctx.request.post('/api/auth/login', {
    headers: CSRF,
    data: { email, password: E2E.userPassword },
  });
  expect(login.status()).toBe(200);
  const me = (await (await ctx.request.get('/api/auth/me')).json()) as { mustChangePassword?: boolean };
  expect(me.mustChangePassword ?? false).toBe(false);
  await ctx.close();
});
