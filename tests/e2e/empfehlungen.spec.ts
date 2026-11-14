import {
  expect,
  request as pwRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type TestInfo,
} from '@playwright/test';
import { ADMIN_STATE, CSRF, uniqueId } from './helpers';
import { as, team, type Org } from './erfassung-helpers';

/**
 * Phase 7 – Handlungsempfehlungen (TC-REC-001…012).
 * Der KI-Dienst wird vom Testserver nachgebildet (/test-llm/<token>/<szenario>, nur mit TEST_ENDPOINTS);
 * Aufrufe lassen sich über /api/test/llm-calls/<token> zählen (TC-REC-007).
 */
test.describe.configure({ timeout: 120_000 });

const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 3100);

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

async function consolidate(ctx: BrowserContext, asm: string, cp: string, value: string) {
  const r = await ctx.request.put(`/api/assessments/${asm}/consolidation/${cp}`, {
    headers: CSRF,
    data: { value, version: 0, rationale: 'Festgelegt im Workshop' },
  });
  expect(r.status()).toBe(200);
}

/** Team mit Antworten: S → kurzfristig, M teilweise → beide Horizonte, L → langfristig. */
async function filled(browser: Parameters<typeof team>[1], info: TestInfo) {
  const t = await team(admin, browser, info);
  await consolidate(t.assessorCtx, t.asm, 'KB01.K.01', 'no');
  await consolidate(t.assessorCtx, t.asm, 'KB01.K.03', 'partial');
  await consolidate(t.assessorCtx, t.asm, 'KB01.O.02', 'no');
  return t;
}

/** KI-Modul der Testfirma, das auf den nachgebildeten Dienst zeigt. */
async function aiModule(o: Org, info: TestInfo, name: string, scenario: string, extra: object = {}) {
  const token = `${uniqueId(info)}-${scenario}`;
  const r = await o.request.post('/api/admin/ai-modules', {
    headers: CSRF,
    data: {
      name,
      mode: 'local',
      provider: 'openai_compatible',
      baseUrl: `http://127.0.0.1:${SERVER_PORT}/test-llm/${token}/${scenario}`,
      model: `modell-${scenario}`,
      apiKey: 'sk-e2e',
      timeoutSec: 5,
      ...extra,
    },
  });
  expect(r.status()).toBe(201);
  return { id: (await r.json()).id as string, token };
}
const llmCalls = async (token: string) =>
  ((await (await admin.get(`/api/test/llm-calls/${token}`)).json()) as { calls: number }).calls;

test('TC-REC-001/002/008 regelbasierte Empfehlungen erzeugen, annehmen, bearbeiten, Verantwortliche setzen', async ({
  browser,
}, info) => {
  const t = await filled(browser, info);
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}`);
  await page.getByTestId('to-recommendations').click();
  await expect(page.getByTestId('recs-empty')).toBeVisible();
  await expect(page.getByTestId('recs-module')).toHaveValue(''); // keine KI-Module → nur Regeln
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('recs-notice')).toContainText('4 Empfehlungen erzeugt');
  await expect(page.getByTestId('recs-open')).toBeVisible();

  // TC-REC-002: S → kurzfristig, L → langfristig, M teilweise → beides
  const short = page.getByTestId('recs-short');
  const long = page.getByTestId('recs-long');
  await expect(short.locator('[data-checkpoints="KB01.K.01"]')).toBeVisible();
  await expect(short.locator('[data-checkpoints="KB01.K.03"]').getByTestId('rec-title')).toContainText(
    'Erster Schritt',
  );
  await expect(long.locator('[data-checkpoints="KB01.K.03"]').getByTestId('rec-title')).toContainText(
    'Vollständige Umsetzung',
  );
  await expect(long.locator('[data-checkpoints="KB01.O.02"]')).toBeVisible();
  await expect(short.locator('[data-checkpoints="KB01.O.02"]')).toHaveCount(0);
  await expect(page.getByTestId('rec-rule').first()).toHaveText('Regelbasiert');

  // TC-REC-008: annehmen, Verantwortliche, Termin, Text bearbeiten
  const card = short.locator('[data-checkpoints="KB01.K.01"]');
  await card.getByTestId('rec-accept').click();
  await expect(card.getByTestId('rec-status')).toHaveText('Angenommen');
  await card.getByTestId('rec-owner').selectOption({ label: 'Eva Entwicklung' });
  await expect(page.getByTestId('recs-notice')).toHaveText('Gespeichert.');
  const dueSaved = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.request().postData()?.includes('2026-12-15') === true,
  );
  await card.getByTestId('rec-due').fill('2026-12-15');
  await card.getByTestId('rec-due').blur();
  expect((await dueSaved).status()).toBe(200);
  await expect(page.getByTestId('recs-notice')).toHaveText('Gespeichert.');
  await card.getByTestId('rec-edit-start').click();
  await card.getByTestId('rec-edit-title').fill('Product Owner verbindlich benennen');
  await card.getByTestId('rec-edit-save').click();
  await expect(card.getByTestId('rec-title')).toHaveText('Product Owner verbindlich benennen');

  await page.reload();
  const again = page.getByTestId('recs-short').locator('[data-checkpoints="KB01.K.01"]');
  await expect(again.getByTestId('rec-title')).toHaveText('Product Owner verbindlich benennen');
  await expect(again.getByTestId('rec-status')).toHaveText('Angenommen');
  await expect(again.getByTestId('rec-owner')).toHaveValue(t.eva.id);
  await expect(again.getByTestId('rec-due')).toHaveValue('2026-12-15');
  await expect(again).toContainText('bearbeitet');

  // Maßnahmenplan-Filter und Bericht
  await page.getByTestId('recs-filter').selectOption('plan');
  await expect(page.getByTestId('rec-card')).toHaveCount(1);
  await page.goto(`/assessments/${t.asm}/bericht`);
  await expect(page.getByTestId('plan-row')).toHaveCount(1);
  await expect(page.getByTestId('plan-row')).toContainText('Product Owner verbindlich benennen');
  await expect(page.getByTestId('plan-row')).toContainText('Eva Entwicklung');

  // Neu erzeugen: angenommene Empfehlung bleibt erhalten und wird nicht doppelt vorgeschlagen
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('recs-notice')).toContainText('3 Empfehlungen erzeugt');
  await expect(page.getByTestId('recs-short').locator('[data-checkpoints="KB01.K.01"]')).toHaveCount(1);
});

test('TC-REC-003/007/010/011 KI-Modul wählen, Datenschutz-Vorschau, ablehnen ohne Aufruf, KI-Kennzeichnung', async ({
  browser,
}, info) => {
  const t = await filled(browser, info);
  const first = await aiModule(t.org, info, 'KI Standard', 'ok'); // erstes Modul = Standard
  const second = await aiModule(t.org, info, 'KI Zweit', 'alt');
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(page.getByTestId('recs-module')).toHaveValue(first.id);

  // TC-REC-011: Admin ändert das Standardmodul → neue Vorbelegung
  const patched = await t.org.request.patch(`/api/admin/ai-modules/${second.id}`, {
    headers: CSRF,
    data: { isDefault: true },
  });
  expect(patched.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId('recs-module')).toHaveValue(second.id);

  // TC-REC-007: Vorschau zeigen, ablehnen → kein Erzeugen-Aufruf, kein Aufruf des KI-Dienstes
  const generateCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/recommendations/generate')) generateCalls.push(r.url());
  });
  await page.getByTestId('recs-start').click();
  const dlg = page.getByTestId('recs-consent');
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('KI Zweit');
  await expect(dlg).toContainText('modell-alt');
  await expect(page.getByTestId('recs-payload')).toContainText('KB01.K.01');
  await expect(page.getByTestId('recs-payload')).not.toContainText(t.project);
  await expect(page.getByTestId('recs-decline')).toBeFocused();
  await page.getByTestId('recs-decline').click();
  await expect(dlg).toBeHidden();
  await expect(page.getByTestId('recs-notice')).toContainText('keine Daten gesendet');
  expect(generateCalls).toEqual([]);
  expect(await llmCalls(second.token)).toBe(0);

  // TC-REC-003/010: zustimmen → KI-Empfehlungen des gewählten Moduls mit Kennzeichnung
  await page.getByTestId('recs-start').click();
  await page.getByTestId('recs-consent-ok').click();
  await expect(page.getByTestId('recs-notice')).toContainText('2 Empfehlungen erzeugt');
  const card = page.getByTestId('rec-card').first();
  await expect(card.getByTestId('rec-title')).toContainText('Alt-KI-Vorschlag');
  await expect(card.getByTestId('rec-ai')).toContainText('KI-generiert (KI Zweit · modell-alt');
  await expect(card).toContainText('Anzahl Produktionsfehler je Quartal');
  await card.locator('summary').click();
  await expect(card.locator('.rule-text p')).toBeVisible();
  expect(await llmCalls(second.token)).toBe(1);
  expect(await llmCalls(first.token)).toBe(0);

  // Leser sieht die KI-Kennzeichnung ebenfalls (nur lesend)
  const { ctx, page: lp } = await as(browser, t.lena);
  await lp.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(lp.getByTestId('rec-ai').first()).toBeVisible();
  await ctx.close();
});

test('TC-REC-004/005/006 KI-Fehler → Fallback auf Regeln mit verständlichem Hinweis', async ({
  browser,
}, info) => {
  const t = await filled(browser, info);
  const timeout = await aiModule(t.org, info, 'KI langsam', 'timeout');
  const invalid = await aiModule(t.org, info, 'KI kaputt', 'invalid_json');
  const unknown = await aiModule(t.org, info, 'KI fantasiert', 'unknown_id');
  const auth = await aiModule(t.org, info, 'KI 401', 'http_401');
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}/empfehlungen`);

  const run = async (moduleId: string) => {
    await page.getByTestId('recs-module').selectOption(moduleId);
    await page.getByTestId('recs-start').click();
    await page.getByTestId('recs-consent-ok').click();
  };
  await run(timeout.id); // TC-REC-004
  await expect(page.getByTestId('recs-notice')).toContainText('nicht rechtzeitig geantwortet', {
    timeout: 20_000,
  });
  await expect(page.getByTestId('recs-notice')).toContainText('regelbasierten Empfehlungen');
  await expect(page.getByTestId('rec-rule')).toHaveCount(4);
  await expect(page.getByTestId('rec-ai')).toHaveCount(0);

  await run(invalid.id); // TC-REC-005
  await expect(page.getByTestId('recs-notice')).toContainText('verworfen');
  await expect(page.getByTestId('rec-rule')).toHaveCount(4);
  await run(unknown.id);
  await expect(page.getByTestId('recs-notice')).toContainText('unbekannte Kontrollpunkte');
  await expect(page.getByTestId('rec-ai')).toHaveCount(0);

  await run(auth.id); // TC-REC-006
  await expect(page.getByTestId('recs-notice')).toContainText('HTTP 401');
  await expect(page.getByTestId('recs-notice')).toContainText('API-Schlüssel');

  // HTTP 500 über die API
  const err = await aiModule(t.org, info, 'KI 500', 'http_500');
  const r = await t.assessorCtx.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
    headers: CSRF,
    data: { moduleId: err.id, consent: true, lang: 'de' },
  });
  expect(await r.json()).toMatchObject({ notice: 'ai_http_error', status: 500, origin: 'rule' });
  // ohne Zustimmung: 400, kein Aufruf
  const noConsent = await t.assessorCtx.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
    headers: CSRF,
    data: { moduleId: err.id, lang: 'de' },
  });
  expect(noConsent.status()).toBe(400);
  expect(await llmCalls(err.token)).toBe(1);
});

test('TC-REC-009 keine nicht/teilweise erfüllten KP → Hinweis „keine Handlungsfelder“', async ({
  browser,
}, info) => {
  const t = await team(admin, browser, info);
  await consolidate(t.assessorCtx, t.asm, 'KB01.K.01', 'yes');
  await consolidate(t.assessorCtx, t.asm, 'KB01.K.02', 'na');
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('recs-notice')).toContainText('Keine Handlungsfelder');
  await expect(page.getByTestId('recs-notice').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('rec-card')).toHaveCount(0);
});

test('TC-REC-012 Befragte und Leser: keine Modulwahl, API 403', async ({ browser }, info) => {
  const t = await filled(browser, info);
  await aiModule(t.org, info, 'KI Standard', 'ok');
  for (const p of [t.eva, t.lena]) {
    const { ctx, page } = await as(browser, p);
    await page.goto(`/assessments/${t.asm}/empfehlungen`);
    await expect(page.getByTestId('recs-readonly')).toBeVisible();
    await expect(page.getByTestId('recs-module')).toHaveCount(0);
    await expect(page.getByTestId('recs-start')).toHaveCount(0);
    expect((await ctx.request.get(`/api/assessments/${t.asm}/ai-modules`)).status()).toBe(403);
    const r = await ctx.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
      headers: CSRF,
      data: { moduleId: null, lang: 'de' },
    });
    expect(r.status()).toBe(403);
    await ctx.close();
  }
});

test('TC-REC-012 403 beim Erzeugen/Speichern → sprechende Meldung statt Fehler; Admin sieht Hinweis „nur lesend“', async ({
  browser,
}, info) => {
  const t = await filled(browser, info);
  const page = await t.assessorCtx.newPage();
  await page.goto(`/assessments/${t.asm}/empfehlungen`);
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('rec-card')).toHaveCount(4);

  // Rechte wurden inzwischen entzogen (z. B. Rolle auf Leser geändert): Server antwortet 403 mit Grund
  await page.route('**/recommendations/generate', (r) =>
    r.fulfill({ status: 403, json: { error: 'forbidden', reason: 'role_read_only', role: 'reader' } }),
  );
  await page.getByTestId('recs-start').click();
  await expect(page.getByTestId('recs-notice')).toHaveText(
    /Keine Berechtigung: Mit der Rolle „Leser“ können Sie Empfehlungen nur lesen/,
  );
  await page.route('**/recommendations/*', (r) =>
    r.request().method() === 'PATCH'
      ? r.fulfill({ status: 403, json: { error: 'forbidden', reason: 'not_assessor', role: 'assessor' } })
      : r.fallback(),
  );
  await page.getByTestId('rec-accept').first().click();
  await expect(page.getByTestId('recs-notice')).toContainText(
    'Nur Assessoren, die zum Team dieses Assessments gehören',
  );
  await expect(page.getByTestId('rec-status').first()).toHaveText('Vorgeschlagen');

  // Admin der Firma: echter 403 vom Server, Seite zeigt den Grund
  const a = await t.org.request.post(`/api/assessments/${t.asm}/recommendations/generate`, {
    headers: CSRF,
    data: { moduleId: null, lang: 'de' },
  });
  expect(a.status()).toBe(403);
  expect(await a.json()).toMatchObject({ reason: 'admin_read_only' });
  const adminPage = await t.org.request.storageState().then(async (state) => {
    const ctx = await browser.newContext({ storageState: state });
    return ctx.newPage();
  });
  await adminPage.goto(`/assessments/${t.asm}/empfehlungen`);
  await expect(adminPage.getByTestId('recs-readonly')).toContainText(
    'Als Admin haben Sie hier nur Lesezugriff',
  );
  await expect(adminPage.getByTestId('rec-card')).toHaveCount(4);
  await expect(adminPage.getByTestId('rec-accept')).toHaveCount(0);
  await adminPage.context().close();
});
