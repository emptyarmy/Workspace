import { expect, test as setup } from '@playwright/test';
import { ADMIN_STATE, E2E } from './helpers';

/**
 * Läuft einmal vor allen Projekten auf frischer Datenbank:
 * Ersteinrichtung über die Oberfläche (TC-SET-001) – der erste Nutzer über localhost wird Admin.
 */
setup('TC-SET-001 Ersteinrichtung: erster Nutzer über localhost wird Admin', async ({ page }) => {
  await page.goto('/einrichtung');
  await expect(page.getByTestId('setup-card')).toBeVisible();
  await page.getByTestId('setup-company').fill(E2E.companyName);
  // Kürzel wird aus dem Firmennamen vorgeschlagen und hier überschrieben
  await expect(page.getByTestId('setup-slug')).toHaveValue('e2e-prueffirma-gmbh');
  await page.getByTestId('setup-slug').fill(E2E.slug);
  await page.getByTestId('setup-industry').selectOption('ITS');
  await page.getByTestId('setup-name').fill(E2E.adminName);
  await page.getByTestId('setup-email').fill(E2E.adminEmail);

  // Negativ: zu schwaches Passwort → Abschließen nicht möglich
  await page.getByTestId('pw-new-input').fill('Passw0rt!');
  await page.getByTestId('pw-repeat-input').fill('Passw0rt!');
  await expect(page.getByTestId('setup-submit')).toBeDisabled();

  await page.getByTestId('pw-new-input').fill(E2E.adminPassword);
  await page.getByTestId('pw-repeat-input').fill(E2E.adminPassword);
  await page.getByTestId('setup-submit').click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId('current-user')).toHaveText(E2E.adminName);
  await page.context().storageState({ path: ADMIN_STATE });
});
