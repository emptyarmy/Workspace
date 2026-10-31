"use strict";

const form = document.getElementById("calc-form");
const feldZahl1 = document.getElementById("zahl1");
const feldZahl2 = document.getElementById("zahl2");
const feldErgebnis = document.getElementById("ergebnis");
const meldung = document.getElementById("meldung");

// Erlaubt: optionales Minus, Ziffern, optional Komma oder Punkt mit Nachkommastellen
const ZAHL_MUSTER = /^-?\d+([.,]\d+)?$/;

/**
 * Prüft eine Eingabe.
 * @param {string} wert
 * @returns {"leer" | "gueltig" | "ungueltig"}
 */
function pruefeEingabe(wert) {
  if (wert === "") return "leer";
  return ZAHL_MUSTER.test(wert) ? "gueltig" : "ungueltig";
}

/** @param {string} wert */
function inZahl(wert) {
  return Number(wert.replace(",", "."));
}

/** @param {number} zahl */
function formatiere(zahl) {
  return zahl.toLocaleString("de-DE", { maximumFractionDigits: 10 });
}

/**
 * @param {string} text
 * @param {"hinweis" | "fehler"} art
 */
function zeigeMeldung(text, art) {
  meldung.textContent = text;
  meldung.className = `meldung ${art}`;
  meldung.hidden = false;
}

function setzeZurueck() {
  meldung.hidden = true;
  meldung.textContent = "";
  feldZahl1.classList.remove("fehler");
  feldZahl2.classList.remove("fehler");
}

function addiere() {
  setzeZurueck();
  feldErgebnis.value = "";

  const eingabe1 = feldZahl1.value.trim();
  const eingabe2 = feldZahl2.value.trim();
  const status1 = pruefeEingabe(eingabe1);
  const status2 = pruefeEingabe(eingabe2);

  // 1. Ungültige Zeichen (Buchstaben, Sonderzeichen) abfangen
  const ungueltigeFelder = [];
  if (status1 === "ungueltig") {
    feldZahl1.classList.add("fehler");
    ungueltigeFelder.push("erste");
  }
  if (status2 === "ungueltig") {
    feldZahl2.classList.add("fehler");
    ungueltigeFelder.push("zweite");
  }
  if (ungueltigeFelder.length > 0) {
    const welche =
      ungueltigeFelder.length === 2 ? "Beide Eingaben enthalten" : `Die ${ungueltigeFelder[0]} Eingabe enthält`;
    zeigeMeldung(
      `${welche} Buchstaben oder Sonderzeichen. Bitte korrigieren Sie Ihre Eingabe ` +
        "und verwenden Sie nur Ziffern (z. B. 42, -3 oder 12,5).",
      "fehler"
    );
    (status1 === "ungueltig" ? feldZahl1 : feldZahl2).focus();
    return;
  }

  // 2. Keine Zahl eingegeben
  if (status1 === "leer" && status2 === "leer") {
    feldZahl1.classList.add("fehler");
    feldZahl2.classList.add("fehler");
    zeigeMeldung("Bitte geben Sie mindestens eine Zahl ein.", "fehler");
    feldZahl1.focus();
    return;
  }

  // 3. Nur eine Zahl eingegeben → diese Zahl als Ergebnis anzeigen
  if (status1 === "leer" || status2 === "leer") {
    const vorhandeneZahl = inZahl(status1 === "gueltig" ? eingabe1 : eingabe2);
    feldErgebnis.value = formatiere(vorhandeneZahl);
    zeigeMeldung(
      "Es wurde nur eine Zahl eingegeben. Als Ergebnis wird diese Zahl angezeigt. " +
        "Für eine Addition geben Sie bitte auch die zweite Zahl ein.",
      "hinweis"
    );
    return;
  }

  // 4. Beide Zahlen gültig → addieren (Rundung gleicht Gleitkommafehler wie 0,1 + 0,2 aus)
  const summe = Math.round((inZahl(eingabe1) + inZahl(eingabe2)) * 1e10) / 1e10;
  feldErgebnis.value = formatiere(summe);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addiere();
});
