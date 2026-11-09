# Analyse der Quelldokumente

Stand: 08.11.2026 – Ergebnis der Erstprüfung der drei gelieferten Dateien (Kopien in `docs/_quellen/`).

## 1. Überblick

| Datei | Inhalt | Sprache | Modell |
|---|---|---|---|
| `Testmanagement_und_KVP.docx` | Einleitung KVP/TPI NEXT®, Kontrollpunkte je Kernbereich und Ebene inkl. BRUNATA-Einschätzungen; danach Kapitel zu Funktionstest, DoR/DoD, Ishikawa, ABC-Analyse, KVP-Ablauf sowie **fachfremde Kapitel zu SAP-Materialstammdaten** | DE | **TPI NEXT®** (Ebenen Kontrolliert/Effizient/Optimierend) |
| `AgileTPI_Tool_2_5xls.xls` | Excel-Werkzeug (schreibgeschützt verschlüsselt, Standardpasswort) mit 6 Blättern und VBA-Makros | EN | **Agile TPI** (Sichten P/T/O, Cluster A–G) |
| `Agile_Test_Practice_Improvement_2.4.doc` | Methodenbeschreibung Agile TPI V2.4 (März 2017, Sogeti), Verbesserungsstrategie mit Clustern, Hinweise zu Tester-Skills | EN | Agile TPI |

## 2. Zentrale Befunde

### B-01 – Deutsche und englische Fragen sind **nicht** dieselben ⚠️
Die Annahme „gleiche Fragen auf Englisch in der Excel-Tabelle“ trifft nicht zu:

| Merkmal | Word (DE) | Excel (EN) |
|---|---|---|
| Modell | TPI NEXT® (klassisch) | Agile TPI (für Scrum adaptiert) |
| Gliederung je Kernbereich | Ebenen Kontrolliert / Effizient / Optimierend | Sichten Individuum (P) / Team (T) / Organisation (O) |
| Priorisierung | – | Cluster A–G je Kontrollpunkt |
| Anzahl Kontrollpunkte | ca. 148 gefunden (Dokument nennt 157) | 108 |
| Formulierung | z. B. „Der Auftraggeber ist definiert …“ | z. B. „The Product Owner is familiar with …“ |

→ Es gibt **kein 1:1-Mapping**. Für eine zweisprachige App muss **ein** führendes Modell gewählt und die andere Sprache übersetzt werden (siehe offene Frage F-01).

### B-02 – 16 statt 14 Kernbereiche ⚠️
Beide Quellen verwenden **16 Kernbereiche**. In der Anforderung ist von 14 die Rede. Mögliche Erklärungen: zwei Bereiche sollen bewusst entfallen, oder Zählfehler (F-03).

| Nr. | Kernbereich (DE, Word) | Key area (EN, Excel) | KP DE | KP EN |
|---|---|---|---|---|
| 1 | Engagement der Stakeholder | Stakeholder commitment | 10 | 7 |
| 2 | Grad der Beteiligung | Degree of involvement | ⚠️ unvollständig (≈5) | 7 |
| 3 | Teststrategie | Test strategy | 9 | 9 |
| 4 | Testorganisation | Test organization | 11 | 8 |
| 5 | Kommunikation | Communication | 9 | 5 |
| 6 | Berichterstattung | Reporting | 8 | 7 |
| 7 | Testprozessmanagement | Test process management | 9 | 8 |
| 8 | Kostenschätzung und Planung | Estimating and planning | 11 | 5 |
| 9 | Metriken | Metrics | 9 | 4 |
| 10 | Fehlermanagement | Defect management | 11 | 9 |
| 11 | Testwaremanagement | Testware management | 10 | 6 |
| 12 | Methodisches Vorgehen | Methodology practice | 9 | 6 |
| 13 | Professionalität der Tester | Tester professionalism | 11 | 7 |
| 14 | Testfalldesign | Test case design | 10 | 7 |
| 15 | Testwerkzeuge | Test tools | 10 | 6 |
| 16 | Testumgebung | Test environment | 11 | 7 |

(Zählung DE automatisiert aus dem Text; Abweichungen ±1 möglich.)

### B-03 – Lücken und Fehler im deutschen Dokument
- **Kernbereich 2 „Grad der Beteiligung“**: Überschrift und Ebene KONTROLLIERT fehlen; die Kontrollpunkte der Ebene EFFIZIENT hängen unter „Teststrategie“ (vermutlich Copy-&-Paste-Verlust).
- Bei mehreren Bereichen fehlt der Text der Ebene INITIAL (z. B. Metriken).
- Uneinheitliche Ebenenbezeichnungen: „Optimierend“ / „optimiert“ / „OPTIMIEREND“, „effizient“ / „EFFIZIENT“.
- Tippfehler (z. B. „Entwicklungsprojket“, „BRUNTA“, „einen einfache“, „noch noch“) und Platzhalter „Fehler! Es wurde kein Dateiname angegeben.“ (fehlende Grafiken).
- Projektspezifische Bewertungstexte (BRUNATA, Projekt B2B, Partner DSC/NTT Data, Tool aqua) sind mit dem generischen Katalog vermischt.
- Ab Abschnitt „SAP Materialstammdaten“ fachfremder Inhalt → für die App irrelevant.

→ Der deutsche Katalog muss vor dem Import **bereinigt** werden (Arbeitspaket AP-2.1).

### B-04 – Excel-Werkzeug: Funktionsumfang (Vorlage für den Bericht)
| Blatt | Funktion | Übernahme in App |
|---|---|---|
| Guidelines | Bedienungsanleitung | Hilfe-/Onboarding-Seite |
| Information | Stammdaten: Projekt, Assessor, Domäne, Subdomäne, Firma, Abteilung, Hauptstakeholder, Kontakt, Messung, Art des Assessments, Start/Ende, Anzahl Interviews, Scope | Formular „Assessment anlegen“ |
| All checkpoints | KP mit Seq.-Nr., Cluster, Text, Erfüllt? (Y / N / NA), Notizen | Fragebogen |
| Test maturity matrix | Matrix KB × (P/T/O), Zellen farbig grün/rot/grau, Klick zeigt Text + Notiz | **Reifegradmatrix** (interaktiv) |
| graphData (versteckt) | Prozent erfüllt je KB; Summen Y/NA/N gesamt und je Sicht | Berechnungslogik |
| baseData (versteckt) | Stammdaten | Katalog-JSON |
| Diagramme | Balken (Gesamt, P, T, O absolut) + Netzdiagramm (% je KB) | Charts |

VBA-Makros: Farbgebung der Matrixzellen beim Aktivieren des Blatts, Anzeige des ausgewählten KP inkl. Notiz – rein darstellungsbezogen, keine komplexe Logik. Vollständig in JavaScript ersetzbar.

### B-05 – Verbesserungslogik aus Agile TPI (Basis für Empfehlungen)
Die Methode beschreibt eine **stufenweise Verbesserung über Cluster A → G**: Erst alle KP aus Cluster A erfüllen, dann B usw. Zusätzlich werden Kernbereiche nach ihrem Beitrag zur Agilität gewichtet und Abhängigkeiten zwischen KP berücksichtigt. Diese Logik eignet sich hervorragend als **regelbasierte Grundlage** für Handlungsempfehlungen; die KI-Komponente kann darauf aufsetzen (siehe `04_architektur/05_ki-empfehlungen.md`).

### B-06 – Keine KI-Aspekte
Keine Quelle berücksichtigt KI-gestützte Anforderungsprüfung, Testfallgenerierung, Testautomatisierung, Code-Assistenten, Dokumentationsgenerierung, KI-Governance oder den Test KI-basierter Systeme. → Erweiterung siehe `03_fragenkatalog/02_ki-erweiterung.md`.

## 3. Empfehlung zum Vorgehen

> **Entschieden (F-01):** TPI NEXT® führend, agile Teile ergänzt – siehe ADR-001 und `03_fragenkatalog/04_agile-ergaenzung.md`.

1. **Führendes Modell: TPI NEXT®-Ebenen** (entspricht der Anforderung „INITIAL, KONTROLLIERT, EFFIZIENT, OPTIMIEREND“), deutsche KP bereinigen, englische Fassung **übersetzen** (bei Bedarf mit Abgleich gegen die englische Originalliteratur).
2. Die **Agile-TPI-Informationen** (Sicht P/T/O, Cluster) als **optionale Zusatzattribute** je KP nutzen, wo eine sinnvolle Zuordnung möglich ist → ermöglicht die Matrix- und Balkendarstellung wie im Excel und eine Priorisierung.
3. Alternativ (F-01): Zwei Modelle wählbar machen (TPI NEXT klassisch / Agile TPI). Höherer Aufwand.
