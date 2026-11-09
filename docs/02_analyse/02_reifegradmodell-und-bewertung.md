# Reifegradmodell und Bewertungslogik (Entwurf)

## 1. Ebenen

| Code | DE | EN | Bedeutung |
|---|---|---|---|
| I | INITIAL | Initial | Ad-hoc, keine Kontrollpunkte – Ausgangszustand |
| K | KONTROLLIERT | Controlled | Grundlegend geregelter Prozess |
| E | EFFIZIENT | Efficient | Ressourcenschonend, an Stakeholder angepasst |
| O | OPTIMIEREND | Optimizing | Kontinuierliche, selbstlernende Verbesserung |

## 2. Antwortskala je Kontrollpunkt (Vorschlag, siehe F-05)

| Wert | DE | EN | Excel-Äquivalent | Farbe |
|---|---|---|---|---|
| `yes` | Erfüllt | Fulfilled | Y | grün |
| `partial` | Teilweise erfüllt | Partially | – (neu, optional) | gelb |
| `no` | Nicht erfüllt | Not fulfilled | N | rot |
| `na` | Nicht anwendbar | Not applicable | NA | grau, schraffiert |
| `open` | Nicht bewertet | Not assessed | (leer) | grau |

## 3. Berechnungsregeln

### 3.1 Erreichte Ebene je Kernbereich (TPI-NEXT-Regel)
Eine Ebene gilt als erreicht, wenn **alle** anwendbaren KP dieser Ebene **und aller darunter liegenden** Ebenen `yes` sind. `na` zählt als neutral (wird aus der Grundgesamtheit entfernt). `partial` zählt **nicht** als erfüllt.

```
erreichteEbene(KB) = höchste Ebene L, für die gilt:
  ∀ KP ∈ KB mit KP.level ≤ L und KP.answer ≠ na : KP.answer = yes
sonst INITIAL
```

### 3.2 Erfüllungsgrad (Prozent) – wie Excel „graphData“
```
erfuellung(KB) = (#yes + 0,5 · #partial) / (#KP − #na) · 100
```
Gewicht für `partial` konfigurierbar (Standard 0,5). Gleiche Formel aggregiert für Ebene, Sicht (P/T/O), KI-Tag und Gesamt.

### 3.3 Fortschritt der Erfassung
```
fortschritt = (#KP − #open) / #KP
```

### 3.4 Gesamtreifegrad (Vorschlag)
Mehrere Varianten zur Auswahl (F-06):
- **A – Minimum:** Gesamtebene = niedrigste erreichte Ebene über alle KB (streng).
- **B – Median:** Median der KB-Ebenen.
- **C – Gewichteter Index 0–100:** gewichteter Mittelwert der Erfüllungsgrade, Gewichte je KB konfigurierbar (Agile TPI nennt unterschiedliche Bedeutung je KB).

## 4. Konsolidierung mehrerer Befragter
Werden mehrere Personen befragt (Interviews), wird je KP:
- jede Einzelantwort mit Autor gespeichert,
- eine **konsolidierte Antwort** durch den Assessor festgelegt (Vorschlag: Mehrheitswert, manuell übersteuerbar),
- Abweichungen zwischen Befragten im Bericht hervorgehoben (Indikator für Kommunikationsprobleme).

**Entschieden (N-03):** Die Abteilungen antworten separat, der Assessor führt zusammen. Die Wertung basiert auf der konsolidierten Antwort. Details: `03_zusammenfuehrung-und-historie.md`.

## 5. Vergleich über die Zeit
Da das Assessment jährlich stattfindet, sollen zwei Assessments desselben Projekts vergleichbar sein (Delta je KB, Trendpfeile). Voraussetzung: stabile KP-IDs und Katalogversionierung (`catalogVersion`).

## 6. Agile Attribute (F-01)
- Jede Kennzahl kann zusätzlich nach **Sicht** (P/T/O) ausgewertet werden – wie die Balken im Excel-Tool (gesamt, Professional, Team, Organization).
- Der **Cluster** (A–G) beeinflusst nicht die Ebenenwertung, sondern nur die Priorisierung der Empfehlungen.
- Filter „klassisch“: Kontrollpunkte mit Tag `agile` werden aus Grundgesamtheit und Wertung entfernt.
