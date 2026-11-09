# Vision und Ziele

## Ausgangslage

Der Reifegrad des Testprozesses wird im jährlichen Zyklus durch Befragung der Teilprojekte und weiterer Testbeteiligter ermittelt (Quelle: *Testmanagement und KVP*). Bisher geschieht das mit einem Word-Dokument (deutsche Kontrollpunkte nach TPI NEXT®) und einem Excel-Werkzeug mit VBA-Makros (Agile TPI Tool 2.5, englisch). Beides ist schwer zu teilen, nicht mobil nutzbar, ohne Versionierung der Antworten und ohne systematische Ableitung von Maßnahmen. Der Einsatz von KI in Entwicklung und QS wird in keinem der Modelle berücksichtigt.

## Vision

> Jede Fachbereichsperson kann – nach Anmeldung und parallel zu Kollegen aus anderen Abteilungen – den Testprozess ihres Projekts in 30–60 Minuten auf dem Laptop, Tablet oder Smartphone bewerten, Belege und Kommentare mit Quellenangabe hinterlegen und erhält sofort einen ansprechenden Bericht mit priorisierten, KI-gestützten Handlungsempfehlungen – kurzfristig umsetzbar und langfristig planbar.

## Ziele (messbar)

| ID | Ziel | Messgröße |
|---|---|---|
| Z-01 | Vollständige digitale Erfassung aller Kontrollpunkte in 19 Kernbereichen (TPI NEXT + Agile + KI) | 100 % der Kontrollpunkte im Katalog-JSON |
| Z-02 | Zweisprachigkeit DE/EN | 0 fehlende Übersetzungsschlüssel (automatisch geprüft) |
| Z-03 | Bedienbarkeit auf allen Zielgeräten | Alle Playwright-Tests grün auf 6 Geräteprofilen |
| Z-04 | Bericht gleichwertig oder besser als das Excel-Tool | Reifegradmatrix, Netzdiagramm, Balkendiagramm, Kommentaranzeige vorhanden |
| Z-05 | Handlungsempfehlungen | Je Bewertung mind. Empfehlungen in den Kategorien „kurzfristig“ und „langfristig“ |
| Z-06 | Qualität | Jede UI-Funktion mit ≥ 1 Positiv- und ≥ 1 Negativtest |

## Nicht-Ziele (vorerst)

- Kein Ersatz eines vollwertigen Testmanagement-Tools (z. B. aqua).
- Kein SSO in Release 1 (architektonisch vorbereitet).
- Keine Zertifizierungsaussage nach TPI NEXT® – das Ergebnis ist eine Selbsteinschätzung.

## Zielgruppen

| Rolle | Nutzung |
|---|---|
| Fachbereich / Teilprojekt | beantwortet Kontrollpunkte, kommentiert |
| Testmanager / Assessor | moderiert Interviews, konsolidiert, erstellt Bericht |
| Projekt-/Programmleitung | liest Bericht, entscheidet über Maßnahmen |
| Administrator | verwaltet Benutzer, Abteilungen, Logo, KI-Konfiguration |
