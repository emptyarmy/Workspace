# KI-Erweiterung des Fragenkatalogs (Entwurf v0.1)

> Status: **in den Katalog v1.0 (Entwurf) übernommen** und ins Englische übersetzt (`packages/catalog/catalog.v1.json`); fachliche Prüfung ausstehend (AP-2.7, F-10). Texte zunächst nur auf Deutsch; die englische Fassung wird nach Freigabe erstellt.
> Spalte **Aufw.** = geschätzter Umsetzungsaufwand, wenn der Kontrollpunkt *nicht* erfüllt ist: **S** < 1 Monat (kurzfristig), **M** 1–3 Monate, **L** > 3 Monate (beide langfristig). Dieses Attribut steuert später die Einordnung der Handlungsempfehlungen.

## 1. Begründung und Abgrenzung

Der KI-Einsatz wirkt in zwei Richtungen:
1. **Querschnittlich** – KI verändert bestehende Tätigkeiten (Teststrategie, Testfalldesign, Werkzeuge, Fehlermanagement …). → **Ergänzung bestehender Kernbereiche** um KI-Kontrollpunkte (Tag `AI`).
2. **Eigenständig** – Governance, Kompetenz, KI-gestützte Anforderungsprüfung, Entwicklung und Dokumentation sind im TPI-Modell nicht abgebildet. → **Neue Kernbereiche 17–19** (Gesamtmodell: 19 Kernbereiche, Entscheidung F-03).

Orientierung an: EU AI Act (u. a. Pflicht zur KI-Kompetenz der Mitarbeitenden), DSGVO, ISO/IEC 42001 (KI-Managementsystem), ISTQB-Lehrpläne CT-AI und CT-GenAI.

## 2. Neue Kernbereiche

### KB17 – KI-Governance, Ethik und Kompetenz
*Initial:* KI wird ad hoc und individuell genutzt; es gibt keine Regeln.

| ID | Ebene | Kontrollpunkt | Aufw. |
|---|---|---|---|
| KB17.K.01 | K | Es existiert eine schriftliche KI-Richtlinie, die zulässige KI-Werkzeuge und zulässige Datenklassen festlegt. | M |
| KB17.K.02 | K | Eine verantwortliche Person/Rolle für den KI-Einsatz in Entwicklung und QS ist benannt und bekannt. | S |
| KB17.K.03 | K | Vertrauliche und personenbezogene Daten (z. B. Produktionsdaten, Kundendaten) werden nachweislich nicht in nicht freigegebene KI-Dienste eingegeben. | S |
| KB17.K.04 | K | Alle Mitarbeitenden, die KI nutzen, haben eine Grundschulung zu Chancen, Grenzen und Risiken (KI-Kompetenz) erhalten. | M |
| KB17.E.01 | E | Für jedes KI-erzeugte Arbeitsergebnis (Testfall, Code, Dokument, Bericht) ist eine menschliche Prüfung und Freigabe (Human-in-the-Loop) definiert. | S |
| KB17.E.02 | E | KI-erzeugte Artefakte sind gekennzeichnet und nachvollziehbar (Werkzeug, Modellversion, Datum, ggf. Prompt). | M |
| KB17.E.03 | E | Jeder KI-Anwendungsfall wird vor Einführung hinsichtlich Risiko, Datenschutz und regulatorischer Einstufung bewertet. | M |
| KB17.E.04 | E | Lizenz- und Urheberrechtsfragen KI-generierten Codes und Inhalts sind geregelt. | M |
| KB17.O.01 | O | Eingesetzte KI-Werkzeuge und Modelle werden regelmäßig hinsichtlich Nutzen, Qualität, Kosten und Risiken neu bewertet. | M |
| KB17.O.02 | O | Eine gemeinsame, gepflegte Bibliothek bewährter Prompts, Vorlagen und Lessons Learned steht allen Teams zur Verfügung. | S |
| KB17.O.03 | O | Der wirtschaftliche Nutzen des KI-Einsatzes (z. B. Zeitersparnis vs. Lizenz-/Nutzungskosten) wird gemessen und berichtet. | L |

### KB18 – KI-gestützte Anforderungsanalyse und -prüfung
*Initial:* Anforderungen werden ausschließlich manuell geprüft.

| ID | Ebene | Kontrollpunkt | Aufw. |
|---|---|---|---|
| KB18.K.01 | K | Anforderungen/User Stories liegen in einem zentralen, digital auswertbaren Werkzeug vor. | M |
| KB18.K.02 | K | KI wird eingesetzt, um Anforderungen auf Mehrdeutigkeit, Unvollständigkeit und Widersprüche zu prüfen; die Ergebnisse werden von Fachexperten bewertet. | S |
| KB18.K.03 | K | Akzeptanzkriterien werden KI-gestützt auf Testbarkeit geprüft, bevor eine Story als „ready“ gilt (Definition of Ready). | S |
| KB18.E.01 | E | KI erzeugt aus Anforderungen Vorschläge für Akzeptanzkriterien bzw. Szenarien (z. B. Gherkin), die im Refinement abgestimmt werden. | S |
| KB18.E.02 | E | Die Rückverfolgbarkeit Anforderung ↔ Testfall wird KI-gestützt erstellt bzw. auf Lücken geprüft. | M |
| KB18.E.03 | E | Bei Änderungsanforderungen wird eine KI-gestützte Auswirkungsanalyse (betroffene Anforderungen, Testfälle, Komponenten) durchgeführt. | M |
| KB18.O.01 | O | Die Wirksamkeit der KI-Anforderungsprüfung wird gemessen (z. B. früh gefundene Mängel vs. später gefundene Fehler). | M |
| KB18.O.02 | O | Prüfkriterien und Prompts für die Anforderungsprüfung werden auf Basis der Messergebnisse kontinuierlich verbessert. | S |

### KB19 – KI-gestützte Softwareentwicklung und Dokumentation
*Initial:* Entwickler nutzen KI-Assistenten nach eigenem Ermessen.

| ID | Ebene | Kontrollpunkt | Aufw. |
|---|---|---|---|
| KB19.K.01 | K | Es werden ausschließlich freigegebene KI-Code-Assistenten mit geregelten Datenschutzeinstellungen genutzt. | S |
| KB19.K.02 | K | KI-generierter Code durchläuft dieselben Qualitätstore wie manuell geschriebener Code (Review, statische Analyse, Security-Scan, Tests). | S |
| KB19.K.03 | K | Unit-Tests werden KI-unterstützt erstellt und von den Entwicklern auf Aussagekraft geprüft (keine reinen „Coverage-Tests“). | S |
| KB19.E.01 | E | Projektkontext und Regeln für KI-Agenten sind im Repository dokumentiert (z. B. AGENTS.md, Coding-Guidelines). | S |
| KB19.E.02 | E | Technische und fachliche Dokumentation (API-Doku, Release Notes, Benutzerhilfe, Testberichte) wird KI-gestützt erstellt und fachlich freigegeben. | M |
| KB19.E.03 | E | Abweichungen zwischen Code und Dokumentation werden automatisiert bzw. KI-gestützt erkannt. | M |
| KB19.E.04 | E | KI-spezifische Sicherheitsrisiken (Prompt-Injection, Preisgabe von Secrets, erfundene Paketabhängigkeiten) sind bekannt und werden technisch adressiert. | M |
| KB19.O.01 | O | Die Wirkung von KI auf Durchlaufzeit und Fehlerdichte wird gemessen und mit Nicht-KI-Entwicklung verglichen. | L |
| KB19.O.02 | O | Agentische Workflows (KI-Agent erstellt Änderung inkl. Tests und Doku als Pull Request) sind mit klaren Leitplanken etabliert. | L |
| KB19.O.03 | O | Projektwissen (Doku, Entscheidungen, Fehlerhistorie) ist für das Team über eine KI-gestützte Wissensbasis durchsuchbar. | L |

### ~~KB20 – Qualitätssicherung KI-basierter Systeme~~ (entfallen)
Entscheidung F-03: Der Katalog umfasst **19 Kernbereiche** (16 TPI NEXT® + KB17–KB19). KB20 entfällt. Falls Produkte später selbst KI-Komponenten enthalten, kann ein Kernbereich nachgerüstet werden; die IDs sind dafür reserviert.

## 3. Ergänzungen bestehender Kernbereiche (Tag `AI`)

| ID | KB | Ebene | Kontrollpunkt | Aufw. |
|---|---|---|---|---|
| KB01.E.AI1 | 1 Stakeholder | E | Die Stakeholder stellen Budget und Zeit für die Erprobung von KI-Werkzeugen in Entwicklung und QS bereit. | M |
| KB03.E.AI1 | 3 Teststrategie | E | Die Teststrategie legt fest, in welchen Testaktivitäten KI eingesetzt wird und wie KI-Ergebnisse verifiziert werden. | S |
| KB03.O.AI1 | 3 Teststrategie | O | Die Produktrisikoanalyse wird durch KI-gestützte Auswertung historischer Fehler- und Änderungsdaten unterstützt. | L |
| KB06.E.AI1 | 6 Berichterstattung | E | KI-gestützte Zusammenfassungen von Testergebnissen werden vor der Weitergabe fachlich geprüft. | S |
| KB08.E.AI1 | 8 Schätzung/Planung | E | Der Einfluss von KI-Werkzeugen auf den Testaufwand wird in Schätzungen berücksichtigt. | S |
| KB09.K.AI1 | 9 Metriken | K | Nutzung und Nutzen von KI-Werkzeugen werden mit einfachen Kennzahlen erfasst (z. B. Akzeptanzrate KI-generierter Testfälle). | S |
| KB09.O.AI1 | 9 Metriken | O | Die Qualität KI-generierter Artefakte wird gemessen (z. B. Anteil fehlerhafter/verworfener Vorschläge). | M |
| KB10.E.AI1 | 10 Fehlermanagement | E | KI unterstützt bei Duplikaterkennung, Klassifizierung und Priorisierung von Fehlermeldungen. | M |
| KB10.O.AI1 | 10 Fehlermanagement | O | KI-gestützte Ursachenanalyse und Fehlervorhersage werden zur Prozessverbesserung genutzt. | L |
| KB11.K.AI1 | 11 Testwaremanagement | K | KI-generierte Testware wird wie andere Testware versioniert und ist als KI-generiert erkennbar. | S |
| KB12.E.AI1 | 12 Methodik | E | Die Testmethode beschreibt KI-gestützte Aktivitäten inklusive Rollen, Prüf- und Freigabepunkten. | M |
| KB13.K.AI1 | 13 Professionalität | K | Tester verfügen über Grundkenntnisse in der Nutzung generativer KI (z. B. Prompting, Grenzen, Halluzinationen). | S |
| KB13.E.AI1 | 13 Professionalität | E | Tester verfügen über eine KI-bezogene Qualifizierung (z. B. ISTQB CT-AI oder CT-GenAI). | M |
| KB14.E.AI1 | 14 Testfalldesign | E | KI erzeugt aus der Testbasis Testfallvorschläge unter Vorgabe von Testentwurfsverfahren; Tester prüfen und übernehmen sie. | S |
| KB14.O.AI1 | 14 Testfalldesign | O | Abdeckungslücken und redundante Testfälle werden KI-gestützt identifiziert. | M |
| KB15.K.AI1 | 15 Testwerkzeuge | K | Für KI-gestützte Testwerkzeuge existiert eine Freigabe- und Bewertungsliste. | S |
| KB15.E.AI1 | 15 Testwerkzeuge | E | Automatisierte Testskripte (z. B. Playwright) werden KI-gestützt erstellt bzw. gewartet und durchlaufen ein Code-Review. | S |
| KB15.E.AI2 | 15 Testwerkzeuge | E | KI-gestützte Selbstheilung von Selektoren bzw. Wartungsvorschläge reduzieren den Pflegeaufwand der Testautomatisierung. | M |
| KB15.O.AI1 | 15 Testwerkzeuge | O | Der Einsatz KI-Agenten für explorative oder autonome Testausführung wird erprobt und bewertet. | L |
| KB16.E.AI1 | 16 Testumgebung | E | Synthetische, datenschutzkonforme Testdaten werden KI-gestützt erzeugt. | M |
| KB16.O.AI1 | 16 Testumgebung | O | Logs und Monitoringdaten der Testumgebung werden KI-gestützt auf Auffälligkeiten analysiert. | M |

## 4. Summen (Entwurf)

| Block | Anzahl KP |
|---|---|
| KB17 Governance | 11 |
| KB18 Anforderungen | 8 |
| KB19 Entwicklung & Doku | 10 |
| AI-Ergänzungen KB1–16 | 21 |
| **Summe neu** | **50** |

## 5. Offene Punkte zu diesem Entwurf
- Sollen die Ergänzungen in KB1–16 **in die Ebenenwertung eingehen** (verschärft Erreichen einer Ebene) oder als **separater KI-Index** ausgewiesen werden? Empfehlung: separater KI-Index, damit Vergleichbarkeit mit Vorjahren erhalten bleibt (F-10).
- KI-gestützte Testautomatisierung wird über KB14/KB15 abgedeckt, da kein vierter KI-Kernbereich vorgesehen ist (19 KB).
