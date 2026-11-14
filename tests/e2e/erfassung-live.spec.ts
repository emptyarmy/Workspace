import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE, CSRF, E2E, loggedInContext } from './helpers';
import { as, KP, team } from './erfassung-helpers';

/**
 * Phase 5b – Live-Aktualisierung ohne Neuladen, Präsenz, Duplizieren, JSON-Export und -Import.
 * docs/05_test/02_testfallkatalog.md: TC-MU-001, TC-MU-003, TC-ASM-005, TC-IO-001…005.
 */
test.describe.configure({ timeout: 90_000 });

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

test.describe('Mehrbenutzerbetrieb live', () => {
  test('TC-MU-001 Antwort und Kommentar von A erscheinen bei B ohne Neuladen (≤ 2 s)', async ({
    browser,
  }, info) => {
    const t = await team(admin, browser, info);
    const eva = await as(browser, t.eva);
    const emil = await as(browser, t.emil);
    await emil.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await expect(emil.page.getByTestId(`cp-${KP}`)).toBeVisible();
    await emil.page.getByTestId(`cp-${KP}`).getByTestId('toggle-comments').click();
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    // Erst wenn Emils Ereignisstrom steht, sieht er Eva in der Präsenz.
    await expect(emil.page.getByTestId('presence-banner')).toContainText('Eva Entwicklung');

    await eva.page.getByTestId(`cp-${KP}`).getByTestId('answer-partial').click();
    await expect(emil.page.getByTestId(`cp-${KP}`).getByTestId('answer-partial')).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 2000 },
    );
    await expect(emil.page.getByTestId('progress-text')).toContainText('1 von');

    await eva.page.getByTestId(`cp-${KP}`).getByTestId('toggle-comments').click();
    await eva.page.getByTestId(`comments-${KP}`).getByTestId('comment-text-input').fill('Live-Kommentar');
    await eva.page.getByTestId(`comments-${KP}`).getByTestId('comment-save').click();
    await expect(emil.page.getByTestId(`comments-${KP}`).getByTestId('comment-text')).toHaveText(
      'Live-Kommentar',
      { timeout: 2000 },
    );
    await eva.ctx.close();
    await emil.ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-MU-003 Präsenzanzeige „A bearbeitet KB03“ und Wechsel des Kernbereichs', async ({
    browser,
  }, info) => {
    const t = await team(admin, browser, info);
    const eva = await as(browser, t.eva);
    const emil = await as(browser, t.emil);
    await emil.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await emil.page.getByTestId('only-mine').uncheck();
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB03`);
    await expect(eva.page.getByTestId('area-heading')).toContainText('KB03');
    await expect(emil.page.getByTestId('area-presence-KB03')).toBeVisible();
    await emil.page.getByTestId('area-link-KB03').click();
    await expect(emil.page.getByTestId('presence-banner')).toHaveText(
      /Eva Entwicklung bearbeitet gerade KB03/,
    );

    // Eva wechselt den Kernbereich, dann verlässt sie die Seite.
    await eva.page.getByTestId('area-next').click();
    await expect(eva.page.getByTestId('area-heading')).toContainText('KB04');
    await expect(emil.page.getByTestId('presence-banner')).toHaveCount(0);
    await expect(emil.page.getByTestId('area-presence-KB04')).toBeVisible();
    await eva.ctx.close();
    await expect(emil.page.getByTestId('area-presence-KB04')).toHaveCount(0);
    await emil.ctx.close();
    await t.assessorCtx.close();
  });
});

test.describe('Duplizieren und JSON-Export/-Import', () => {
  test('TC-ASM-005 Assessment duplizieren → Kopie mit neuem Namen und gleichen Antworten', async ({
    browser,
  }, info) => {
    const t = await team(admin, browser, info);
    const ev = await loggedInContext(browser, t.eva.email, E2E.userPassword);
    await ev.request.put(`/api/assessments/${t.asm}/answers/${KP}`, {
      headers: CSRF,
      data: { value: 'yes', version: 0 },
    });
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}`);
    await page.getByTestId('duplicate-name').fill(`${t.project} Kopie`);
    await page.getByTestId('duplicate').click();
    await expect(page.getByTestId('assessment-notice')).toContainText('Kopie angelegt');
    await page.getByTestId('duplicate-link').click();
    await expect(page.getByTestId('assessment-title')).toHaveText(`${t.project} Kopie`);
    await expect(page.getByTestId('assessment-status')).toHaveText('Erfassung');

    const evaPage = await ev.newPage();
    await evaPage.goto('/assessments');
    await evaPage.getByTestId(`assessment-row-${t.project} Kopie`).getByTestId('assessment-link').click();
    await evaPage.getByTestId('to-questionnaire').click();
    await expect(evaPage.getByTestId(`cp-${KP}`).getByTestId('answer-yes')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await ev.close();
    await t.assessorCtx.close();
  });

  test('TC-IO-001 Export als JSON und Re-Import ergeben dieselben Daten', async ({ browser }, info) => {
    const t = await team(admin, browser, info);
    const ev = await loggedInContext(browser, t.eva.email, E2E.userPassword);
    await ev.request.put(`/api/assessments/${t.asm}/answers/${KP}`, {
      headers: CSRF,
      data: { value: 'no', version: 0 },
    });
    await ev.request.post(`/api/assessments/${t.asm}/comments`, {
      headers: CSRF,
      data: { checkpointId: KP, text: 'Exportierter Kommentar' },
    });
    await ev.close();
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}`);
    const dl = page.waitForEvent('download');
    await page.getByTestId('assessment-export').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^assessment-.*\.json$/);
    const path = await file.path();

    // Unter neuem Namen importieren, damit die Zeile eindeutig ist.
    const fs = await import('node:fs/promises');
    const data = JSON.parse(await fs.readFile(path, 'utf8'));
    data.assessment.project = `${t.project} Import`;
    await page.goto('/assessments');
    await page.getByTestId('assessment-import-file').setInputFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data)),
    });
    await expect(page.getByTestId('confirm-dialog')).toContainText(`${t.project} Import`);
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('assessment-list-notice')).toContainText('1 Antworten und 1 Kommentaren');
    await expect(page.getByTestId('import-ignored')).toHaveCount(0);
    await page.getByTestId('import-link').click();
    await expect(page.getByTestId('assessment-title')).toHaveText(`${t.project} Import`);

    const id = page.url().split('/').pop()!;
    const again = await (await t.assessorCtx.request.get(`/api/assessments/${id}/export`)).json();
    expect(again.departmentAnswers).toEqual(data.departmentAnswers);
    expect(again.comments.map((c: { text: string }) => c.text)).toEqual(['Exportierter Kommentar']);
    expect(again.assignments).toEqual(data.assignments);
    await t.assessorCtx.close();
  });

  test('TC-IO-002…005 kein JSON, unbekannte Version, unbekannter Kontrollpunkt, Abbruch', async ({
    browser,
  }, info) => {
    const t = await team(admin, browser, info);
    const page = await t.assessorCtx.newPage();
    const exported = await (await t.assessorCtx.request.get(`/api/assessments/${t.asm}/export`)).json();
    await page.goto('/assessments');
    const rows = page.getByTestId('assessment-list').locator('li');
    await expect(rows).toHaveCount(1);
    const upload = (content: string) =>
      page.getByTestId('assessment-import-file').setInputFiles({
        name: 'datei.json',
        mimeType: 'application/json',
        buffer: Buffer.from(content),
      });

    await upload('das ist kein JSON'); // TC-IO-002
    await expect(page.getByTestId('assessment-list-notice')).toContainText('kein gültiges JSON');
    await upload(JSON.stringify({ hallo: 'welt' }));
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('assessment-list-notice')).toContainText(
      'keine gültige AI_TPI-Exportdatei',
    );

    await upload(JSON.stringify({ ...exported, schemaVersion: 99 })); // TC-IO-003
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('assessment-list-notice')).toContainText('nicht unterstützt');

    await upload(JSON.stringify({ ...exported, assessment: { ...exported.assessment, project: 'Abbruch' } })); // TC-IO-005
    await page.getByTestId('confirm-cancel').click();
    await expect(rows).toHaveCount(1);

    const withUnknown = {
      ...exported,
      assessment: { ...exported.assessment, project: `${t.project} Teilimport` },
      departmentAnswers: [
        ...exported.departmentAnswers,
        { department: t.devName, checkpointId: 'KB99.X.01', value: 'yes' },
      ],
    };
    await upload(JSON.stringify(withUnknown)); // TC-IO-004
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('import-ignored')).toContainText('KB99.X.01');
    await expect(rows).toHaveCount(2);
    await t.assessorCtx.close();
  });
});
