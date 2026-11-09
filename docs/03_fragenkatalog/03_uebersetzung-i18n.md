# Übersetzung und Mehrsprachigkeit (i18n)

## Grundsätze
- Unterstützte Sprachen: **Deutsch (Standard)** und **Englisch**; Architektur offen für weitere Sprachen.
- Sprachwahl in der Kopfzeile, jederzeit umschaltbar, **ohne Datenverlust** und ohne Neuladen.
- Initiale Sprache: gespeicherte Nutzerwahl → Browsersprache → Deutsch.
- Antworten und Kommentare werden **sprachneutral** gespeichert (KP-ID + Antwortwert); Kommentare bleiben in der Sprache, in der sie geschrieben wurden.
- Bericht und Export in der aktuell gewählten Sprache; optional zweisprachig (F-14).

## Terminologie (verbindlich)

| DE | EN |
|---|---|
| Kernbereich | Key area |
| Kontrollpunkt | Checkpoint |
| Reifegrad | Maturity level |
| Initial / Kontrolliert / Effizient / Optimierend | Initial / Controlled / Efficient / Optimizing |
| Erfüllt / Teilweise / Nicht erfüllt / Nicht anwendbar | Fulfilled / Partially / Not fulfilled / Not applicable |
| Handlungsempfehlung | Recommendation |
| kurzfristig / langfristig | short-term / long-term |
| Auftraggeber | Principal / Product Owner (agil) |

## Qualitätssicherung
- Automatischer Test: Alle Schlüssel in `de.json` existieren in `en.json` und umgekehrt.
- Playwright: Sprachumschaltung prüft repräsentative Texte und die Datenerhaltung.
- Übersetzung der Kontrollpunkte: KI-Vorübersetzung + fachliche Prüfung durch eine zweisprachige Person (F-15).
