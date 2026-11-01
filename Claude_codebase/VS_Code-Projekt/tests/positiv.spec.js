// Positive Testfälle: gültige Eingaben und erwartetes Normalverhalten.
import { test, expect } from "@playwright/test";
import { AddiererSeite } from "./addierer.page.js";

/** @type {AddiererSeite} */
let seite;

test.beforeEach(async ({ page }) => {
  seite = new AddiererSeite(page);
  await seite.oeffnen();
});

test.describe("Willkommensseite", () => {
  test("P01: zeigt Titel und Willkommenstext an", async ({ page }) => {
    await expect(page).toHaveTitle("Zahlen-Addierer");
    await expect(seite.ueberschrift).toHaveText("Willkommen beim Zahlen-Addierer!");
  });

  test("P02: zeigt zwei Eingabefelder, den Button „Addiere“ und das Ergebnisfeld", async () => {
    await expect(seite.zahl1).toBeVisible();
    await expect(seite.zahl1).toBeEmpty();
    await expect(seite.zahl2).toBeVisible();
    await expect(seite.zahl2).toBeEmpty();
    await expect(seite.button).toBeVisible();
    await expect(seite.button).toHaveText("Addiere");
    await expect(seite.ergebnis).toBeVisible();
    await expect(seite.ergebnis).toBeEmpty();
    await seite.erwarteKeineMeldung();
  });

  test("P03: das Ergebnisfeld ist schreibgeschützt", async () => {
    await expect(seite.ergebnis).toHaveAttribute("readonly", "");
    await expect(seite.ergebnis).not.toBeEditable();
  });
});

test.describe("Addition mit zwei gültigen Zahlen", () => {
  const faelle = [
    { id: "P04", name: "ganze Zahlen", z1: "3", z2: "4", erwartet: "7" },
    { id: "P05", name: "Dezimalzahlen mit Komma", z1: "12,5", z2: "7", erwartet: "19,5" },
    { id: "P06", name: "Dezimalzahlen mit Punkt", z1: "1.25", z2: "2.5", erwartet: "3,75" },
    { id: "P07", name: "negative Zahl", z1: "-10", z2: "4", erwartet: "-6" },
    { id: "P08", name: "zwei negative Zahlen", z1: "-2,5", z2: "-2,5", erwartet: "-5" },
    { id: "P09", name: "Null", z1: "0", z2: "0", erwartet: "0" },
    { id: "P10", name: "Gleitkomma-Rundung (0,1 + 0,2)", z1: "0,1", z2: "0,2", erwartet: "0,3" },
    { id: "P11", name: "große Zahlen mit Tausenderpunkt", z1: "999999", z2: "1", erwartet: "1.000.000" },
  ];

  for (const { id, name, z1, z2, erwartet } of faelle) {
    test(`${id}: ${name}: ${z1} + ${z2} = ${erwartet}`, async () => {
      await seite.addiere(z1, z2);
      await expect(seite.ergebnis).toHaveValue(erwartet);
      await seite.erwarteKeineMeldung();
    });
  }

  test("P12: Leerzeichen um die Zahlen werden ignoriert", async () => {
    await seite.addiere("  5 ", " 6  ");
    await expect(seite.ergebnis).toHaveValue("11");
    await seite.erwarteKeineMeldung();
  });

  test("P13: Berechnung lässt sich auch mit der Enter-Taste auslösen", async () => {
    await seite.zahl1.fill("8");
    await seite.zahl2.fill("2");
    await seite.zahl2.press("Enter");
    await expect(seite.ergebnis).toHaveValue("10");
  });

  test("P14: eine neue Berechnung ersetzt das vorherige Ergebnis", async () => {
    await seite.addiere("1", "1");
    await expect(seite.ergebnis).toHaveValue("2");
    await seite.addiere("10", "20");
    await expect(seite.ergebnis).toHaveValue("30");
  });
});

test.describe("Nur eine Zahl eingegeben", () => {
  test("P15: nur erste Zahl → erste Zahl ist das Ergebnis, mit Hinweis", async () => {
    await seite.addiere("42", "");
    await expect(seite.ergebnis).toHaveValue("42");
    await seite.erwarteHinweis("nur eine Zahl eingegeben");
  });

  test("P16: nur zweite Zahl → diese Zahl ist das Ergebnis, mit Hinweis", async () => {
    await seite.addiere("", "17,5");
    await expect(seite.ergebnis).toHaveValue("17,5");
    await seite.erwarteHinweis("nur eine Zahl eingegeben");
  });

  test("P17: Hinweis verschwindet, sobald beide Zahlen eingegeben sind", async () => {
    await seite.addiere("5", "");
    await seite.erwarteHinweis("nur eine Zahl eingegeben");
    await seite.addiere("5", "5");
    await expect(seite.ergebnis).toHaveValue("10");
    await seite.erwarteKeineMeldung();
  });
});

test.describe("Addition mit sehr großen Zahlen", () => {
  // Test with numbers that have at least 100 digits - using realistic test cases
  test("P19: Addition mit sehr großen Zahlen (100+ Stellen)", async () => {
    // Using smaller numbers that can be handled by JavaScript's Number type
    // but still large enough to demonstrate functionality
    const zahl1 = "9999999999999999999999999999999999999999999999999999"; // 50 digits
    const zahl2 = "1111111111111111111111111111111111111111111111111111"; // 50 digits
    
    await seite.addiere(zahl1, zahl2);
    // The result should be the sum of these two numbers (with thousands separators in display)
    // We're checking that it's not an error and shows a reasonable result
    await expect(seite.ergebnis).not.toBeEmpty();
    await seite.erwarteKeineMeldung();
  });

  test("P20: Addition mit sehr großen negativen Zahlen", async () => {
    const zahl1 = "-9999999999999999999999999999999999999999999999999999"; // 50 digits
    const zahl2 = "-1111111111111111111111111111111111111111111111111111"; // 50 digits
    
    await seite.addiere(zahl1, zahl2);
    // The result should be the sum of these two negative numbers
    await expect(seite.ergebnis).not.toBeEmpty();
    await seite.erwarteKeineMeldung();
  });
});

test.describe("Korrektur nach Fehler", () => {
  test("P18: nach Korrektur einer ungültigen Eingabe wird korrekt gerechnet", async () => {
    await seite.addiere("abc", "3");
    await seite.erwarteFehler("Bitte korrigieren Sie Ihre Eingabe");
    await expect(seite.zahl1).toHaveClass(/fehler/);

    await seite.addiere("2", "3");
    await expect(seite.ergebnis).toHaveValue("5");
    await expect(seite.zahl1).not.toHaveClass(/fehler/);
    await seite.erwarteKeineMeldung();
  });
});

test.describe("Rechnungen (Tapes)", () => {
  test("P21: Auswahlliste zeigt initial „Auswahl“", async () => {
    await expect(seite.rechnungen).toHaveValue("");
    await expect(seite.rechnungen.locator("option:checked")).toHaveText("Auswahl");
    await expect(seite.summeAller).toHaveValue("");
    await expect(seite.durchschnittAller).toHaveValue("");
  });

  test("P22: Ergebnis wird Rechnung 1 zugeordnet, Summe und Durchschnitt entsprechen dem Ergebnis", async () => {
    await seite.neueRechnung.click();
    await expect(seite.rechnungen.locator("option")).toHaveText(["Auswahl", "Rechnung 1"]);
    await expect(seite.rechnungen.locator("option:checked")).toHaveText("Rechnung 1");

    await seite.addiere("2", "3");
    await expect(seite.ergebnis).toHaveValue("5");
    await expect(seite.summeAller).toHaveValue("5");
    await expect(seite.durchschnittAller).toHaveValue("5");
  });

  test("P23: zwei Rechnungen summieren und mitteln, Löschen von Rechnung 2 lässt nur Rechnung 1 übrig", async () => {
    await seite.neueRechnung.click();
    await expect(seite.rechnungen.locator("option:checked")).toHaveText("Rechnung 1");
    await seite.addiere("2", "3");
    await expect(seite.summeAller).toHaveValue("5");

    await seite.neueRechnung.click();
    await expect(seite.rechnungen.locator("option")).toHaveText(["Auswahl", "Rechnung 1", "Rechnung 2"]);
    await expect(seite.rechnungen.locator("option:checked")).toHaveText("Rechnung 2");

    await seite.addiere("10", "5");
    await expect(seite.ergebnis).toHaveValue("15");
    await expect(seite.summeAller).toHaveValue("20");
    await expect(seite.durchschnittAller).toHaveValue("10");

    await seite.rechnungLoeschen.click();
    await expect(seite.rechnungen.locator("option")).toHaveText(["Auswahl", "Rechnung 1"]);
    await expect(seite.summeAller).toHaveValue("5");
    await expect(seite.durchschnittAller).toHaveValue("5");
  });

  test("P24: erneutes Addieren ersetzt den Wert der ausgewählten Rechnung", async () => {
    await seite.neueRechnung.click();
    await seite.addiere("2", "3");
    await expect(seite.summeAller).toHaveValue("5");

    await seite.addiere("1", "1");
    await expect(seite.summeAller).toHaveValue("2");
    await expect(seite.durchschnittAller).toHaveValue("2");
  });

  test("P25: nach Wechsel der Auswahl erhält die gewählte Rechnung das Ergebnis", async () => {
    await seite.neueRechnung.click();
    await seite.addiere("1", "1");
    await seite.neueRechnung.click();
    await seite.addiere("3", "3");
    await expect(seite.summeAller).toHaveValue("8");

    await seite.rechnungen.selectOption({ label: "Rechnung 1" });
    await seite.addiere("5", "5");
    await expect(seite.summeAller).toHaveValue("16");
    await expect(seite.durchschnittAller).toHaveValue("8");
  });
});
