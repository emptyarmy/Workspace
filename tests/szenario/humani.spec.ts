import { execFileSync } from 'node:child_process';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { catalog } from '@ai-tpi/catalog';
import { achievedLevel, checkpointInScope, suggestConsolidated, type Answer } from '@ai-tpi/shared';
import { DATABASE_URL, MAILPIT_URL, ROOT } from './env';

/**
 * Szenario „Humani“ (TC-SZ-001 … TC-SZ-011): von der leeren Datenbank bis zum Bericht, alles über die Oberfläche,
 * mit echtem Mailversand an Mailpit. Die Testfälle bauen aufeinander auf (test.describe.serial): Schlägt einer
 * fehl, werden die folgenden übersprungen. Jeder Lauf beginnt mit dem Zurücksetzen der Datenbank (TC-SZ-001).
 *
 * Aufruf: docker compose up -d db mailpit && npm run test:szenario
 */
const PASSWORD = '!2Mention2026';
const COMPANY = 'Humani';
const SLUG = 'humani';
const PROJECT = 'Humani – Testprozessbewertung 2026';
const METHOD = { methodModel: 'agile' as const, includeAi: true };

const ANTON = { name: 'Anton Admin', email: 'admin@humani.de' };
const DEPARTMENTS = [
  'Vertrieb',
  'Einkauf',
  'Produktion',
  'Projektmanagement',
  'Lager',
  'Logistik',
  'Rechnungswesen',
  'IT Abteilung',
  'Personalabteilung',
  'Geschäftsführung',
];

type Role = 'admin' | 'assessor' | 'respondent' | 'reader';
interface User {
  name: string;
  department: string;
  email: string;
  role: Role;
}
const ANABELL: User = {
  name: 'Anabell Assessor',
  department: 'Projektmanagement',
  email: 'assessor@humani.de',
  role: 'assessor',
};
const ERIC: User = {
  name: 'Eric Einkauf',
  department: 'Einkauf',
  email: 'befragter01@humani.de',
  role: 'respondent',
};
const VOLKER: User = {
  name: 'Volker Vertrieb',
  department: 'Vertrieb',
  email: 'befragter02@humani.de',
  role: 'respondent',
};
const PAOLA: User = {
  name: 'Paola Personal',
  department: 'Personalabteilung',
  email: 'leser@humani.de',
  role: 'reader',
};
/**
 * Vorgabe: admin@humani.de – die Adresse gehört aber schon Anton Admin, und jede Adresse gibt es nur einmal.
 * TC-SZ-005 prüft genau das (Fehlermeldung) und legt Ingrid dann mit admin02@humani.de an.
 */
const INGRID: User = {
  name: 'Ingrid IT Abteilung',
  department: 'IT Abteilung',
  email: 'admin02@humani.de',
  role: 'admin',
};
const USERS = [ANABELL, ERIC, VOLKER, PAOLA, INGRID];

/** Zuweisung: Die Anwendung weist Kernbereiche Abteilungen zu – Volker antwortet für den Vertrieb, Eric für den Einkauf. */
const VERTRIEB = { areas: ['KB01', 'KB02', 'KB03', 'KB04'], answer: 'yes' as const, label: 'Erfüllt' };
const EINKAUF = { areas: ['KB03', 'KB04', 'KB05', 'KB06'], answer: 'partial' as const, label: 'Teilweise' };
const BOTH = VERTRIEB.areas.filter((a) => EINKAUF.areas.includes(a));
const ALL_AREAS = [...new Set([...VERTRIEB.areas, ...EINKAUF.areas])];

const areaOf = (id: string) => catalog.keyAreas.find((k) => k.id === id)!;
/** Kontrollpunkte eines Kernbereichs im Umfang des Assessments (agiles Vorgehen, mit KI). */
const inScope = (id: string) =>
  areaOf(id).checkpoints.filter((cp) => checkpointInScope(cp, areaOf(id), METHOD));
const count = (areas: string[]) => areas.reduce((n, a) => n + inScope(a).length, 0);
/** Erwartete konsolidierte Antwort je Kernbereich (Vorschlag der Anwendung bei zwei Abteilungen). */
function consolidated(area: string): Answer {
  const given: Answer[] = [];
  if (VERTRIEB.areas.includes(area)) given.push(VERTRIEB.answer);
  if (EINKAUF.areas.includes(area)) given.push(EINKAUF.answer);
  return suggestConsolidated(given);
}

let asm = ''; // Assessment-ID, angelegt in TC-SZ-007

async function login(page: Page, user: { name: string; email: string }, role: Role) {
  await page.goto(`/login/${SLUG}`);
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('current-user')).toHaveText(user.name);
  // Die Kopfzeile zeigt nur den Namen – die Rolle kommt aus der Sitzung.
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.user?.role ?? me.role, `Rolle von ${user.name}`).toBe(role);
}
async function logout(page: Page) {
  await page.getByTestId('logout').click();
  await expect(page.getByTestId('login-card')).toBeVisible();
}

/** Neueste Mail an die Adresse mit passendem Betreff aus Mailpit (wartet auf die Zustellung). */
async function mailTo(request: APIRequestContext, to: string, subject: RegExp, since: number) {
  let text = '';
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query: `to:${to}` } });
        if (!res.ok()) return `Mailpit HTTP ${res.status()}`;
        const list = (await res.json()).messages as Array<{ ID: string; Created: string; Subject: string }>;
        const hit = list.find(
          (m) => subject.test(m.Subject) && new Date(m.Created).getTime() >= since - 2000,
        );
        if (!hit) return 'keine passende Mail';
        text = String((await (await request.get(`${MAILPIT_URL}/api/v1/message/${hit.ID}`)).json()).Text);
        return 'ok';
      },
      { message: `Mail an ${to} (${subject}) in Mailpit unter ${MAILPIT_URL}`, timeout: 30_000 },
    )
    .toBe('ok');
  return text;
}
const linkIn = (text: string, pattern: RegExp) => {
  const link = pattern.exec(text)?.[0];
  expect(link, `Link ${pattern} in der Mail`).toBeTruthy();
  return link!;
};

/** Befragte Person: Kernbereiche über den Fragebogen beantworten und die Abteilung abgeben. */
async function answerAndSubmit(page: Page, user: User, part: typeof VERTRIEB) {
  await login(page, user, 'respondent');
  await page.getByTestId('nav-assessments').click();
  await page.getByTestId(`assessment-row-${PROJECT}`).getByTestId('assessment-link').click();
  await page.getByTestId('to-questionnaire').click();
  const total = count(part.areas);
  await expect(page.getByTestId('own-progress')).toContainText(`0 von ${total}`);
  await expect(page.getByTestId('department-submit')).toBeDisabled();
  for (const area of part.areas) {
    await page.getByTestId(`area-link-${area}`).click();
    await expect(page.getByTestId('area-heading')).toContainText(area);
    for (const cp of inScope(area)) {
      const row = page.getByTestId(`cp-${cp.id}`);
      await row.getByTestId(`answer-${part.answer}`).click();
      await expect(row.getByTestId('save-state')).toContainText('✓ gespeichert');
    }
  }
  await expect(page.getByTestId('own-progress')).toContainText(`${total} von ${total}`);
  await expect(page.getByTestId('submit-open')).toHaveCount(0);
  await page.getByTestId('department-submit').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('submitted-info')).toBeVisible();
  await logout(page);
}

test.describe.serial('Szenario Humani', () => {
  test('TC-SZ-001 Alle Daten zurücksetzen (wie Doku „Anwendung zurücksetzen“) → Ersteinrichtung wieder möglich', async ({
    page,
    request,
  }) => {
    const db = new URL(DATABASE_URL).pathname.slice(1);
    expect(db, 'Sicherheitsnetz: nur eine Testdatenbank zurücksetzen').toMatch(/_e2e$/);
    // Schritt „Datenbank leeren“ der Doku …
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
    );
    await client.end();
    // … und „Migrationen und Stammdaten“ (npm run db:migrate), gegen die Szenario-Datenbank.
    const out = execFileSync('npm', ['run', 'db:migrate', '-w', '@ai-tpi/server'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL },
      encoding: 'utf8',
    });
    expect(out).toContain('OK');

    expect((await request.get('/api/setup/status')).status()).toBe(200);
    await page.goto('/einrichtung');
    await expect(page.getByTestId('setup-card')).toBeVisible();
    // Mailpit leeren, damit nur die Mails dieses Laufs gefunden werden.
    const mp = await request.delete(`${MAILPIT_URL}/api/v1/messages`).catch(() => null);
    expect(mp?.ok(), `Mailpit unter ${MAILPIT_URL} nicht erreichbar – docker compose up -d mailpit`).toBe(
      true,
    );
  });

  test('TC-SZ-002 Ersteinrichtung: Anton Admin, Firma Humani; danach als Admin angemeldet', async ({
    page,
  }) => {
    await page.goto('/einrichtung');
    await page.getByTestId('setup-company').fill(COMPANY);
    await expect(page.getByTestId('setup-slug')).toHaveValue(SLUG);
    await page.getByTestId('setup-industry').selectOption({ index: 1 });
    await page.getByTestId('setup-name').fill(ANTON.name);
    await page.getByTestId('setup-email').fill(ANTON.email);
    await page.getByTestId('pw-new-input').fill(PASSWORD);
    await page.getByTestId('pw-repeat-input').fill(PASSWORD);
    await page.getByTestId('setup-submit').click();
    // Nach der Ersteinrichtung ist Anton direkt angemeldet und im Admin-Bereich.
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByTestId('admin')).toBeVisible();
    await expect(page.getByTestId('current-user')).toHaveText(ANTON.name);
    await expect(page.getByTestId('nav-admin')).toBeVisible();
    await logout(page);
    await login(page, ANTON, 'admin');
    // Die Ersteinrichtung ist danach gesperrt.
    await page.goto('/einrichtung');
    await expect(page.getByTestId('setup-unavailable')).toBeVisible();
  });

  test('TC-SZ-003 Admin legt zehn Abteilungen an', async ({ page }) => {
    await login(page, ANTON, 'admin');
    await page.getByTestId('nav-admin').click();
    await page.getByTestId('admin-tab-departments').click();
    for (const name of DEPARTMENTS) {
      await page.getByTestId('department-name').fill(name);
      await page.getByTestId('department-create').click();
      await expect(page.getByTestId(`department-row-${name}`)).toBeVisible();
    }
    await expect(page.getByTestId('department-list').locator(':scope > li')).toHaveCount(DEPARTMENTS.length);
  });

  test('TC-SZ-004 Mailversand: interner SMTP-Server (Standard der Installation) ist eingestellt und stellt zu', async ({
    page,
    request,
  }) => {
    const since = Date.now();
    await login(page, ANTON, 'admin');
    await page.getByTestId('nav-admin').click();
    await page.getByTestId('admin-tab-mail').click();
    await expect(page.getByTestId('mail-transport-system')).toBeChecked();
    await expect(page.getByTestId('mail-transport-smtp')).not.toBeChecked();
    await page.getByTestId('mail-test').click();
    await expect(page.getByTestId('mail-notice')).toContainText(ANTON.email);
    await mailTo(request, ANTON.email, /Test-Mail/, since);
  });

  test('TC-SZ-005 Admin legt fünf Benutzer mit Rolle und Abteilung an; doppelte Adresse wird abgelehnt', async ({
    page,
  }) => {
    await login(page, ANTON, 'admin');
    await page.getByTestId('nav-admin').click();
    await page.getByTestId('admin-tab-users').click();
    const create = async (u: User, email: string) => {
      await page.getByTestId('user-name').fill(u.name);
      await page.getByTestId('user-email').fill(email);
      await page.getByTestId('user-role').selectOption(u.role);
      await page.getByTestId('user-department').selectOption({ label: u.department });
      await page.getByTestId('user-create').click();
    };
    for (const u of USERS) {
      if (u === INGRID) {
        // Vorgabe admin@humani.de ist bereits vergeben (Anton Admin) → Fehlermeldung, nichts angelegt
        await create(u, ANTON.email);
        await expect(page.getByTestId('admin-notice')).toContainText('bereits vergeben');
        await expect(page.getByTestId('user-list').locator(':scope > li')).toHaveCount(USERS.indexOf(u) + 1);
      }
      await create(u, u.email);
      const row = page.getByTestId(`user-row-${u.email}`);
      await expect(row).toContainText(u.name);
      await expect(row.getByTestId('user-department-name')).toHaveText(u.department);
      await expect(row.getByTestId('user-row-role')).toHaveValue(u.role);
      await expect(row.getByTestId('user-status')).toContainText('eingeladen');
    }
    await expect(page.getByTestId('user-list').locator(':scope > li')).toHaveCount(USERS.length + 1);
  });

  test('TC-SZ-006 Mailpit: Einladung öffnen, „Passwort vergessen“, Passwort über den Einmal-Link festlegen, anmelden', async ({
    page,
    request,
  }) => {
    for (const u of USERS) {
      // Einladung: Link zur Anmeldeseite der Firma
      const invite = await mailTo(request, u.email, /.+/, 0);
      await page.goto(linkIn(invite, /https?:\/\/\S+\/login\/humani\b/));
      await expect(page.getByTestId('login-card')).toBeVisible();
      // „Passwort vergessen“ → Mail mit Einmal-Link
      const since = Date.now();
      await page.getByTestId('login-forgot').click();
      await page.getByTestId('forgot-email').fill(u.email);
      await page.getByTestId('forgot-submit').click();
      await expect(page.getByTestId('forgot-confirmation')).toBeVisible();
      const reset = await mailTo(request, u.email, /Passwort/, since);
      await page.goto(linkIn(reset, /https?:\/\/\S+\/passwort-festlegen\?token=[A-Za-z0-9_-]+/));
      await page.getByTestId('pw-new-input').fill(PASSWORD);
      await page.getByTestId('pw-repeat-input').fill(PASSWORD);
      await page.getByTestId('password-save').click();
      await expect(page).toHaveURL(new RegExp(`/login/${SLUG}`));
      await login(page, u, u.role);
      await logout(page);
    }
  });

  test('TC-SZ-007 Assessorin: Assessment über alle 19 Kernbereiche, Team, Zuweisung Vertrieb KB01–04, Einkauf KB03–06', async ({
    page,
  }) => {
    await login(page, ANABELL, 'assessor');
    await page.getByTestId('nav-assessments').click();
    await page.getByTestId('assessment-new').click();
    await page.getByTestId('m-project').fill(PROJECT);
    await page.getByTestId('m-startDate').fill('2026-11-17');
    await page.getByTestId('m-methodModel').selectOption(METHOD.methodModel);
    await page.getByTestId('m-includeAi').check();
    await page.getByTestId('m-submit').click();
    await expect(page.getByTestId('assessment-title')).toContainText(PROJECT);
    asm = /\/assessments\/([0-9a-f-]{36})/.exec(page.url())![1]!;

    await page.getByTestId('atab-team').click();
    for (const u of [VOLKER, ERIC]) {
      const option = page.getByTestId('member-choose').locator('option', { hasText: u.name });
      await page.getByTestId('member-choose').selectOption((await option.getAttribute('value'))!);
      await page.getByTestId('member-add').click();
      await expect(page.getByTestId(`member-${u.email}`)).toBeVisible();
    }
    await expect(page.getByTestId('assignment-list').locator(':scope > li')).toHaveCount(19);
    for (const [department, part] of [
      ['Vertrieb', VERTRIEB],
      ['Einkauf', EINKAUF],
    ] as const)
      for (const area of part.areas) await page.getByTestId(`assign-${area}-${department}`).check();
    // Nach dem Neuladen ist die Zuweisung gespeichert.
    await page.reload();
    await page.getByTestId('atab-team').click();
    for (const area of ALL_AREAS) {
      await expect(page.getByTestId(`assign-${area}-Vertrieb`)).toBeChecked({
        checked: VERTRIEB.areas.includes(area),
      });
      await expect(page.getByTestId(`assign-${area}-Einkauf`)).toBeChecked({
        checked: EINKAUF.areas.includes(area),
      });
    }
    await logout(page);
  });

  test('TC-SZ-008 Befragter Vertrieb: KB01–04 mit „Erfüllt“ beantworten und abgeben', async ({ page }) => {
    await answerAndSubmit(page, VOLKER, VERTRIEB);
  });

  test('TC-SZ-009 Befragter Einkauf: KB03–06 mit „Teilweise“ beantworten und abgeben', async ({ page }) => {
    await answerAndSubmit(page, ERIC, EINKAUF);
  });

  test('TC-SZ-010 Zusammenführung der Rückmeldungen aus Vertrieb und Einkauf', async ({ page }) => {
    // Zusammenführen darf nur ein Assessor – Ingrid ist Admin (nur lesen), daher führt Anabell zusammen.
    await login(page, ANABELL, 'assessor');
    await page.goto(`/assessments/${asm}?tab=team`);
    await expect(page.getByTestId('submission-Vertrieb')).toContainText('abgegeben');
    await expect(page.getByTestId('submission-Einkauf')).toContainText('abgegeben');
    await page.getByTestId('atab-overview').click();
    await page.getByTestId('to-consolidation').click();
    for (const area of ALL_AREAS) {
      await page.goto(`/assessments/${asm}/zusammenfuehrung/${area}`);
      for (const cp of inScope(area)) {
        const item = page.getByTestId(`cons-${cp.id}`);
        if (VERTRIEB.areas.includes(area))
          await expect(item.getByTestId('cons-dep-Vertrieb')).toContainText(VERTRIEB.label);
        if (EINKAUF.areas.includes(area))
          await expect(item.getByTestId('cons-dep-Einkauf')).toContainText(EINKAUF.label);
        if (BOTH.includes(area)) {
          // Uneinig → Begründung ist Pflicht
          await expect(item.getByTestId('cons-disagree')).toBeVisible();
          await item.getByTestId('cons-save').click();
          await expect(item.getByTestId('cons-rationale-error')).toBeVisible();
          await item
            .getByTestId('cons-rationale')
            .fill('Vertrieb erfüllt, Einkauf erst teilweise – für das Unternehmen als „Teilweise“ gewertet.');
        }
        await expect(item.getByTestId('cons-value')).toHaveValue(consolidated(area));
        await item.getByTestId('cons-save').click();
        await expect(item.getByTestId('cons-done')).toBeVisible();
      }
      await expect(page.getByTestId('cons-progress')).toContainText(
        `${inScope(area).length} von ${inScope(area).length}`,
      );
    }
    await logout(page);

    // Ingrid (Admin, IT Abteilung) sieht die Zusammenführung, kann aber nichts ändern.
    await login(page, INGRID, 'admin');
    await page.goto(`/assessments/${asm}/zusammenfuehrung/KB03`);
    const first = page.getByTestId(`cons-${inScope('KB03')[0]!.id}`);
    await expect(first.getByTestId('cons-readonly')).toBeVisible();
    await expect(page.getByTestId('cons-save')).toHaveCount(0);
    await logout(page);
  });

  test('TC-SZ-011 Auswertung und Bericht der Rückmeldungen', async ({ page }) => {
    await login(page, ANABELL, 'assessor');
    await page.goto(`/assessments/${asm}`);
    await page.getByTestId('to-report').click();
    await expect(page.getByTestId('report-cover')).toContainText(PROJECT);
    await expect(page.getByTestId('cover-company')).toContainText(COMPANY);

    // Kennzahlen: Anzahl der konsolidierten Antworten je Wert
    const tally = { yes: 0, partial: 0 };
    for (const area of ALL_AREAS) tally[consolidated(area) as 'yes' | 'partial'] += inScope(area).length;
    await expect(page.getByTestId('tile-yes').locator('.tv')).toHaveText(String(tally.yes));
    await expect(page.getByTestId('tile-partial').locator('.tv')).toHaveText(String(tally.partial));
    await expect(page.getByTestId('tile-no').locator('.tv')).toHaveText('0');

    // Reifegrad je Kernbereich: berechnet mit derselben Regel wie die Anwendung, aus den konsolidierten Antworten
    const LEVEL_TEXT = {
      initial: 'Initial',
      controlled: 'Kontrolliert',
      efficient: 'Effizient',
      optimizing: 'Optimierend',
      na: 'n. a.',
    };
    for (const area of ALL_AREAS) {
      const level = achievedLevel(
        inScope(area).map((cp) => ({ level: cp.level, value: consolidated(area) })),
      );
      await expect(page.getByTestId(`level-${area}`)).toHaveText(LEVEL_TEXT[level]);
    }
    await expect(page.getByTestId('level-KB01')).toHaveText('Optimierend'); // nur „Erfüllt“
    await expect(page.getByTestId('level-KB05')).toHaveText('Initial'); // nur „Teilweise“
    // KB07 war niemandem zugewiesen: ohne Antworten ist keine Ebene erreicht
    const kb07 = achievedLevel(inScope('KB07').map((cp) => ({ level: cp.level, value: 'open' as Answer })));
    expect(kb07).toBe('initial');
    await expect(page.getByTestId('level-KB07')).toHaveText(LEVEL_TEXT[kb07]);
    await expect(page.getByTestId('report-matrix')).toBeVisible();
    await expect(page.getByTestId('report-radar')).toBeVisible();
    await expect(page.getByTestId('report-bars')).toBeVisible();
    await expect(page.getByTestId(`cell-${inScope('KB01')[0]!.id}`)).toHaveText('✔');
    // Konsenslücken: genau die Kontrollpunkte, bei denen Vertrieb und Einkauf uneinig waren (KB03, KB04)
    const gaps = BOTH.flatMap((a) => inScope(a));
    await expect(page.getByTestId('report-gaps').locator('tbody tr')).toHaveCount(gaps.length);
    const gap = page.getByTestId(`gap-${gaps[0]!.id}`);
    await expect(gap).toContainText(`Vertrieb: ${VERTRIEB.label}`);
    await expect(gap).toContainText(`Einkauf: ${EINKAUF.label}`);
    await expect(page.getByTestId(`gap-${inScope('KB05')[0]!.id}`)).toHaveCount(0);
    // Begründung der Zusammenführung steht im Anhang
    await expect(page.getByTestId(`appendix-${inScope('KB03')[0]!.id}`)).toContainText(
      'Einkauf erst teilweise',
    );
    await logout(page);
  });
});
