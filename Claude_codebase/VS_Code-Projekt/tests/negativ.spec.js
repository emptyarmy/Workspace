// Negative Testfälle: ungültige oder fehlende Eingaben müssen abgefangen werden.
import { test, expect } from "@playwright/test";
import { AddiererSeite } from "./addierer.page.js";

/** @type {AddiererSeite} */
let seite;

test.beforeEach(async ({ page }) => {
  seite = new AddiererSeite(page);
  await seite.oeffnen();
});

test.describe("Ungültige Zeichen im ersten Feld", () => {
  const eingaben = [
    { id: "N01", name: "Buchstaben", wert: "abc" },
    { id: "N02", name: "Zahl mit Buchstabe", wert: "12a" },
    { id: "N03", name: "Sonderzeichen", wert: "#$%" },
    { id: "N04", name: "Zahl mit Sonderzeichen", wert: "5€" },
    { id: "N05", name: "Rechenausdruck", wert: "2+3" },
    { id: "N06", name: "mehrere Dezimaltrennzeichen", wert: "1,2,3" },
    { id: "N07", name: "doppeltes Minus", wert: "--5" },
    { id: "N08", name: "Trennzeichen ohne Nachkommastelle", wert: "5," },
    { id: "N09", name: "Leerzeichen innerhalb der Zahl", wert: "1 000" },
    { id: "N10", name: "wissenschaftliche Schreibweise", wert: "1e3" },
  ];

  for (const { id, name, wert } of eingaben) {
    test(`${id}: ${name} („${wert}“) wird abgelehnt`, async () => {
      await seite.addiere(wert, "3");
      await seite.erwarteFehler("Die erste Eingabe enthält Buchstaben oder Sonderzeichen");
      await seite.erwarteFehler("Bitte korrigieren Sie Ihre Eingabe");
      await expect(seite.zahl1).toHaveClass(/fehler/);
      await expect(seite.zahl2).not.toHaveClass(/fehler/);
      await expect(seite.ergebnis).toBeEmpty();
      await expect(seite.zahl1).toBeFocused();
    });
  }
});

test.describe("Ungültige Zeichen im zweiten oder in beiden Feldern", () => {
  test("N11: Buchstaben im zweiten Feld werden abgelehnt", async () => {
    await seite.addiere("3", "xyz");
    await seite.erwarteFehler("Die zweite Eingabe enthält Buchstaben oder Sonderzeichen");
    await expect(seite.zahl2).toHaveClass(/fehler/);
    await expect(seite.zahl1).not.toHaveClass(/fehler/);
    await expect(seite.ergebnis).toBeEmpty();
    await expect(seite.zahl2).toBeFocused();
  });

  test("N12: ungültige Eingaben in beiden Feldern werden abgelehnt", async () => {
    await seite.addiere("a", "!");
    await seite.erwarteFehler("Beide Eingaben enthalten Buchstaben oder Sonderzeichen");
    await expect(seite.zahl1).toHaveClass(/fehler/);
    await expect(seite.zahl2).toHaveClass(/fehler/);
    await expect(seite.ergebnis).toBeEmpty();
  });

  test("N13: ungültige Eingabe neben leerem Feld zeigt Fehler statt Hinweis", async () => {
    await seite.addiere("abc", "");
    await seite.erwarteFehler("Bitte korrigieren Sie Ihre Eingabe");
    await expect(seite.ergebnis).toBeEmpty();
  });

  test("N14: altes Ergebnis wird bei ungültiger Eingabe gelöscht", async () => {
    await seite.addiere("2", "2");
    await expect(seite.ergebnis).toHaveValue("4");
    await seite.addiere("2", "zwei");
    await expect(seite.ergebnis).toBeEmpty();
    await seite.erwarteFehler("Bitte korrigieren Sie Ihre Eingabe");
  });
});

test.describe("Fehlende Eingaben", () => {
  test("N15: beide Felder leer → Fehlermeldung", async () => {
    await seite.addiere("", "");
    await seite.erwarteFehler("Bitte geben Sie mindestens eine Zahl ein.");
    await expect(seite.zahl1).toHaveClass(/fehler/);
    await expect(seite.zahl2).toHaveClass(/fehler/);
    await expect(seite.ergebnis).toBeEmpty();
  });

  test("N16: nur Leerzeichen in beiden Feldern → Fehlermeldung", async () => {
    await seite.addiere("   ", "   ");
    await seite.erwarteFehler("Bitte geben Sie mindestens eine Zahl ein.");
    await expect(seite.ergebnis).toBeEmpty();
  });
});

test.describe("Schreibschutz des Ergebnisfelds", () => {
  test("N17: Tastatureingaben im Ergebnisfeld werden ignoriert", async () => {
    await seite.addiere("1", "2");
    await seite.ergebnis.click();
    await seite.page.keyboard.type("999");
    await expect(seite.ergebnis).toHaveValue("3");
  });
});
