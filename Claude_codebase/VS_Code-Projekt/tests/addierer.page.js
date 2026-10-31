// Page Object: kapselt die Elemente der Seite, damit die Tests lesbar bleiben.
import { expect } from "@playwright/test";

export class AddiererSeite {
  /** @param {import("@playwright/test").Page} page */
  constructor(page) {
    this.page = page;
    this.ueberschrift = page.getByRole("heading", { level: 1 });
    this.zahl1 = page.getByLabel("Erste Zahl");
    this.zahl2 = page.getByLabel("Zweite Zahl");
    this.button = page.getByRole("button", { name: "Addiere" });
    this.ergebnis = page.getByLabel("Ergebnis");
    this.meldung = page.locator("#meldung");
  }

  async oeffnen() {
    await this.page.goto("/");
  }

  /**
   * Füllt beide Felder (leerer String = Feld bleibt leer) und klickt auf „Addiere“.
   * @param {string} wert1
   * @param {string} wert2
   */
  async addiere(wert1, wert2) {
    await this.zahl1.fill(wert1);
    await this.zahl2.fill(wert2);
    await this.button.click();
  }

  async erwarteKeineMeldung() {
    await expect(this.meldung).toBeHidden();
  }

  /** @param {RegExp | string} text */
  async erwarteHinweis(text) {
    await expect(this.meldung).toBeVisible();
    await expect(this.meldung).toHaveClass(/hinweis/);
    await expect(this.meldung).toContainText(text);
  }

  /** @param {RegExp | string} text */
  async erwarteFehler(text) {
    await expect(this.meldung).toBeVisible();
    await expect(this.meldung).toHaveClass(/fehler/);
    await expect(this.meldung).toContainText(text);
  }
}
