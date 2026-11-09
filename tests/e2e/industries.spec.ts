import { expect, test } from '@playwright/test';
import { ADMIN_STATE } from './helpers';

/**
 * Branchenliste im Admin-Bereich pflegen (Reiter „Branchen“).
 * Tests legen eigene Branchen mit zufälligem Code an; Standardbranchen werden in der Oberfläche nicht umbenannt,
 * weil alle Geräteprofile parallel auf derselben Datenbank laufen (Umbenennen ist im Integrationstest geprüft).
 */
test.use({ storageState: ADMIN_STATE });

const randomCode = () =>
  `Q${Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')}`;

test('TC-ADM-048/049/051/053 Branche anlegen, suchen, umbenennen, deaktivieren, löschen; in der Firmenauswahl verfügbar', async ({
  page,
}) => {
  const code = randomCode();
  await page.goto('/admin?tab=industries');
  await expect(page.getByTestId('industry-row-ITS').getByTestId('industry-standard')).toBeVisible();
  await expect(page.getByTestId('industry-row-ITS').getByTestId('industry-delete')).toHaveCount(0);

  await page.getByTestId('industry-code').fill(code.toLowerCase());
  await page.getByTestId('industry-name-de').fill(`Testbranche ${code}`);
  await page.getByTestId('industry-name-en').fill(`Test industry ${code}`);
  await page.getByTestId('industry-nace').fill('J 63');
  await page.getByTestId('industry-create').click();
  await expect(page.getByTestId('industry-notice')).toContainText(`Branche ${code} hinzugefügt`);

  await page.getByTestId('industry-search').fill(code);
  await expect(page.getByTestId('industry-count')).toContainText('1 von');
  const row = page.getByTestId(`industry-row-${code}`);
  await expect(row).toContainText(`Testbranche ${code}`);
  await expect(row).toContainText('NACE J 63');
  await expect(row.getByTestId('industry-custom')).toBeVisible();

  // In der Firmenauswahl (Meine Firma) auswählbar
  await page.goto('/admin?tab=company');
  await expect(page.getByTestId('company-industry').locator(`option[value="${code}"]`)).toHaveCount(1);

  // umbenennen
  await page.goto('/admin?tab=industries');
  await page.getByTestId('industry-search').fill(code);
  await row.getByTestId('industry-edit').click();
  await row.getByTestId('industry-edit-de').fill(`Geänderte Branche ${code}`);
  await row.getByTestId('industry-save').click();
  await expect(page.getByTestId('industry-notice')).toContainText('Gespeichert');
  await expect(row).toContainText(`Geänderte Branche ${code}`);

  // deaktivieren → nicht mehr auswählbar
  await row.getByTestId('industry-toggle').click();
  await expect(row.getByTestId('industry-inactive')).toBeVisible();
  await page.goto('/admin?tab=company');
  await expect(page.getByTestId('company-industry').locator(`option[value="${code}"]`)).toHaveCount(0);

  // löschen mit Bestätigung (Abbrechen ändert nichts)
  await page.goto('/admin?tab=industries');
  await page.getByTestId('industry-search').fill(code);
  await row.getByTestId('industry-delete').click();
  await page.getByTestId('confirm-cancel').click();
  await expect(row).toBeVisible();
  await row.getByTestId('industry-delete').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('industry-notice')).toContainText(`Branche ${code} gelöscht`);
  await expect(row).toHaveCount(0);
});

test('TC-ADM-050/052 negativ: ungültiger Code, fehlende Bezeichnungen, vergebener Code/Name, verwendete Branche nicht deaktivierbar', async ({
  page,
}) => {
  await page.goto('/admin?tab=industries');
  await page.getByTestId('industry-code').fill('1X');
  await page.getByTestId('industry-create').click();
  await expect(page.getByTestId('industry-code-error')).toBeVisible();
  await expect(page.getByTestId('industry-name-de-error')).toBeVisible();
  await expect(page.getByTestId('industry-name-en-error')).toBeVisible();

  await page.getByTestId('industry-code').fill('ITS');
  await page.getByTestId('industry-name-de').fill(`Doppelt ${randomCode()}`);
  await page.getByTestId('industry-name-en').fill(`Duplicate ${randomCode()}`);
  await page.getByTestId('industry-create').click();
  await expect(page.getByTestId('industry-notice')).toContainText('Code ist bereits vergeben');

  await page.getByTestId('industry-code').fill(randomCode());
  await page.getByTestId('industry-name-de').fill('versicherungen');
  await page.getByTestId('industry-create').click();
  await expect(page.getByTestId('industry-notice')).toContainText('deutschen Bezeichnung gibt es bereits');

  // Branche der eigenen Firma ist markiert und kann nicht deaktiviert werden
  const own = page.locator('[data-testid^="industry-row-"]', { has: page.getByTestId('industry-own') });
  await expect(own).toHaveCount(1);
  await own.getByTestId('industry-toggle').click();
  await expect(page.getByTestId('industry-notice')).toContainText('mindestens einer Firma zugeordnet');
  await expect(own.getByTestId('industry-inactive')).toHaveCount(0);
});
