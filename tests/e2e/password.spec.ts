import { expect, test } from '@playwright/test';
import { PasswordSetPage } from './pages/password-set.page';

/**
 * Passwortrichtlinie und Stärkeanzeige – docs/05_test/02_testfallkatalog.md, Abschnitt PWD.
 * Prüft nicht erfüllte, teilweise erfüllte und vollständig erfüllte Eingaben.
 */
type Row = {
  id: string;
  pw: string;
  rules: { minLength: boolean; digit: boolean; uppercase: boolean; special: boolean };
  strength: 'weak' | 'medium' | 'strong' | null;
  saveEnabled: boolean;
};
const R = (minLength: boolean, digit: boolean, uppercase: boolean, special: boolean) => ({
  minLength,
  digit,
  uppercase,
  special,
});

const rows: Row[] = [
  { id: 'TC-PWD-001', pw: '', rules: R(false, false, false, false), strength: null, saveEnabled: false },
  { id: 'TC-PWD-002', pw: 'abc', rules: R(false, false, false, false), strength: 'weak', saveEnabled: false },
  {
    id: 'TC-PWD-003',
    pw: 'abcdef',
    rules: R(true, false, false, false),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-004',
    pw: 'abcde1',
    rules: R(true, true, false, false),
    strength: 'weak',
    saveEnabled: false,
  },
  { id: 'TC-PWD-005', pw: 'Abcde1', rules: R(true, true, true, false), strength: 'weak', saveEnabled: false },
  { id: 'TC-PWD-006', pw: 'Ab1!', rules: R(false, true, true, true), strength: 'weak', saveEnabled: false },
  {
    id: 'TC-PWD-007',
    pw: 'ABCDEF!',
    rules: R(true, false, true, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-008',
    pw: 'abcdef1!',
    rules: R(true, true, false, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-009',
    pw: 'Passw0rt!',
    rules: R(true, true, true, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-010',
    pw: 'Qwertz1!',
    rules: R(true, true, true, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-016',
    pw: 'Hallo123!',
    rules: R(true, true, true, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-017',
    pw: 'Sommer2026!',
    rules: R(true, true, true, true),
    strength: 'weak',
    saveEnabled: false,
  },
  {
    id: 'TC-PWD-015',
    pw: 'Kaffee7Mond!',
    rules: R(true, true, true, true),
    strength: 'medium',
    saveEnabled: true,
  },
  {
    id: 'TC-PWD-012',
    pw: 'Tisch7&Laterne',
    rules: R(true, true, true, true),
    strength: 'strong',
    saveEnabled: true,
  },
  {
    id: 'TC-PWD-013',
    pw: 'vK8#qLz2!mWr9$Tb',
    rules: R(true, true, true, true),
    strength: 'strong',
    saveEnabled: true,
  },
  {
    id: 'TC-PWD-014',
    pw: 'Äpfel9§Birne',
    rules: R(true, true, true, true),
    strength: 'strong',
    saveEnabled: true,
  },
];

test.describe('Passwortregeln und Stärke', () => {
  for (const row of rows) {
    test(`${row.id} „${row.pw || '(leer)'}“ → ${row.saveEnabled ? 'akzeptiert' : 'abgewiesen'}`, async ({
      page,
    }) => {
      const p = new PasswordSetPage(page);
      await p.goto();
      await p.input.fill(row.pw);
      await p.repeat.fill(row.pw);
      await p.expectRules(row.rules);
      if (row.strength) await expect(p.strength).toHaveAttribute('data-level', row.strength);
      else await expect(p.strength).toHaveCount(0);
      if (row.saveEnabled) await expect(p.save).toBeEnabled();
      else await expect(p.save).toBeDisabled();
    });
  }

  test('TC-PWD-020 alle Regeln sind vor der ersten Eingabe sichtbar, keine ist grün', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await expect(p.rules.getByRole('listitem')).toHaveCount(4);
    await expect(p.rules.locator('[data-met="true"]')).toHaveCount(0);
    await expect(p.rule('minLength')).toContainText('Mindestens 6 Zeichen');
  });

  test('TC-PWD-021 schrittweise Eingabe macht Regeln nacheinander grün (Teilerfüllung)', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await p.input.pressSequentially('A');
    await p.expectRules(R(false, false, true, false));
    await p.input.pressSequentially('1');
    await p.expectRules(R(false, true, true, false));
    await p.input.pressSequentially('!');
    await p.expectRules(R(false, true, true, true));
    await p.input.pressSequentially('xyz');
    await p.expectRules(R(true, true, true, true));
    await expect(p.rule('minLength')).toHaveCSS('color', /rgb\(30, 122, 60\)|rgb\(92, 194, 126\)/);
  });

  test('TC-PWD-022 erfüllte Regel wird wieder verletzt → nicht mehr grün, Speichern inaktiv', async ({
    page,
  }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await p.input.fill('Tisch7&Laterne');
    await p.repeat.fill('Tisch&Laterne');
    await p.input.fill('Tisch&Laterne');
    await p.expectRules(R(true, false, true, true));
    await expect(p.save).toBeDisabled();
  });

  test('TC-PWD-023 abweichende Wiederholung → Hinweis, Speichern inaktiv', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await p.input.fill('Tisch7&Laterne');
    await p.repeat.fill('Tisch7&Laterna');
    await expect(page.getByTestId('pw-mismatch')).toBeVisible();
    await expect(p.save).toBeDisabled();
  });

  test('Regeln erfüllt, aber zu schwach → Hinweis auf Originalität (N-09)', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await p.input.fill('Passw0rt!');
    await expect(page.getByTestId('password-too-weak')).toBeVisible();
  });

  test('TC-PWD-026 Sichtbarkeits-Umschalter wechselt password ↔ text', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await expect(p.input).toHaveAttribute('type', 'password');
    await page.getByTestId('pw-new-toggle').click();
    await expect(p.input).toHaveAttribute('type', 'text');
    await page.getByTestId('pw-new-toggle').click();
    await expect(p.input).toHaveAttribute('type', 'password');
  });

  test('TC-PWD-027 Regelliste ist eine aria-live-Region', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto();
    await expect(p.rules).toHaveAttribute('aria-live', 'polite');
  });

  test('Link ohne Token → Hinweis, Speichern inaktiv (negativ)', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto(null);
    await expect(page.getByTestId('password-missing-token')).toBeVisible();
    await p.input.fill('Tisch7&Laterne');
    await p.repeat.fill('Tisch7&Laterne');
    await expect(p.save).toBeDisabled();
  });

  test('TC-RST-008 manipulierter Token → Hinweis „Link abgelaufen oder verwendet“', async ({ page }) => {
    const p = new PasswordSetPage(page);
    await p.goto('erfundenes-token-' + 'x'.repeat(20));
    await p.input.fill('Tisch7&Laterne');
    await p.repeat.fill('Tisch7&Laterne');
    const [req] = await Promise.all([page.waitForRequest('**/api/auth/password'), p.save.click()]);
    expect(req.postDataJSON()).toMatchObject({
      password: 'Tisch7&Laterne',
      passwordRepeat: 'Tisch7&Laterne',
    });
    await expect(page.getByTestId('password-message')).toContainText('abgelaufen');
  });

  test('TC-PWD-029 Regeln und Stärke bleiben auf Mobilgeräten sichtbar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'nur Mobilprofile');
    const p = new PasswordSetPage(page);
    await p.goto();
    await p.input.fill('Kaffee7Mond!');
    await p.rules.scrollIntoViewIfNeeded();
    await expect(p.rules).toBeInViewport();
    await expect(p.strength).toBeVisible();
  });
});

test('TC-PWD-024 Umgehung der Oberfläche: Server weist schwaches Passwort ab', async ({ request }) => {
  const res = await request.post('/api/auth/password', {
    headers: { 'x-requested-with': 'ai-tpi' },
    data: { token: 'a'.repeat(32), password: 'abc', passwordRepeat: 'abc' },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('password_policy');
});
