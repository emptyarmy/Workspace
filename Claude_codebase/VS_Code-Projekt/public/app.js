"use strict";

const form = document.getElementById("calc-form");
const feldZahl1 = document.getElementById("zahl1");
const feldZahl2 = document.getElementById("zahl2");
const feldErgebnis = document.getElementById("ergebnis");
const meldung = document.getElementById("meldung");

// Tape-related elements
const createTapeButton = document.getElementById("create-tape");
const deleteTapeButton = document.getElementById("delete-tape");
const tapeList = document.getElementById("tape-list");
const tapeTotal = document.getElementById("tape-total");
const tapeAverage = document.getElementById("tape-average");

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

// --- Rechnungen (Tapes) über die REST-API ---

const API_BASIS = "http://localhost:3000";

/**
 * @param {string} pfad
 * @param {string} methode
 * @param {unknown} [body]
 */
async function apiAnfrage(pfad, methode, body) {
  const optionen = { method: methode, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) optionen.body = JSON.stringify(body);

  const antwort = await fetch(`${API_BASIS}${pfad}`, optionen);
  const daten = await antwort.json();
  if (!antwort.ok) throw new Error(daten.error || `HTTP ${antwort.status}`);
  return daten;
}

/** Angelegte Rechnungen in Anzeigereihenfolge: { id, name } */
const rechnungen = [];
let naechsteRechnungsNummer = 1;

function ausgewaehlteTapeId() {
  return tapeList.value ? Number(tapeList.value) : null;
}

function zeichneTapeListe(auswahlId) {
  tapeList.innerHTML = "";
  tapeList.add(new Option("Auswahl", ""));
  for (const rechnung of rechnungen) {
    tapeList.add(new Option(rechnung.name, String(rechnung.id)));
  }
  tapeList.value = auswahlId ? String(auswahlId) : "";
}

/** Summe und Durchschnitt über alle Rechnungen, die bereits einen Wert haben. */
async function aktualisiereGesamtwerte() {
  let summe = 0;
  let anzahl = 0;
  for (const rechnung of rechnungen) {
    const tape = await apiAnfrage(`/v1/tapes/${rechnung.id}`, "GET");
    if (tape.count > 0) {
      summe += tape.sum;
      anzahl++;
    }
  }

  if (anzahl === 0) {
    tapeTotal.value = "";
    tapeAverage.value = "";
    return;
  }
  tapeTotal.value = formatiere(Math.round(summe * 1e10) / 1e10);
  tapeAverage.value = formatiere(Math.round((summe / anzahl) * 1e10) / 1e10);
}

async function erstelleTape() {
  try {
    const { id } = await apiAnfrage("/v1/tapes", "POST", {});
    rechnungen.push({ id, name: `Rechnung ${naechsteRechnungsNummer++}` });
    zeichneTapeListe(id);
    zeigeMeldung(`${rechnungen.at(-1).name} wurde erstellt.`, "hinweis");
  } catch (fehler) {
    zeigeMeldung(`Fehler beim Erstellen der Rechnung: ${fehler.message}`, "fehler");
  }
}

async function loescheTape() {
  const id = ausgewaehlteTapeId();
  if (!id) {
    zeigeMeldung("Bitte wählen Sie eine Rechnung zum Löschen aus.", "fehler");
    return;
  }

  try {
    await apiAnfrage(`/v1/tapes/${id}`, "DELETE");
    const index = rechnungen.findIndex((rechnung) => rechnung.id === id);
    const [geloescht] = rechnungen.splice(index, 1);
    zeichneTapeListe(null);
    await aktualisiereGesamtwerte();
    zeigeMeldung(`${geloescht.name} wurde gelöscht.`, "hinweis");
  } catch (fehler) {
    zeigeMeldung(`Fehler beim Löschen der Rechnung: ${fehler.message}`, "fehler");
  }
}

/**
 * Setzt das Ergebnis als (einzigen) Wert der ausgewählten Rechnung.
 * @param {number} wert
 */
async function setzeWertFuerRechnung(wert) {
  const id = ausgewaehlteTapeId();
  if (!id) return;

  try {
    await apiAnfrage(`/v1/tapes/${id}/entries`, "DELETE");
    await apiAnfrage(`/v1/tapes/${id}/entries`, "POST", [wert]);
    await aktualisiereGesamtwerte();
  } catch (fehler) {
    zeigeMeldung(`Fehler beim Speichern in der Rechnung: ${fehler.message}`, "fehler");
  }
}

async function addiere() {
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
    await setzeWertFuerRechnung(vorhandeneZahl);
    return;
  }

  // 4. Beide Zahlen gültig → addieren (Rundung gleicht Gleitkommafehler wie 0,1 + 0,2 aus)
  const summe = Math.round((inZahl(eingabe1) + inZahl(eingabe2)) * 1e10) / 1e10;
  feldErgebnis.value = formatiere(summe);
  await setzeWertFuerRechnung(summe);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addiere();
});

createTapeButton.addEventListener("click", erstelleTape);
deleteTapeButton.addEventListener("click", loescheTape);
