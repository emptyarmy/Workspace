import {
  expect,
  request as pwRequest,
  test,
  type APIRequestContext,
  type Browser,
  type TestInfo,
} from '@playwright/test';
import { ADMIN_STATE, CSRF, E2E, loggedInContext, login, uniqueId } from './helpers';
import {
  as,
  KP as KP_,
  org as orgFor,
  person as personFor,
  team as teamFor,
  type Org,
  type Person,
} from './erfassung-helpers';

/**
 * Phase 5 – Erfassung: Assessments, Team und Zuweisung, Fragebogen, Kommentare, Quellen,
 * Zusammenführung und Änderungshistorie.
 * docs/05_test/02_testfallkatalog.md: ASM, ANS, COM, SRC, CONS, HIST, MU (Auszug).
 */
// Jeder Test legt eine eigene Firma mit Team an (fünf Nutzer mit Passwort) – das braucht mehr Zeit als der Standard.
test.describe.configure({ timeout: 90_000 });

let admin: APIRequestContext;
test.beforeAll(async ({ baseURL }) => {
  admin = await pwRequest.newContext({ baseURL, storageState: ADMIN_STATE });
});
test.afterAll(() => admin.dispose());

const KP = KP_;
const org = (browser: Browser, info: TestInfo) => orgFor(admin, browser, info);
const person = (
  o: Org,
  info: TestInfo,
  role: 'assessor' | 'respondent' | 'reader',
  name: string,
  dep?: string,
) => personFor(admin, o, info, role, name, dep);
const team = (browser: Browser, info: TestInfo, opts: { methodModel?: 'classic' | 'agile' } = {}) =>
  teamFor(admin, browser, info, opts);

test.describe('Assessment anlegen und verwalten', () => {
  test('TC-ASM-001…004 Anlage mit Pflichtfeldern, Feldfehler bei fehlendem Projekt, Datum und Interviewzahl', async ({
    page,
    browser,
  }, info) => {
    const o = await org(browser, info);
    const a = await person(o, info, 'assessor', 'Anna Anlage');
    await login(page, a.email, E2E.userPassword, o.slug);
    await page.getByTestId('nav-assessments').click();
    await page.getByTestId('assessment-new').click();
    await expect(page.getByTestId('m-assessorName')).toHaveValue('Anna Anlage');

    await page.getByTestId('m-submit').click();
    await expect(page.getByTestId('m-project-error')).toBeVisible(); // TC-ASM-002
    await expect(page).toHaveURL(/\/assessments\/neu$/);

    const project = `Anlage ${uniqueId(info)}`;
    await page.getByTestId('m-project').fill(project);
    await page.getByTestId('m-startDate').fill('2026-11-10');
    await page.getByTestId('m-endDate').fill('2026-11-01');
    await page.getByTestId('m-interviewCount').fill('-3');
    await page.getByTestId('m-submit').click();
    await expect(page.getByTestId('m-endDate-error')).toBeVisible(); // TC-ASM-003
    await expect(page.getByTestId('m-interviewCount-error')).toBeVisible(); // TC-ASM-004
    await page.getByTestId('m-interviewCount').fill('abc');
    await page.getByTestId('m-endDate').fill('2026-11-30');
    await page.getByTestId('m-submit').click();
    await expect(page.getByTestId('m-interviewCount-error')).toBeVisible();
    await page.getByTestId('m-interviewCount').fill('4');
    await page.getByTestId('m-submit').click();

    await expect(page.getByTestId('assessment-title')).toHaveText(project); // TC-ASM-001
    await expect(page.getByTestId('assessment-notice')).toContainText('angelegt');
    await page.getByRole('link', { name: /Zur Übersicht/ }).click();
    await expect(page.getByTestId(`assessment-row-${project}`)).toContainText('Erfassung');
  });

  test('TC-ASM-006/007 Löschen mit Bestätigung; Abbrechen lässt es bestehen', async ({ browser }, info) => {
    const t = await team(browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}`);
    await page.getByTestId('assessment-delete').click();
    await page.getByTestId('confirm-cancel').click();
    await expect(page.getByTestId('assessment-title')).toHaveText(t.project);
    await page.getByTestId('assessment-delete').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page).toHaveURL(/\/assessments\?deleted=1$/);
    await expect(page.getByTestId(`assessment-row-${t.project}`)).toHaveCount(0);
    await t.assessorCtx.close();
  });

  test('TC-ASM-009 Kernbereich zuweisen → Befragte sehen ihn unter „Meine Kernbereiche“', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}?tab=team`);
    await expect(page.getByTestId(`member-${t.eva.email}`)).toContainText(t.devName);
    await page.getByTestId(`assign-KB03-${t.devName}`).check();
    await expect(page.getByTestId('assessment-notice')).toContainText('Zuweisung gespeichert');

    const eva = await as(browser, t.eva);
    await eva.page.goto(`/assessments/${t.asm}/fragebogen`);
    const nav = eva.page.getByTestId('area-nav');
    await expect(nav.getByTestId('area-link-KB01')).toBeVisible();
    await expect(nav.getByTestId('area-link-KB03')).toBeVisible();
    await expect(nav.getByTestId('area-link-KB02')).toHaveCount(0);
    await eva.page.getByTestId('only-mine').uncheck();
    await expect(nav.getByTestId('area-link-KB02')).toBeVisible();
    await eva.ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ASM-008 Vorgehensmodell „klassisch“ blendet agile Kontrollpunkte aus', async ({
    browser,
  }, info) => {
    const t = await team(browser, info, { methodModel: 'classic' });
    const eva = await as(browser, t.eva);
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await expect(eva.page.getByTestId(`cp-${KP}`)).toBeVisible();
    await expect(eva.page.getByTestId('cp-KB01.AG.12')).toHaveCount(0);
    await t.assessorCtx.request.patch(`/api/assessments/${t.asm}`, {
      headers: CSRF,
      data: {
        project: t.project,
        assessorName: 'Arne Assessor',
        startDate: '2026-11-01',
        methodModel: 'agile',
      },
    });
    await eva.page.reload();
    await expect(eva.page.getByTestId('cp-KB01.AG.12')).toBeVisible();
    await expect(eva.page.getByTestId('cp-KB01.AG.12').getByTestId('badge-agile')).toBeVisible();
    await eva.ctx.close();
    await t.assessorCtx.close();
  });
});

test.describe('Fragebogen', () => {
  test('TC-ANS-001…005 beantworten, ändern, Fortschritt, Neuladen, Filter „nur offene“', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}/fragebogen`);
    await expect(page.getByTestId('area-heading')).toContainText('KB01'); // TC-ANS-001
    const progress = page.getByTestId('progress-text');
    await expect(progress).toContainText('0 von');

    const cp = page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('answer-yes').click(); // TC-ANS-002
    await expect(cp.getByTestId('answer-yes')).toHaveAttribute('aria-checked', 'true');
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await expect(progress).toContainText('1 von');

    await cp.getByTestId('answer-no').click(); // TC-ANS-003
    await expect(cp.getByTestId('answer-no')).toHaveAttribute('aria-checked', 'true');
    await expect(cp.getByTestId('answer-yes')).toHaveAttribute('aria-checked', 'false');
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');

    await page.reload(); // TC-ANS-004
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('answer-no')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(progress).toContainText('1 von');

    await page.getByTestId('filter-open').check(); // TC-ANS-005
    await expect(page.getByTestId(`cp-${KP}`)).toHaveCount(0);
    await expect(page.getByTestId('cp-KB01.K.02')).toBeVisible();
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ANS-006 KI-Badge an KI-Kontrollpunkten', async ({ browser }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}/fragebogen/KB17`);
    await expect(page.getByTestId('area-heading')).toContainText('KB17');
    await expect(page.locator('[data-testid^="cp-KB17"]').first().getByTestId('badge-ai')).toBeVisible();
    await expect(page.getByTestId('not-assigned')).toBeVisible();
    await expect(page.locator('[data-testid^="cp-KB17"]').first().getByTestId('answer-yes')).toBeDisabled(); // TC-MU-004
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ANS-007/008 unbekanntes Assessment oder unbekannter Kernbereich → Hinweis statt Fehlerseite', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto('/assessments/00000000-0000-4000-8000-000000000000/fragebogen');
    await expect(page.getByTestId('questionnaire-error')).toContainText('gibt es nicht');
    await expect(page.getByTestId('questionnaire-error').getByRole('link')).toBeVisible();
    await page.goto(`/assessments/${t.asm}/fragebogen/KB99`);
    await expect(page.getByTestId('area-not-found')).toBeVisible();
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-MU-005 Nutzer ohne Mitgliedschaft öffnet die Assessment-URL → keine Berechtigung', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const outsider = await person(t.org, info, 'respondent', 'Olga Ohne', t.dev);
    const { ctx, page } = await as(browser, outsider);
    await page.goto(`/assessments/${t.asm}`);
    await expect(page.getByTestId('assessment-load-error')).toContainText('nicht zum Team');
    expect((await ctx.request.get(`/api/assessments/${t.asm}`)).status()).toBe(403);
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ANS-011 Server nicht erreichbar beim Speichern → „nicht gespeichert“, Wiederholung möglich', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await page.route(`**/api/assessments/${t.asm}/answers/**`, (r) => r.abort('connectionrefused'));
    const cp = page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('answer-partial').click();
    await expect(cp.getByTestId('not-saved')).toBeVisible();
    await page.unroute(`**/api/assessments/${t.asm}/answers/**`);
    await cp.getByTestId('answer-retry').click();
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await page.reload();
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('answer-partial')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ANS-009 Pfeile wechseln zwischen den Kernbereichen', async ({ browser }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await page.getByTestId('only-mine').uncheck();
    await page.getByTestId('area-next').click();
    await expect(page.getByTestId('area-heading')).toContainText('KB02');
    await page.getByTestId('area-prev').click();
    await expect(page.getByTestId('area-heading')).toContainText('KB01');
    // TC-RWD-001: Die Kernbereichsleiste scrollt für sich, die Seite nicht.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-ANS-010 Tastaturbedienung: Pfeiltasten wählen die Antwort', async ({
    browser,
    isMobile,
  }, info) => {
    test.skip(isMobile, 'Tastaturbedienung nur auf Desktop/Tablet mit Tastatur');
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    const cp = page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('answer-yes').focus();
    await page.keyboard.press('ArrowRight');
    await expect(cp.getByTestId('answer-yes')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(cp.getByTestId('answer-partial')).toHaveAttribute('aria-checked', 'true');
    await expect(cp.getByTestId('answer-partial')).toBeFocused();
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    // Schnelle Folge ohne Warten: Speichern läuft nacheinander, kein Scheinkonflikt mit sich selbst.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(cp.getByTestId('answer-na')).toHaveAttribute('aria-checked', 'true');
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await expect(cp.getByTestId('answer-conflict')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('answer-na')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-MU-002 gleichzeitige Änderung derselben Antwort → Konflikthinweis mit Auswahl', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const eva = await as(browser, t.eva);
    const emil = await as(browser, t.emil);
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    // Gleichzeitig = Emil hat Evas Änderung noch nicht erhalten. Ohne Live-Strom bleibt sein Stand veraltet
    // (sonst würde die Live-Aktualisierung den Konflikt verhindern, TC-MU-001).
    await emil.page.route('**/events?*', (r) => r.abort());
    await emil.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await expect(emil.page.getByTestId(`cp-${KP}`)).toBeVisible();
    await emil.page.waitForLoadState('networkidle');
    await eva.page.getByTestId(`cp-${KP}`).getByTestId('answer-yes').click();
    await expect(eva.page.getByTestId(`cp-${KP}`).getByTestId('save-state')).toContainText('✓ gespeichert');

    const cp = emil.page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('answer-no').click();
    await expect(cp.getByTestId('answer-conflict')).toContainText('Eva Entwicklung');
    await expect(cp.getByTestId('answer-yes')).toHaveAttribute('aria-checked', 'true');
    await cp.getByTestId('conflict-take-mine').click();
    await expect(cp.getByTestId('answer-no')).toHaveAttribute('aria-checked', 'true');
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await eva.ctx.close();
    await emil.ctx.close();
    await t.assessorCtx.close();
  });

  test('Abgabe der Abteilung sperrt die Antworten; Assessor öffnet wieder', async ({ browser }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.fritz);
    await page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await page.getByTestId(`cp-${KP}`).getByTestId('answer-yes').click();
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('save-state')).toContainText('✓ gespeichert');
    await page.getByTestId('department-submit').click();
    await page.getByTestId('confirm-ok').click();
    await expect(page.getByTestId('submitted-info')).toBeVisible();
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('answer-no')).toBeDisabled();

    const ap = await t.assessorCtx.newPage();
    await ap.goto(`/assessments/${t.asm}?tab=team`);
    await ap.getByTestId(`submission-Fachbereich ${t.id}`).getByTestId('submission-reopen').click();
    await expect(ap.getByTestId('assessment-notice')).toContainText('wieder geöffnet');
    await page.reload();
    await expect(page.getByTestId(`cp-${KP}`).getByTestId('answer-no')).toBeEnabled();
    await ctx.close();
    await t.assessorCtx.close();
  });
});

test.describe('Quellen und Kommentare', () => {
  test('TC-SRC-001…004 Quellen anlegen, Pflichtname, Duplikat, verwendete Quelle nicht löschbar', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}?tab=sources`);
    await page.getByTestId('source-add').click();
    await expect(page.getByTestId('source-name-error')).toBeVisible(); // TC-SRC-002
    await page.getByTestId('source-name').fill('Lisa Lead');
    await page.getByTestId('source-role').fill('Testmanagerin');
    await page.getByTestId('source-add').click();
    await expect(page.getByTestId('source-row-Lisa Lead')).toContainText('Testmanagerin'); // TC-SRC-001
    await page.getByTestId('source-name').fill('lisa lead');
    await page.getByTestId('source-role').fill('testmanagerin');
    await page.getByTestId('source-add').click();
    await expect(page.getByTestId('assessment-notice')).toContainText('gibt es bereits'); // TC-SRC-003

    const src = (await (await t.assessorCtx.request.get(`/api/assessments/${t.asm}/sources`)).json())[0].id;
    await t.assessorCtx.request.post(`/api/assessments/${t.asm}/comments`, {
      headers: CSRF,
      data: { checkpointId: KP, text: 'Belegt durch Interview', sourceId: src },
    });
    await page.getByTestId('source-row-Lisa Lead').getByTestId('source-delete').click();
    await expect(page.getByTestId('assessment-notice')).toContainText('deaktivieren'); // TC-SRC-004
    await page.getByTestId('source-row-Lisa Lead').getByTestId('source-toggle').click();
    await expect(page.getByTestId('source-row-Lisa Lead')).toContainText('inaktiv');
    await t.assessorCtx.close();
  });

  test('TC-COM-001…007, TC-MU-006/007 Kommentar mit Verfasser und Quelle, Grenzen, Bearbeiten, Löschen', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    await t.assessorCtx.request.post(`/api/assessments/${t.asm}/sources`, {
      headers: CSRF,
      data: { name: 'Interview Team A', type: 'person' },
    });
    const eva = await as(browser, t.eva);
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    const cp = eva.page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('toggle-comments').click();
    const thread = cp.getByTestId(`comments-${KP}`);

    await thread.getByTestId('comment-text-input').fill('   ');
    await thread.getByTestId('comment-save').click();
    await expect(thread.getByTestId('comment-error')).toBeVisible(); // TC-COM-003

    await thread.getByTestId('comment-text-input').fill('x'.repeat(2001));
    await expect(thread.getByTestId('comment-counter')).toContainText('2001 / 2000'); // TC-COM-004
    await expect(thread.getByTestId('comment-save')).toBeDisabled();

    await thread.getByTestId('comment-text-input').fill('<b>fett</b> Risk Poker im Refinement');
    await thread.getByTestId('comment-source-select').selectOption({ label: 'Interview Team A' });
    await thread.getByTestId('comment-save').click();
    const c = thread.getByTestId('comment');
    await expect(c.getByTestId('comment-author')).toHaveText('Eva Entwicklung'); // TC-COM-001
    await expect(c.getByTestId('comment-source')).toHaveText('Interview Team A');
    await expect(c.getByTestId('comment-text')).toHaveText('<b>fett</b> Risk Poker im Refinement'); // TC-COM-005
    await expect(c.locator('b')).toHaveCount(0);

    await c.getByTestId('comment-edit').click(); // TC-COM-006
    await c.getByTestId('comment-edit-text').fill('Risk Poker im Refinement');
    await c.getByTestId('comment-edit-save').click();
    await expect(c.getByTestId('comment-text')).toHaveText('Risk Poker im Refinement');
    await expect(c.getByTestId('comment-edited')).toBeVisible();

    // TC-MU-006/007: Emil sieht den Kommentar mit Verfasserin Eva, darf ihn aber nicht ändern oder löschen.
    const emil = await as(browser, t.emil);
    await emil.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    await emil.page.getByTestId(`cp-${KP}`).getByTestId('toggle-comments').click();
    const ec = emil.page.getByTestId(`comments-${KP}`).getByTestId('comment');
    await expect(ec.getByTestId('comment-author')).toHaveText('Eva Entwicklung');
    await expect(ec.getByTestId('comment-edit')).toHaveCount(0);
    await expect(ec.getByTestId('comment-delete')).toHaveCount(0);

    await c.getByTestId('comment-delete').click(); // TC-COM-007
    await thread.getByTestId('confirm-ok').click();
    await expect(thread.getByTestId('comment')).toHaveCount(0);
    await eva.ctx.close();
    await emil.ctx.close();
    await t.assessorCtx.close();
  });
});

test.describe('Zusammenführung', () => {
  test('TC-CONS-002/004/005 Vergleichsansicht, Begründungspflicht, Festlegen', async ({ browser }, info) => {
    const t = await team(browser, info);
    const answer = async (p: Person, value: string) => {
      const c = await loggedInContext(browser, p.email, E2E.userPassword);
      expect(
        (
          await c.request.put(`/api/assessments/${t.asm}/answers/${KP}`, {
            headers: CSRF,
            data: { value, version: 0 },
          })
        ).status(),
      ).toBe(200);
      await c.close();
    };
    await answer(t.eva, 'yes');
    await answer(t.fritz, 'no');
    const page = await t.assessorCtx.newPage();
    await page.goto(`/assessments/${t.asm}`);
    await page.getByTestId('to-consolidation').click();
    const item = page.getByTestId(`cons-${KP}`);
    await expect(item.getByTestId(`cons-dep-${t.devName}`)).toContainText('Erfüllt');
    await expect(item.getByTestId(`cons-dep-Fachbereich ${t.id}`)).toContainText('Nicht erfüllt');
    await expect(item.getByTestId('cons-suggestion')).toContainText('Teilweise');
    await expect(item.getByTestId('cons-disagree')).toBeVisible();

    await item.getByTestId('cons-save').click();
    await expect(item.getByTestId('cons-rationale-error')).toBeVisible(); // TC-CONS-005
    await item.getByTestId('cons-rationale').fill('Risikoanalyse findet statt, ist aber nicht dokumentiert.');
    await item.getByTestId('cons-save').click();
    await expect(page.getByTestId('consolidation-notice')).toContainText('gespeichert'); // TC-CONS-004
    await expect(page.getByTestId(`cons-${KP}`).getByTestId('cons-done')).toBeVisible();
    await expect(page.getByTestId('cons-progress')).toContainText('1 von');
    // Direktaufruf ohne Kernbereich in der Adresse zeigt den ersten Kernbereich.
    await page.goto(`/assessments/${t.asm}/zusammenfuehrung`);
    await expect(page.getByTestId(`cons-${KP}`).getByTestId('cons-done')).toBeVisible();
    await t.assessorCtx.close();
  });

  test('TC-CONS-006 Befragte haben keinen Zugriff auf die Zusammenführung', async ({ browser }, info) => {
    const t = await team(browser, info);
    const { ctx, page } = await as(browser, t.eva);
    await page.goto(`/assessments/${t.asm}`);
    await expect(page.getByTestId('to-consolidation')).toHaveCount(0);
    await page.goto(`/assessments/${t.asm}/zusammenfuehrung`);
    await expect(page.getByTestId('consolidation-error')).toContainText('Assessoren vorbehalten');
    expect((await ctx.request.get(`/api/assessments/${t.asm}/consolidation`)).status()).toBe(403);
    await ctx.close();
    await t.assessorCtx.close();
  });
});

test.describe('Änderungshistorie', () => {
  test('TC-HIST-001/003 Antwortänderung mit Person, Abteilung, alt → neu; Filter und CSV-Export', async ({
    browser,
  }, info) => {
    const t = await team(browser, info);
    const eva = await as(browser, t.eva);
    await eva.page.goto(`/assessments/${t.asm}/fragebogen/KB01`);
    const cp = eva.page.getByTestId(`cp-${KP}`);
    await cp.getByTestId('answer-yes').click();
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await cp.getByTestId('answer-no').click();
    await expect(cp.getByTestId('save-state')).toContainText('✓ gespeichert');
    await cp.getByTestId('cp-history').click();

    await expect(eva.page.getByTestId('history-panel')).toBeVisible();
    const row = eva.page.getByTestId('history-row').first();
    await expect(row.getByTestId('history-action')).toHaveText('Antwort geändert');
    await expect(row.getByTestId('history-user-name')).toHaveText('Eva Entwicklung');
    await expect(row).toContainText(t.devName);
    await expect(row.getByTestId('history-change')).toHaveText('Erfüllt → Nicht erfüllt');
    await expect(eva.page.getByTestId('history-total')).toContainText('2 Einträge');

    // Lena (Leser) filtert nach Person und exportiert.
    const lena = await as(browser, t.lena);
    await lena.page.goto('/start');
    await lena.page.getByTestId('nav-history').click();
    await expect(lena.page.getByRole('tab')).toHaveCount(1); // TC-HIST-002
    await lena.page.getByTestId('history-assessment').selectOption({ label: t.project });
    await lena.page.getByTestId('history-user').selectOption({ label: 'Eva Entwicklung' });
    await lena.page.getByTestId('history-apply').click();
    await expect(lena.page.getByTestId('history-total')).toContainText('2 Einträge');
    const download = lena.page.waitForEvent('download');
    await lena.page.getByTestId('history-export').click();
    const file = await download;
    const csv = await (await file.createReadStream()).toArray();
    expect(Buffer.concat(csv).toString('utf8')).toContain('answer.changed');
    await eva.ctx.close();
    await lena.ctx.close();
    await t.assessorCtx.close();
  });

  test('TC-HIST-004/005 keine Änderung per API, fremde Firma sieht nichts', async ({ browser }, info) => {
    const t = await team(browser, info);
    expect((await t.assessorCtx.request.delete('/api/history', { headers: CSRF })).status()).toBe(404);
    expect((await t.assessorCtx.request.patch('/api/history', { headers: CSRF, data: {} })).status()).toBe(
      404,
    );
    const own = await (await t.assessorCtx.request.get(`/api/history?assessmentId=${t.asm}`)).json();
    expect(own.total).toBeGreaterThan(0);
    // Ein Admin einer anderen Firma bekommt keine Einträge dieses Assessments.
    const { createTestCompany } = await import('./helpers');
    const other = await createTestCompany(admin, info);
    const ctx = await loggedInContext(browser, other.adminEmail, other.password);
    expect((await (await ctx.request.get(`/api/history?assessmentId=${t.asm}`)).json()).total).toBe(0);
    expect((await ctx.request.get(`/api/assessments/${t.asm}`)).status()).toBe(404);
    await ctx.close();
    await t.assessorCtx.close();
  });
});
