# UI/UX und Responsive Design

## 1. Seiten / Views

| View | Inhalt |
|---|---|
| Login | Firmenlogo (über `/login/<kürzel>`), E-Mail, Passwort, „Passwort vergessen?“, Sprachwahl |
| Passwort ändern | Pflichtdialog nach Erstanmeldung; Regel-Checkliste (live grün) + Stärkebalken 3 Stufen |
| Start | „Meine Assessments“, „Meine Kernbereiche“, „Neu“ (Assessor), Sprachwahl, Benutzermenü |
| Ersteinrichtung | nur bei leerer DB: Registrierung des ersten Admins (nur über localhost erreichbar) |
| Passwort festlegen | Ziel des Einmal-Links: Regelliste + Stärkebalken |
| Zusammenführung | Vergleichsansicht je KP (Assessor), Vorschlag, Begründung |
| Admin | Reiter: Benutzer, Firmen (Logo, Branche), Abteilungen, Branchen, KI, Passwortrichtlinie, E-Mail, **Änderungshistorie** (alle Rollen), Audit-Log |
| Stammdaten | Formular analog Excel „Information“, Auswahl Kernbereiche im Scope |
| Quellen/Autoren | Pflege der Auswahlliste für Kommentare |
| Fragebogen | Navigation Kernbereiche → Ebenen → Kontrollpunkt-Karten |
| Bericht | Kennzahlen, Reifegradmatrix, Netzdiagramm, Balken, KI-Index, Zusammenfassung |
| Empfehlungen | Spalten „Kurzfristig (< 1 Monat)“ und „Langfristig (≥ 1 Monat)“, Maßnahmenplan |
| Einstellungen | KI-Anbindung, Gewichtung „Teilweise“, Theme |
| Hilfe | Einführung (ersetzt „Guidelines“) |

## 2. Layout je Gerät

| Element | Laptop ≥ 1024 px | Tablet 600–1023 px | Mobil < 600 px |
|---|---|---|---|
| Navigation Kernbereiche | feste Seitenleiste links mit Fortschrittsringen | einklappbare Seitenleiste | Auswahlliste/Drawer oben + Wischen zwischen KB |
| Kontrollpunkt | Karte mit Antwort-Buttons in einer Zeile | wie Laptop | Karte, Antwort-Buttons als 2×2-Raster, große Touch-Ziele |
| Kommentare | Seitenpanel rechts | Dialog | Vollbild-Sheet von unten |
| Reifegradmatrix | vollständige Tabelle | horizontal scrollbar, erste Spalte fixiert | je KB eine Zeile mit Ebenen-Badges, Tippen öffnet Details |
| Diagramme | nebeneinander | untereinander | untereinander, Tabellenalternative |

## 3. Interaktionsprinzipien
- Ein-Klick-Antworten, sofortiges Autospeichern mit dezentem Hinweis „gespeichert“.
- Statusfarben immer zusätzlich mit Symbol/Text (Farbenblindheit).
- Bestätigungsdialog für destruktive Aktionen (Löschen, Import überschreibt).
- Sticky-Header mit Sprachumschalter und Fortschritt.
- Safe-Area-Unterstützung für iPhone (Notch/Home-Indicator).

## 4. Wireframe Fragebogen (Mobil)

```
┌──────────────────────────────┐
│ ☰  AI_TPI        DE|EN   62% │
├──────────────────────────────┤
│ ◀ KB03 Teststrategie (5/9) ▶ │
│ ── KONTROLLIERT ──────────── │
│ ┌──────────────────────────┐ │
│ │ KB03.K.02            ⓘ  │ │
│ │ Die Teststrategie basiert│ │
│ │ auf einer Produktrisiko- │ │
│ │ analyse.                 │ │
│ │ [✔ Erfüllt ][◐ Teilweise]│ │
│ │ [✖ Nein    ][– n. a.   ] │ │
│ │ 💬 2 Kommentare  + Neu   │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## 5. Wireframe Passwort ändern (Mobil)

```
┌──────────────────────────────┐
│          [ FIRMENLOGO ]      │
│  Bitte neues Passwort setzen │
│  Neues Passwort        [👁]  │
│  [ ••••••••            ]     │
│  Stärke: ██████░░░  mittel   │
│  ✔ Mindestens 6 Zeichen      │  ← grün
│  ✔ Mindestens eine Zahl      │  ← grün
│  ○ Mindestens ein Großbuchst.│  ← grau
│  ✔ Mindestens ein Sonderz.   │  ← grün
│  Passwort wiederholen  [👁]  │
│  [ ••••••••            ]     │
│  [   Speichern (inaktiv)   ] │
└──────────────────────────────┘
```
