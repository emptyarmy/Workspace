import {
  expect,
  request as pwRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
} from '@playwright/test';
import { catalog } from '@ai-tpi/catalog';
import { ADMIN_STATE, CSRF, E2E, loggedInContext } from './helpers';
import { as, KP, team } from './erfassung-helpers';

/**
 * Phase 6 – Auswertung: Bericht (TC-REP-*), Konsenslücken (TC-CONS-007), Kommentare im Bericht (TC-COM-008)
 * und Benchmark (TC-BM-*). Benchmark-Vergleichsfirmen kommen über /api/test/benchmark-fixture in eine eigene
 * Testbranche, damit parallele Tests sich nicht beeinflussen.
 */
test.describe.configure({ timeout: 90_000 });

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

const kb01 = catalog.keyAreas.find((k) => k.id === 'KB01')!;
const kb02 = catalog.keyAreas.find((k) => k.id === 'KB02')!;

async function consolidate(ctx: BrowserContext, asm: string, cp: string, value: string) {
  const r = await ctx.request.put(`/api/assessments/${asm}/consolidation/${cp}`, {
    headers: CSRF,
    data: { value, version: 0, rationale: 'Festgelegt im Workshop' },
  });
  expect(r.status()).toBe(200);
}

/** Team mit Antworten: KB01 Kontrolliert erfüllt, ein Effizient-KP nicht erfüllt, KB02 komplett n. a. */
async function filled(browser: Parameters<typeof team>[1], info: Parameters<typeof team>[2]) {
  const t = await team(admin, browser, info);
  for (const p of [t.eva, t.fritz]) {
    const c = await loggedInContext(browser, p.email, E2E.userPassword);
    await c.request.put(`/api/assessments/${t.asm}/answers/${KP}`, {
      headers: CSRF,
      data: { value: p === t.eva ? 'yes' : 'no', version: 0 },
    });
    if (p === t.eva)
      await c.request.post(`/api/assessments/${t.asm}/comments`, {
        headers: CSRF,
        data: { checkpointId: KP, text: 'Product Owner ist allen bekannt' },
      });
    await c.close();
  }
  for (const cp of kb01.checkpoints.filter((x) => x.level === 'controlled'))
    await consolidate(t.assessorCtx, t.asm, cp.id, 'yes');
  await consolidate(t.assessorCtx, t.asm, kb01.checkpoints.find((x) => x.level === 'efficient')!.id, 'no');
  for (const cp of kb02.checkpoints) await consolidate(t.assessorCtx, t.asm, cp.id, 'na');
  return t;
}

test.describe('Bericht', () => {
  test('TC-REP-001/002/005/008, TC-CONS-007, TC-COM-008 Bericht mit Kennzahlen, Matrix, Diagrammen, Lücken, Anhang', async ({
    browser,
  }, info) => {
    const t = await filled(browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}`);
    await page.getByTestId('to-report').click();
    await expect(page.getByTestId('report-cover')).toContainText(t.project);
    await expect(page.getByTestId('report-preliminary')).toBeVisible();
    await expect(page.getByTestId('tile-yes')).toContainText(
      String(kb01.checkpoints.filter((x) => x.level === 'controlled').length),
    );
    await expect(page.getByTestId('tile-ai')).toBeVisible(); // TC-REP-008
    await expect(page.getByTestId('level-KB01')).toHaveText('Kontrolliert'); // TC-REP-002
    await expect(page.getByTestId('level-KB02')).toHaveText('n. a.'); // TC-REP-005
    await expect(page.getByTestId(`cell-${KP}`)).toHaveText('✔');
    await expect(page.getByTestId('report-radar')).toBeVisible();
    await expect(page.getByTestId('report-bars')).toBeVisible();
    await expect(page.getByTestId(`gap-${KP}`)).toContainText('Nicht erfüllt'); // TC-CONS-007
    await expect(page.getByTestId(`appendix-${KP}`).getByTestId('appendix-comment')).toContainText(
      'Product Owner ist allen bekannt',
    ); // TC-COM-008
    await t.assessorCtx.close();
  });

  test('TC-REP-003/007 Matrixzelle antippen → Detail mit Text, Begründung und Kommentar', async ({
    browser,
  }, info) => {
    const t = await filled(browser, info);
    const lena = await as(browser, t.lena);
    await lena.page.goto(`/assessments/${t.asm}/bericht`);
    await lena.page.getByTestId(`cell-${KP}`).click();
    const d = lena.page.getByTestId('cell-detail');
    await expect(d).toContainText(kb01.checkpoints[0]!.text.de);
    await expect(d.getByTestId('cell-detail-answer')).toHaveText('Erfüllt');
    await expect(d).toContainText('Festgelegt im Workshop');
    await expect(d.getByTestId('cell-detail-comment')).toContainText('Product Owner ist allen bekannt');
    await d.getByTestId('cell-detail-close').click();
    await expect(d).toHaveCount(0);
    // TC-RWD: Die Matrix scrollt notfalls für sich, die Seite nicht.
    const overflow = await lena.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await lena.ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-REP-004 Bericht ohne Antworten → Hinweis „noch keine Daten“, keine leeren Diagramme', async ({
    browser,
  }, info) => {
    const t = await team(admin, browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}/bericht`);
    await expect(page.getByTestId('report-no-data')).toBeVisible();
    await expect(page.getByTestId('report-radar')).toHaveCount(0);
    await expect(page.getByTestId('report-matrix')).toHaveCount(0);
    await t.assessorCtx.close();
  });

  test('TC-REP-006 Druckansicht: Navigation ausgeblendet, alle Abschnitte vorhanden', async ({
    browser,
    isMobile,
  }, info) => {
    test.skip(isMobile, 'Druck wird auf dem Desktop geprüft');
    const t = await filled(browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}/bericht`);
    await expect(page.getByTestId('report-matrix')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('topbar')).toBeHidden();
    await expect(page.getByTestId('report-print')).toBeHidden();
    for (const s of [
      'report-cover',
      'report-summary',
      'report-matrix',
      'report-charts',
      'report-ai',
      'report-benchmark',
      'report-gaps',
      'report-appendix',
    ])
      await expect(page.getByTestId(s)).toBeVisible();
    const pdf = await page.pdf({ format: 'A4', landscape: true }).catch(() => null); // nur Chromium
    if (pdf) expect(pdf.byteLength).toBeGreaterThan(10_000);
    await t.assessorCtx.close();
  });
});

test.describe('Benchmark', () => {
  /** Eigene Testbranche für die Firma des Teams; `values` = Vergleichsfirmen. */
  async function industryWith(t: Awaited<ReturnType<typeof team>>, code: string, values: number[]) {
    const r = await admin.post('/api/test/benchmark-fixture', {
      headers: CSRF,
      data: { industryCode: code, values },
    });
    expect(r.status()).toBe(200);
    const p = await t.org.request.patch('/api/admin/company', {
      headers: CSRF,
      data: { industryCode: code },
    });
    expect(p.status()).toBe(200);
  }
  const code = (info: { project: { name: string }; workerIndex: number; retry: number }) =>
    `Z${(Date.now() % 46656).toString(36).toUpperCase().padStart(3, '0')}${info.workerIndex % 10}`.slice(
      0,
      5,
    );

  test('TC-BM-001/003/006 ab 5 Firmen: Radar mit 3 Linien, Tabelle mit Median/Quartil, keine Namen', async ({
    browser,
  }, info) => {
    const t = await filled(browser, info);
    const c = code(info);
    // Alle Vergleichsfirmen bei 50 %: Der Branchen-Median ist dann unabhängig vom eigenen Wert 50 %.
    await industryWith(t, c, [50, 50, 50, 50, 50]);
    for (const s of ['consolidating', 'released'])
      await t.assessorCtx.request.post(`/api/assessments/${t.asm}/status`, {
        headers: CSRF,
        data: { status: s },
      });

    const lena = await as(browser, t.lena);
    await lena.page.goto('/start');
    await lena.page.getByTestId('nav-benchmark').click();
    const ind = lena.page.getByTestId('benchmark-group-industry');
    await expect(ind.getByTestId('benchmark-sample')).toContainText('n = 6');
    await expect(ind.getByTestId('benchmark-rank')).toBeVisible();
    await expect(lena.page.getByTestId('benchmark-radar').locator('figcaption')).toContainText('Ihre Firma');
    await expect(lena.page.getByTestId('benchmark-radar').locator('polygon.area')).toHaveCount(3);
    await expect(lena.page.getByTestId('benchmark-row-KB01')).toContainText('50 %'); // Median der Branche
    // TC-BM-003: keine Firmennamen der Vergleichsfirmen in Antwort und Seite.
    const raw = await (await lena.ctx.request.get('/api/benchmark')).text();
    expect(raw).not.toContain(`Benchmark ${c}`);
    await expect(lena.page.getByText(`Benchmark ${c}`)).toHaveCount(0);
    // TC-BM-006: Tabelle als Alternative, Seite ohne waagerechtes Scrollen.
    await expect(lena.page.getByTestId('benchmark-table')).toBeVisible();
    const overflow = await lena.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await lena.ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-BM-002 nur 3 Firmen in der Branche → „Zu wenige Vergleichsdaten“', async ({ browser }, info) => {
    const t = await team(admin, browser, info);
    await industryWith(t, code(info), [40, 50, 60]);
    const page = await t.assessorCtx.newPage();
    await page.goto('/benchmark');
    await expect(page.getByTestId('benchmark-group-industry').getByTestId('benchmark-too-few')).toContainText(
      '3 von mindestens 5',
    );
    await expect(page.getByTestId('benchmark-no-own')).toBeVisible();
    await t.assessorCtx.close();
  });

  test('TC-BM-005 Opt-out: Firma sieht keinen Benchmark', async ({ browser }, info) => {
    const t = await team(admin, browser, info);
    await t.org.request.patch('/api/admin/company', { headers: CSRF, data: { benchmarkOptIn: false } });
    const page = await t.assessorCtx.newPage();
    await page.goto('/benchmark');
    await expect(page.getByTestId('benchmark-opted-out')).toBeVisible();
    await t.assessorCtx.close();
  });
});
