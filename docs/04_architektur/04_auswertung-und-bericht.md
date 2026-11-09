# Auswertung und Bericht

Ziel: mindestens funktionsgleich zum Excel-Blatt „Test maturity matrix“, optisch moderner und um KI-Index sowie Empfehlungen erweitert.

## 1. Gliederung des Berichts (Vorschlag, siehe F-20)

1. **Deckblatt** – **Firmenlogo**, Firma, Branche, Projekt, Assessor, beteiligte Abteilungen, Zeitraum, Katalogversion
2. **Management Summary** – Gesamtreifegrad, KI-Index, Top-3-Stärken, Top-3-Handlungsfelder (KI-formuliert, gekennzeichnet)
3. **Kennzahlen-Kacheln** – Fortschritt, erfüllt / teilweise / nicht erfüllt / n. a.
4. **Reifegradmatrix** – KB × Ebene (K/E/O), Zelle je KP farbig; Tippen zeigt Text + Kommentare + Quelle
5. **Netzdiagramm** – Erfüllungsgrad % je KB (Ist; optional Vorjahr/Soll als zweite Linie)
6. **Balkendiagramm** – absolute Zahlen gesamt und je Ebene (bzw. Sicht P/T/O, wie Excel)
7. **Ebenen-Treppe** – erreichte Ebene je KB als Stufendiagramm
8. **KI-Reifegrad** – eigener Radar für KB17–19 und AI-Tags
8a. **Benchmark** – Radar eigene Firma / Branche / alle Firmen, Tabelle je Kernbereich mit Median, Quartil und Abweichung (siehe `08_mandanten-und-benchmark.md`)
8b. **Konsenslücken** – Kontrollpunkte, bei denen die Abteilungen unterschiedlich geantwortet haben
9. **Handlungsempfehlungen** – kurzfristig / langfristig, priorisiert
10. **Anhang** – alle KP mit Antwort und Kommentaren (wie Blatt „All checkpoints“), Methodik, Glossar

## 2. Farb- und Statuslogik (aus Excel übernommen, erweitert)

| Status | Excel | App |
|---|---|---|
| erfüllt | grün | grün + ✔ |
| teilweise | – | gelb + ◐ |
| nicht erfüllt | rot | rot + ✖ |
| nicht anwendbar | grau | grau schraffiert + – |
| nicht bewertet | ungefärbt | weiß mit gestricheltem Rahmen |

## 3. Exporte
- PDF über optimiertes Druck-Stylesheet (A4 quer für Matrix).
- JSON (vollständig, re-importierbar).
- Release 2: Excel (Blätter analog bisherigem Tool), CSV der Empfehlungen.
