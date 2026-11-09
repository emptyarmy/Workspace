import { expect, test } from '@playwright/test';
import { ADMIN_STATE } from './helpers';

test.describe('Sprache (I18N)', () => {
  test('TC-I18N-001 Umschalten DE → EN übersetzt Oberfläche', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anmelden');
    await page.getByTestId('lang-en').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('TC-I18N-002 Eingaben bleiben beim Sprachwechsel erhalten', async ({ page }) => {
    await page.goto('/passwort-festlegen?token=' + 'a'.repeat(32));
    await page.getByTestId('pw-new-input').fill('Abc1');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('pw-new-input')).toHaveValue('Abc1');
    await expect(page.getByTestId('rule-minLength')).toContainText('At least 6 characters');
    await expect(page.getByTestId('rule-digit')).toHaveAttribute('data-met', 'true');
  });

  test('TC-I18N-003 gewählte Sprache bleibt nach Neuladen erhalten', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('lang-en').click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
  });

  test.describe('Browsersprache Englisch', () => {
    test.use({ locale: 'en-GB' });
    test('Browsersprache en → englische Oberfläche', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in');
    });
  });

  test.describe('Browsersprache nicht unterstützt', () => {
    test.use({ locale: 'fr-FR' });
    test('TC-I18N-004 Browsersprache fr → Fallback Deutsch (negativ)', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anmelden');
    });
  });

  test.describe('angemeldet', () => {
    test.use({ storageState: ADMIN_STATE });
    test('Kernbereiche erscheinen in der gewählten Sprache (Katalog)', async ({ page }) => {
      await page.goto('/start');
      await expect(page.getByTestId('area-KB17')).toContainText('KI-Governance');
      await page.getByTestId('lang-en').click();
      await expect(page.getByTestId('area-KB17')).toContainText('AI governance');
      await expect(page.getByTestId('key-area-list').getByRole('listitem')).toHaveCount(19);
    });
  });
});

test.describe('Responsive (RWD)', () => {
  for (const path of [
    '/login',
    '/passwort-festlegen?token=' + 'a'.repeat(32),
    '/passwort-vergessen',
    '/start',
  ]) {
    test(`TC-RWD-001 kein horizontales Scrollen auf ${path.split('?')[0]}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('TC-RWD-002 Bedienelemente sind mindestens 44 px groß (Touch)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'nur Mobilprofile');
    await page.goto('/login');
    for (const id of ['login-email', 'login-password', 'login-submit', 'lang-de', 'lang-en']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.height, id).toBeGreaterThanOrEqual(44);
    }
  });

  test.describe('angemeldet', () => {
    test.use({ storageState: ADMIN_STATE });
    for (const path of ['/start', '/admin']) {
      test(`TC-RWD-001 kein horizontales Scrollen auf ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });

  test.describe('sehr schmaler Bildschirm', () => {
    test.use({ viewport: { width: 320, height: 640 } });
    test('TC-RWD-004 320 px: nichts abgeschnitten, Formular vollständig bedienbar', async ({ page }) => {
      await page.goto('/login');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      for (const id of ['login-email', 'login-password', 'login-submit', 'login-forgot']) {
        await expect(page.getByTestId(id)).toBeVisible();
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(320);
      }
    });
  });
});
