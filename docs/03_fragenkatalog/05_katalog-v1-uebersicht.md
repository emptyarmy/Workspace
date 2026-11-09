# Fragenkatalog v1.0 (Entwurf) – Übersicht zur fachlichen Prüfung

> Erzeugt aus `packages/catalog/catalog.v1.json` (Stand 09.11.2026, Status **draft**). Änderungen bitte **nicht hier**, sondern als Kommentar/Anmerkung zurückmelden – die Datei wird aus dem JSON neu erzeugt.

## 1. Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Kernbereiche | 19 (16 TPI NEXT + 3 KI) |
| Kontrollpunkte gesamt | **223** |
| davon TPI NEXT (bereinigt) | 153 |
| davon TPI NEXT rekonstruiert (KB02, Ebene Kontrolliert) | 4 |
| davon neue agile Kontrollpunkte (Agile TPI) | 16 |
| davon KI-Kontrollpunkte (KB17–19 + Ergänzungen) | 50 |
| Agile-TPI-Punkte als Zusatzinformation an TPI-NEXT-Punkten | 92 von 108 |
| Aufwand S (kurzfristig < 1 Monat) / M (1–3 Monate) / L (> 3 Monate) | 114 / 90 / 19 |

**Legende:** Ebene K = Kontrolliert, E = Effizient, O = Optimierend · Aufw. = Umsetzungsaufwand bei Nichterfüllung · Sicht P/T/O und Cluster A–G aus Agile TPI · 🤖 = KI-Kontrollpunkt · 🔄 = neuer agiler Kontrollpunkt · ⚠️ = rekonstruiert, bitte besonders prüfen

## 2. Hinweise zur Bereinigung

- Tippfehler korrigiert (z. B. „einen einfache“, „de Testprozesses“, „lieft“, „übern“, „abziehen“ → „abzielen“, „Widerverwendung“).
- Projektspezifische Bewertungstexte (BRUNATA, Projekt B2B, aqua, NTT Data, DSC) entfernt – sie können als Demo-Assessment dienen (F-18).
- Uneinheitliche Ebenenbezeichnungen vereinheitlicht (Kontrolliert / Effizient / Optimierend).
- **KB02 „Grad der Beteiligung“:** Überschrift und Ebene KONTROLLIERT fehlten im Word-Dokument; die 4 Kontrollpunkte dieser Ebene sind nach TPI NEXT rekonstruiert (⚠️).
- Wo ein agiler Kontrollpunkt inhaltlich einem TPI-NEXT-Punkt entspricht, wurde die Formulierung des TPI-NEXT-Punktes behutsam um die agile Sicht ergänzt (z. B. „Auftraggeber bzw. Product Owner“).

## 3. Kontrollpunkte je Kernbereich

### KB01 – Engagement der Stakeholder / Stakeholder commitment

*Engagierte, proaktive Stakeholder schaffen gute Voraussetzungen für effiziente Kommunikation und Zusammenarbeit.*  
*Committed, proactive stakeholders create good conditions for efficient communication and collaboration.*

**KONTROLLIERT** – Stakeholder setzen sich für den Testprozess ein und unterstützen ihn, indem sie die vereinbarten Ressourcen bewilligen und zur Verfügung stellen.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB01.K.01` | Der Auftraggeber (bzw. Product Owner) ist definiert (jedoch nicht zwangsläufig dokumentiert) und den Testern bzw. dem gesamten Team bekannt.<br>*The principal (or Product Owner) is defined (though not necessarily documented) and known to the testers or the whole team.* | S | P/C (1.1.1) | Benennen Sie den Auftraggeber bzw. Product Owner verbindlich und machen Sie ihn allen Teammitgliedern bekannt. |
| `KB01.K.02` | Das Budget für die Testressourcen wird vom Auftraggeber bewilligt und kann mit ihm verhandelt werden.<br>*The budget for test resources is granted by and negotiable with the principal.* | S | O/D (1.3.2) | Vereinbaren Sie mit dem Auftraggeber ein ausgewiesenes Testbudget und einen Weg, es bei Bedarf nachzuverhandeln. |
| `KB01.K.03` | Die Stakeholder stellen die vereinbarten Ressourcen tatsächlich zur Verfügung.<br>*Stakeholders actually provide the agreed resources.* | M | – | Verfolgen Sie zugesagte Ressourcen (Personen, Umgebungen, Daten) nach und eskalieren Sie Abweichungen frühzeitig. |
| `KB01.K.04` | Der Auftraggeber ist für die dokumentierte Produktrisikoanalyse (Eingangsprodukt der Teststrategie) verantwortlich.<br>*The principal is responsible for the documented product risk analysis (input for the test strategy).* | S | T/C (1.2.1) | Übertragen Sie dem Auftraggeber bzw. Product Owner die Verantwortung für die Produktrisikoanalyse und dokumentieren Sie das Ergebnis. |

**EFFIZIENT** – Stakeholder sehen die Auswirkungen von Veränderungen voraus und ermöglichen dadurch eine angemessene Anpassung des Testprozesses.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB01.E.01` | Alle relevanten Stakeholder sind definiert (jedoch nicht zwangsläufig dokumentiert) und den Testern bzw. dem gesamten Team bekannt.<br>*All relevant stakeholders are defined (though not necessarily documented) and known to the testers or the whole team.* | S | P/D (1.1.3) | Erstellen Sie eine Stakeholder-Übersicht mit Interessen und Ansprechpartnern und teilen Sie sie mit dem Team. |
| `KB01.E.02` | Die Stakeholder besorgen sich Informationen über die Qualität des Testprozesses und des Testobjekts bzw. erhalten diese aktiv.<br>*Stakeholders obtain or are actively provided with information on the quality of the test process and the test object.* | S | T/E (1.2.2) | Stellen Sie den Stakeholdern regelmäßig Qualitätsinformationen bereit (z. B. Dashboard, Sprint-Review). |
| `KB01.E.03` | Die Stakeholder handeln in Angelegenheiten, die den Testprozess betreffen, proaktiv, etwa bei Änderungen in der Lieferfolge des Testobjekts oder im Projektumfang.<br>*Stakeholders act proactively in matters affecting the test process, e.g. changes in the delivery sequence of the test object or in project scope.* | M | – | Vereinbaren Sie, dass Änderungen an Lieferplan oder Umfang dem Testmanagement unaufgefordert und frühzeitig mitgeteilt werden. |
| `KB01.AG.12` | 🔄 Der Product Owner nimmt seine (pro)aktiven Aufgaben und Verantwortlichkeiten im Hinblick auf Qualität und Test gut wahr.<br>*The Product Owner carries out their (pro)active tasks and responsibilities regarding quality and testing well.* | M | P/D (1.1.2) | Klären Sie mit dem Product Owner seine Qualitätsaufgaben (Abnahmekriterien, Risikoentscheidungen) und reflektieren Sie sie in der Retrospektive. |
| `KB01.E.AI1` | 🤖 Die Stakeholder stellen Budget und Zeit für die Erprobung von KI-Werkzeugen in Entwicklung und Qualitätssicherung bereit.<br>*Stakeholders provide budget and time for trialling AI tools in development and quality assurance.* | M | – | Beantragen Sie ein begrenztes Pilotbudget für KI-Werkzeuge mit klaren Erfolgskriterien. |

**OPTIMIEREND** – Stakeholder akzeptieren und fördern Prozessverbesserungen in gemeinschaftlicher Verantwortung.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB01.O.01` | Die Organisation akzeptiert, dass Testprozessverbesserung zusätzliche Einarbeitungszeit erfordert, und stellt dafür Ressourcen (z. B. Schulung, Coaching, Interessengruppen) zur Verfügung.<br>*The organisation accepts that test process improvement requires additional learning time and provides resources for it (e.g. training, coaching, interest groups).* | M | O/C (1.3.1) | Planen Sie feste Zeit- und Budgetanteile für Verbesserungsmaßnahmen, Schulung und Coaching ein. |
| `KB01.O.02` | Die Stakeholder sind bereit, ihre Arbeitsweise an Belange des Testprozesses anzupassen; dies betrifft auch Softwareentwicklung und Anforderungsmanagement.<br>*Stakeholders are willing to adapt their way of working to the needs of the test process, including software development and requirements management.* | L | – | Vereinbaren Sie mit Entwicklung und Anforderungsmanagement konkrete Anpassungen (z. B. testbare Anforderungen, frühe Lieferungen). |
| `KB01.O.03` | Eine an die Belange des Testprozesses angepasste Arbeitsweise der Stakeholder wird von Testorganisation und Stakeholdern gemeinsam bewertet.<br>*A stakeholder way of working adapted to the test process is evaluated jointly by the test organisation and the stakeholders.* | M | – | Bewerten Sie die Zusammenarbeit regelmäßig gemeinsam (z. B. halbjährlicher Review) und leiten Sie Maßnahmen ab. |

### KB02 – Grad der Beteiligung / Degree of involvement

*Eine frühe und umfassende Einbindung des Testens in das Projekt ermöglicht ein zuverlässiges Ergebnis des Testprozesses und das Vermeiden von Fehlern.*  
*Early and extensive involvement of testing in the project enables a reliable test result and the prevention of defects.*

**KONTROLLIERT** – Das Testen wird rechtzeitig in das Projekt eingebunden, sodass Testaktivitäten vorbereitet und geplant werden können.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB02.K.01` | ⚠️ Das Testen wird bereits zu Projektbeginn eingebunden; der Testauftrag wird frühzeitig erteilt.<br>*Testing is involved from the start of the project; the test assignment is issued early.* | S | – | Binden Sie das Testmanagement bereits beim Projekt-Kick-off ein und erteilen Sie den Testauftrag schriftlich. |
| `KB02.K.02` | ⚠️ Tester bzw. Entwickler mit Testrolle nehmen an der Projekt- und Sprintplanung teil, um Testaktivitäten mit den übrigen Aktivitäten abzustimmen.<br>*Testers or developers with a test role participate in project and sprint planning to align test activities with other activities.* | S | P/A (2.1.2) | Laden Sie Tester verbindlich zu Projekt- und Sprintplanungen ein. |
| `KB02.K.03` | ⚠️ Qualitäts- und Testaspekte werden bei der Analyse und Minderung der Projekt- bzw. Sprintrisiken durch Team und Product Owner berücksichtigt.<br>*Quality and test aspects are considered by team and Product Owner in analysing and mitigating project and sprint risks.* | S | P/B (2.1.3) | Ergänzen Sie die Projektrisikoliste um Qualitäts- und Testrisiken und lassen Sie Tester mitbewerten. |
| `KB02.K.04` | ⚠️ Die Testbasis wird vor der Testvorbereitung von Testern auf Testbarkeit geprüft (Testbarkeitsreview).<br>*The test basis is reviewed for testability by testers before test preparation (testability review).* | S | – | Führen Sie für Anforderungen bzw. User Stories ein kurzes Testbarkeitsreview ein (z. B. als Teil der Definition of Ready). |
| `KB02.AG.11` | 🔄 Testaktivitäten wie Produktrisikoanalyse, Planung, Vorbereitung und Testfallentwurf werden vor der Testdurchführung erledigt, um sie vom kritischen Pfad des Sprints fernzuhalten.<br>*Test activities such as product risk analysis, planning, preparation and test case design are performed before test execution to keep them off the sprint's critical path.* | M | P/A (2.1.1) | Verlagern Sie Risikoanalyse und Testfallentwurf in das Refinement bzw. den Sprintbeginn. |

**EFFIZIENT** – Die Einbindung des Testens ermöglicht ein zuverlässiges Ergebnis des Testprozesses und das Vermeiden von Fehlern.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB02.E.01` | Die Tester tragen zur Analyse der Auswirkungen und Risiken von Änderungsanforderungen und Änderungen der Testbasis bei (z. B. im Refinement).<br>*Testers contribute to analysing the impact and risks of change requests and changes to the test basis (e.g. in refinement).* | S | P/C (2.1.4) | Beteiligen Sie Tester an der Bewertung jeder Änderungsanforderung bzw. im Backlog-Refinement. |
| `KB02.E.02` | Die Tester tragen zur Analyse der Fehlerwirkungen bei.<br>*Testers contribute to the analysis of defect impact.* | S | – | Nehmen Sie Tester in Fehlerbewertungsrunden (Defect Triage) auf. |
| `KB02.E.03` | Die Tester sind aktiv an der Optimierung der Testbasis beteiligt (über ein Testbarkeitsreview hinausgehend).<br>*Testers actively take part in optimising the test basis (beyond a testability review).* | M | T/A (2.2.1) | Lassen Sie Tester an der Formulierung von Anforderungen und Akzeptanzkriterien mitwirken (z. B. Three Amigos). |
| `KB02.AG.32` | 🔄 Schulungs- und Coachingangebote stehen bereit, bevor die Sprintaktivitäten beginnen.<br>*Training and coaching facilities are provided before sprint activities start.* | M | O/B (2.3.2) | Planen Sie Einarbeitung und Testschulung vor dem ersten Sprint eines neuen Teams ein. |

**OPTIMIEREND** – Die Einbindung des Testens in das Projekt ermöglicht es, sowohl den Projekt- als auch den Testprozess zu optimieren.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB02.O.01` | Das Testteam ist an der Projektbewertung beteiligt; Erfahrungen aus dem Testprozess werden bewertet und fließen in künftige Projektphasen und Projekte ein.<br>*The test team is involved in the project evaluation; lessons learned from the test process are evaluated and used in future project phases and projects.* | M | O/A (2.3.1) | Führen Sie Lessons-Learned-Workshops mit Testbeteiligung durch und dokumentieren Sie übertragbare Erkenntnisse. |
| `KB02.O.02` | Das Testteam spielt eine selbstverständliche Rolle in allen relevanten Entwicklungsaktivitäten und wird anerkannt und geschätzt.<br>*The test team plays a natural role in all relevant development activities and is recognised and valued.* | L | – | Verankern Sie Testbeteiligung in allen Prozessschritten des Entwicklungsprozesses (Prozessbeschreibung, DoR/DoD). |

### KB03 – Teststrategie / Test strategy

*Die Teststrategie sorgt im Testprozess für einen optimierten Einsatz von Aufwand und Ressourcen.*  
*The test strategy ensures an optimised use of effort and resources in the test process.*

**KONTROLLIERT** – Die Teststrategie ermöglicht die Aufteilung des Testaufwands und der Ressourcen auf die Teststufen und Testaktivitäten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB03.K.01` | Der Auftraggeber bzw. Product Owner und das Team stimmen der dokumentierten Teststrategie zu.<br>*The principal or Product Owner and the team agree to the documented test strategy.* | S | P/C (3.1.3) | Dokumentieren Sie die Teststrategie kompakt (1–2 Seiten) und lassen Sie sie vom Auftraggeber freigeben. |
| `KB03.K.02` | Die Teststrategie basiert auf einer Produktrisikoanalyse; Produktrisiken werden während des Projekts definiert und gesteuert (z. B. Risk Poker für Stories).<br>*The test strategy is based on a product risk analysis; product risks are defined and managed during the project (e.g. risk poker for stories).* | S | P/A (3.1.1) | Führen Sie eine Produktrisikoanalyse ein, z. B. als 30-minütiges Risk Poker im Refinement. |
| `KB03.K.03` | In Abhängigkeit von den analysierten Risiken wird nach Teststufen, Testarten, Testabdeckung und Testintensität differenziert.<br>*Depending on the analysed risks, a distinction is made between test levels, test types, test coverage and test depth.* | M | P/D (3.1.4) | Ordnen Sie jedem Risiko-Level eine Testintensität und Teststufe zu (Risiko-Test-Matrix). |
| `KB03.K.04` | Auch für Fehlernachtests und Regressionstests wird eine (einfache) risikobasierte Strategie festgelegt.<br>*A (simple) risk-based strategy is also defined for retests and regression tests.* | S | P/B (3.1.2) | Legen Sie fest, welche Regressionstests bei welcher Änderung laufen, abgeleitet aus den Produktrisiken. |

**EFFIZIENT** – Die Teststrategie schafft unter Einbindung aller Stakeholder einen angemessenen Ausgleich zwischen Produktrisiken, Testabdeckung, Aufwand und Ressourcen.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB03.E.01` | Alle relevanten Stakeholder stimmen der definierten (und dokumentierten) Teststrategie zu.<br>*All relevant stakeholders agree to the defined (and documented) test strategy.* | S | – | Stimmen Sie die Teststrategie mit allen relevanten Stakeholdern ab (z. B. Review-Termin). |
| `KB03.E.02` | Überschneidungen oder Lücken in der Testabdeckung zwischen Teststufen, Testarten oder Teams (Schnittstellen- und Integrationstests) werden sorgfältig geprüft.<br>*Overlaps or gaps in test coverage between test levels, test types or teams (interface and integration tests) are carefully examined.* | M | T/C (3.2.2) | Erstellen Sie eine Übersicht der Testabdeckung je Teststufe und Team und stimmen Sie Integrationstests teamübergreifend ab. |
| `KB03.E.03` | Die Teststrategie enthält geeignete Testdesigntechniken; risikoabhängig wird mehr als eine Technik eingesetzt.<br>*The test strategy contains suitable test design techniques; depending on risk, more than one technique is used.* | M | T/C (3.2.3) | Ordnen Sie in der Teststrategie Risikoklassen konkrete Testentwurfsverfahren zu. |
| `KB03.AG.21` | 🔄 Die Teststrategie wird während des Projekts überwacht und bei Bedarf angepasst.<br>*The test strategy is monitored and adapted where necessary during the project.* | S | T/A (3.2.1) | Prüfen Sie die Teststrategie zu jedem Release bzw. in jeder Retrospektive auf Aktualität. |
| `KB03.E.AI1` | 🤖 Die Teststrategie legt fest, in welchen Testaktivitäten KI eingesetzt wird und wie KI-Ergebnisse verifiziert werden.<br>*The test strategy defines in which test activities AI is used and how AI results are verified.* | S | – | Ergänzen Sie die Teststrategie um einen Abschnitt „KI-Einsatz“ mit Einsatzbereichen und Prüfschritten. |

**OPTIMIEREND** – Die Vorgehensweise bei der Teststrategie wird gepflegt, um ihre einfache und zuverlässige Anwendung zu gewährleisten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB03.O.01` | Der Prozess zur Erstellung der Teststrategie wird regelmäßig bewertet (z. B. in der Retrospektive) und bei Bedarf für die künftige Verwendung angepasst.<br>*The process of creating the test strategy is evaluated regularly (e.g. in the retrospective) and adapted for future use if necessary.* | S | O/A (3.3.1) | Nehmen Sie die Bewertung des Strategieprozesses als festen Punkt in die Retrospektive auf. |
| `KB03.O.02` | Die Teststrategie wird anhand von Metriken über Störfälle in der Produktion bewertet.<br>*The test strategy is evaluated using metrics on incidents in production.* | L | O/C (3.3.2) | Erfassen Sie Produktionsstörungen mit Ursache und Teststufe und werten Sie sie quartalsweise für die Strategie aus. |
| `KB03.O.AI1` | 🤖 Die Produktrisikoanalyse wird durch KI-gestützte Auswertung historischer Fehler- und Änderungsdaten unterstützt.<br>*The product risk analysis is supported by AI-based evaluation of historical defect and change data.* | L | – | Bereiten Sie historische Fehler- und Änderungsdaten auf und erproben Sie eine KI-gestützte Risikovorhersage. |

### KB04 – Testorganisation / Test organization

*Die Testorganisation stellt den Projekten die benötigten Testressourcen, Testprodukte und Testdienstleistungen zur Verfügung.*  
*The test organisation provides projects with the required test resources, test products and test services.*

**KONTROLLIERT** – Die Testorganisation ermöglicht Einheitlichkeit bei Testvorgehen, Testprodukten und Testabläufen sowie klare Vereinbarungen und Testergebnisse.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB04.K.01` | Alle Beteiligten (das gesamte Team) wissen, wer für Qualitäts- und Testaufgaben verantwortlich ist.<br>*Everyone involved (the whole team) knows who is responsible for quality and test tasks.* | S | P/E (4.1.2) | Machen Sie Zuständigkeiten für Test und Qualität im Team sichtbar (z. B. RACI, Teamseite). |
| `KB04.K.02` | Innerhalb der Testorganisation gibt es eine Struktur der Steuerung und Verantwortlichkeit.<br>*There is a structure of control and accountability within the test organisation.* | M | – | Definieren Sie Berichtswege und Entscheidungsbefugnisse innerhalb der Testorganisation. |
| `KB04.K.03` | Testaufgaben, Rollen und Verantwortlichkeiten (inkl. Testerrolle) sind rechtzeitig vor Beginn der Aktivitäten definiert, dokumentiert, mit Scrum Master und Product Owner abgestimmt und Personen zugewiesen.<br>*Test tasks, roles and responsibilities (incl. the tester role) are defined, documented, aligned with Scrum Master and Product Owner and assigned to people in time before activities start.* | S | P/D (4.1.1, 4.3.1) | Beschreiben Sie die Testerrolle und Testaufgaben vor Sprintbeginn und stimmen Sie sie mit Scrum Master und Product Owner ab. |
| `KB04.K.04` | Die Produkte, Dienstleistungen und Rollen der Testorganisation sind ihren Kunden bzw. Stakeholdern außerhalb des Teams bekannt.<br>*The products, services and roles of the test organisation are known to its customers or stakeholders outside the team.* | S | P/G (4.1.4) | Veröffentlichen Sie einen kurzen Leistungskatalog der Testorganisation. |

**EFFIZIENT** – Die Testorganisation stellt die richtige Testkompetenz und Testerfahrung an der richtigen Stelle zur Verfügung.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB04.E.01` | Verschiedene Personen, Teams oder Abteilungen, die Testleistungen erbringen, stimmen ihre Arbeit miteinander ab.<br>*Different people, teams or departments providing test services coordinate their work.* | S | T/D (4.2.1) | Richten Sie eine regelmäßige teamübergreifende Testabstimmung ein (z. B. Test-Guild, Scrum of Scrums). |
| `KB04.E.02` | Die Testorganisation stellt den Projekten die vereinbarten Testressourcen und Testdienstleistungen zur Verfügung.<br>*The test organisation provides projects with the agreed test resources and services.* | M | – | Planen Sie Testkapazitäten projektübergreifend und verfolgen Sie Zusagen nach. |
| `KB04.E.03` | Die Entscheidung, wo und wie die Testorganisation positioniert wird, ist wohldurchdacht.<br>*The decision on where and how to position the test organisation is well considered.* | L | – | Bewerten Sie Organisationsmodelle (zentral, dezentral, hybrid) und dokumentieren Sie die Entscheidung. |
| `KB04.E.04` | Die Testrichtlinie wird befolgt.<br>*The test policy is followed.* | M | – | Erstellen bzw. aktualisieren Sie eine Testrichtlinie und prüfen Sie stichprobenartig ihre Einhaltung. |
| `KB04.AG.13` | 🔄 Laufende Qualitäts- und Testarbeit kann von jedem Teammitglied übernommen werden.<br>*Quality and test work in progress can be picked up by any team member.* | L | P/F (4.1.3) | Fördern Sie T-Shaped-Skills durch Pairing und gemeinsames Testen im Team. |

**OPTIMIEREND** – Die Testorganisation trägt durch ihre Testdienstleistungen zu einer kontinuierlichen Verbesserung der Resultate bei.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB04.O.01` | Die Produkte und Dienstleistungen der Testorganisation werden regelmäßig auf Organisationsebene bewertet; wirtschaftliche neue Dienstleistungen werden hinzugefügt.<br>*The products and services of the test organisation are evaluated regularly at organisational level; economical new services are added.* | M | O/G (4.3.2) | Führen Sie eine jährliche Bewertung des Leistungskatalogs mit Kunden der Testorganisation durch. |
| `KB04.O.02` | Die Testorganisation bzw. das Team fühlt sich für Erfolg und Misserfolg von Produkt- und Prozessqualität verantwortlich.<br>*The test organisation or team feels accountable for success and failure of product and process quality.* | L | T/F (4.2.2) | Verankern Sie Qualitätsziele in den Teamzielen und werten Sie sie gemeinsam aus. |
| `KB04.O.03` | Die Leistung der Testorganisation wird regelmäßig mit externen Dienstleistern oder ähnlichen Testorganisationen verglichen.<br>*The performance of the test organisation is regularly compared with external service providers or similar test organisations.* | L | – | Nutzen Sie den Benchmark dieser Anwendung bzw. Branchenvergleiche, um die Leistung einzuordnen. |

### KB05 – Kommunikation / Communication

*Eine eindeutige Kommunikation schafft ein gemeinsames Verständnis und aufeinander abgestimmte Erwartungen der beteiligten Parteien.*  
*Clear communication creates a shared understanding and aligned expectations among the parties involved.*

**KONTROLLIERT** – Der Informationsaustausch zwischen allen Beteiligten ermöglicht eine angemessene Entscheidungsfindung.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB05.K.01` | Jedes Teammitglied ist über getroffene Entscheidungen und den Projektfortschritt informiert.<br>*Every team member is informed about decisions taken and project progress.* | S | – | Dokumentieren Sie Entscheidungen zentral (z. B. Entscheidungslog) und verweisen Sie im Daily darauf. |
| `KB05.K.02` | Das Testteam holt relevante Informationen aktiv von den Stakeholdern ein, auch von außerhalb des Teams (z. B. Scrum of Scrums).<br>*The test team actively gathers relevant information from stakeholders, including from outside the team (e.g. Scrum of Scrums).* | S | P/C (5.1.2) | Benennen Sie je Team eine Person, die Informationen aus übergreifenden Runden einholt und weitergibt. |
| `KB05.K.03` | Aktionen, Vereinbarungen und Entscheidungen des Testteams sind nachvollziehbar.<br>*Actions, agreements and decisions of the test team can be traced.* | S | – | Halten Sie Vereinbarungen und Entscheidungen schriftlich fest (Protokoll, Ticket, Wiki). |
| `KB05.K.04` | Das Testteam berät sich mit den Stakeholdern über Fortschritt, Produktqualität und Risiken und weist proaktiv auf mögliche Verzögerungen hin.<br>*The test team consults stakeholders on progress, product quality and risks and proactively points out possible delays.* | S | T/B (5.2.1) | Nehmen Sie Produktqualität und Risiken als festen Punkt in Reviews und Statusrunden auf. |
| `KB05.AG.11` | 🔄 Jedes Teammitglied nimmt (pro)aktiv am Daily Stand-up teil, um relevante Informationen zu geben und zu erhalten.<br>*Each team member (pro)actively participates in the daily stand-up to provide and receive relevant information.* | S | P/A (5.1.1) | Stellen Sie sicher, dass Tester bzw. Entwickler mit Testrolle am Daily teilnehmen und Testfortschritt und Blocker nennen. |

**EFFIZIENT** – Eine präzise Aufbereitung der Informationen für den Adressaten trägt zu erhöhter Produktivität bei.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB05.E.01` | Das Testteam erkennt, welche Informationen mit welchen Stakeholdern geteilt werden müssen.<br>*The test team recognises which information must be shared with which stakeholders.* | S | – | Erstellen Sie eine einfache Kommunikationsmatrix (wer erhält was, wann, wie). |
| `KB05.E.02` | Das Testteam nimmt an relevanten Besprechungen mit den Stakeholdern teil.<br>*The test team attends relevant meetings with stakeholders.* | S | – | Prüfen Sie den Besprechungskalender und ergänzen Sie fehlende Testbeteiligung. |
| `KB05.E.03` | Dem Testteam stehen die erforderlichen Kommunikationsmittel zur Verfügung; für wirksame Botschaften innerhalb und außerhalb des Teams werden unterschiedliche Mittel bewusst gewählt.<br>*The test team has the necessary means of communication; different means are deliberately chosen for effective messages inside and outside the team.* | S | T/D (5.2.2) | Legen Sie fest, welcher Kanal wofür genutzt wird (Chat, Wiki, Dashboard, Meeting). |

**OPTIMIEREND** – Die Kommunikation fördert die Teamentwicklung.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB05.O.01` | Best Practices und Erfahrungen zu Kommunikation und deren Effizienz werden während und am Ende eines Projekts regelmäßig bewertet und Verbesserungen umgesetzt.<br>*Best practices and lessons learned on communication and its efficiency are evaluated regularly during and at the end of a project, and improvements are implemented.* | S | O/C (5.3.1) | Nehmen Sie die Kommunikationsqualität regelmäßig in die Retrospektive auf. |
| `KB05.O.02` | Das Unternehmen evaluiert den Einsatz neuer Kommunikationsmittel und legt Regeln für deren Nutzung fest.<br>*The organisation evaluates the use of new means of communication and sets rules for their use.* | M | – | Erstellen Sie Nutzungsregeln für Kommunikationswerkzeuge und prüfen Sie sie jährlich. |

### KB06 – Berichterstattung / Reporting

*Die Berichterstattung versorgt die Stakeholder mit Informationen zur Entscheidungsfindung und Überwachung der Testprojekte.*  
*Reporting provides stakeholders with information for decision-making and for monitoring test projects.*

**KONTROLLIERT** – Testteam und Stakeholder vereinbaren, was und wie berichtet wird, und verhindern so Informationslücken oder Informationsüberflutung.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB06.K.01` | Die Berichterstattung (auch im Stand-up) enthält Aspekte von Zeit und/oder Kosten, Ergebnissen und vor allem Produktrisiken.<br>*Reporting (including in the stand-up) covers time and/or cost, results and above all product risks.* | S | P/D (6.1.1) | Verwenden Sie eine Berichtsvorlage mit den Abschnitten Fortschritt, Ergebnisse und Risiken. |
| `KB06.K.02` | Häufigkeit und Inhalt der Berichterstattung entsprechen den Grundforderungen der Stakeholder bzw. des Product Owners für die Entscheidungsfindung.<br>*Frequency and content of reporting match the basic needs of stakeholders or the Product Owner for decision-making.* | S | P/F (6.1.2) | Fragen Sie die Empfänger nach ihrem Informationsbedarf und passen Sie Turnus und Inhalt an. |
| `KB06.K.03` | Die Berichterstattung erfolgt schriftlich, soweit von den Stakeholdern gefordert.<br>*Reporting is done in writing as required by stakeholders.* | S | P/F (6.1.3) | Legen Sie fest, welche Berichte schriftlich erfolgen, und archivieren Sie sie zentral. |

**EFFIZIENT** – Die Berichterstattung ist zur Unterstützung der Entscheidungsfindung auf spezifische Adressaten abgestimmt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB06.E.01` | Der Aufwand für die Berichterstattung wird gegen den Informationsbedarf der Stakeholder abgewogen.<br>*The effort for reporting is balanced against the stakeholders’ information needs.* | S | T/F (6.2.3) | Prüfen Sie jeden Bericht auf Nutzung und streichen oder automatisieren Sie wenig genutzte Inhalte. |
| `KB06.E.02` | Die Berichterstattung (z. B. aus Retrospektiven) enthält Trends und Empfehlungen zum Verlauf des Testprozesses, zu Testzeit und -kosten sowie zu Projektrisiken.<br>*Reporting (e.g. from retrospectives) contains trends and recommendations on the test process, test time and cost, and project risks.* | M | T/D (6.2.1) | Ergänzen Sie Berichte um Trendgrafiken und konkrete Empfehlungen. |
| `KB06.E.03` | Die Berichterstattung enthält Trends und Empfehlungen zu Testzielen, Produktqualität und Produktrisiken.<br>*Reporting contains trends and recommendations on test objectives, product quality and product risks.* | M | T/D (6.2.2) | Berichten Sie Risikoabdeckung und Qualitätstrends je Produktrisiko. |
| `KB06.E.AI1` | 🤖 KI-gestützte Zusammenfassungen von Testergebnissen werden vor der Weitergabe fachlich geprüft.<br>*AI-generated summaries of test results are reviewed before being passed on.* | S | – | Legen Sie fest, wer KI-erzeugte Berichtstexte vor dem Versand prüft und freigibt. |

**OPTIMIEREND** – Die Berichterstattung stellt Informationen zur Verfügung, die zur Optimierung des Softwarelebenszyklus eingesetzt werden können.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB06.O.01` | Die Berichterstattung liefert Daten und/oder Messwerte, die für aktuelle und künftige Verbesserungen des Testprozesses und des Softwarelebenszyklus genutzt werden.<br>*Reporting provides data and/or measurements used for current and future improvements of the test process and the software life cycle.* | M | O/E (6.3.1) | Leiten Sie aus Berichtsdaten jährlich Verbesserungsmaßnahmen ab (z. B. mit dieser Anwendung). |
| `KB06.O.02` | Daten und Messwerte für die Prozessverbesserung werden bei Projektabschluss an die Linienorganisation übergeben.<br>*Data and measurements for process improvement are handed over to the line organisation at project closure.* | S | – | Nehmen Sie die Übergabe der Messdaten in die Projektabschluss-Checkliste auf. |

### KB07 – Testprozessmanagement / Test process management

*Das Testprozessmanagement optimiert die Ausführung des Testauftrags im Rahmen der festgelegten Zeit und Kosten sowie der geforderten Ergebnisse.*  
*Test process management optimises execution of the test assignment within the agreed time, cost and required results.*

**KONTROLLIERT** – Ein proaktives Management des Testprozesses ermöglicht die Erfüllung des Testauftrags.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB07.K.01` | Zu Beginn des Testprojekts wird ein Testplan erstellt; er enthält mindestens Testauftrag, Testumfang, Testplanung, Rollen und Verantwortlichkeiten.<br>*A test plan is created at the start of the test project; it contains at least the test assignment, scope, schedule, roles and responsibilities.* | S | – | Erstellen Sie einen schlanken Testplan nach Vorlage (Auftrag, Umfang, Termine, Rollen). |
| `KB07.K.02` | Der Testplan bzw. die Sprintplanung und das Backlog-Refinement sind mit dem Auftraggeber bzw. Product Owner abgestimmt.<br>*The test plan or sprint planning and backlog refinement are aligned with the principal or Product Owner.* | S | P/E (7.1.2) | Lassen Sie den Testplan bzw. die Testanteile der Sprintplanung vom Product Owner bestätigen. |
| `KB07.K.03` | Jede Testaktivität ist für das Team sichtbar, wird überwacht und bei Bedarf angepasst.<br>*Every test activity is visible to the team, monitored and adjusted where necessary.* | S | P/F (7.1.3) | Bilden Sie Testaktivitäten als eigene Aufgaben im Board ab. |
| `KB07.K.04` | Der Testplan bzw. die Definition of Done wird mit den relevanten Stakeholdern abgestimmt.<br>*The test plan or Definition of Done is aligned with relevant stakeholders.* | S | T/E (7.2.1) | Stimmen Sie Testplan bzw. Definition of Done in einem kurzen Review mit allen relevanten Stakeholdern ab. |
| `KB07.AG.11` | 🔄 Backlog und Definition of Done enthalten die durchzuführenden Testaktivitäten und die geforderte Qualität.<br>*The backlog and the Definition of Done include the test activities to be performed and the required quality.* | S | P/E (7.1.1) | Ergänzen Sie die Definition of Done um konkrete Test- und Qualitätskriterien. |

**EFFIZIENT** – Ein Testprozessmanagement mit eindeutigen Befugnissen ermöglicht sofortige Anpassungen, um das Testprojekt auf Kurs zu halten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB07.E.01` | Absehbare Abweichungen vom Testplan bzw. Backlog werden mit dem Auftraggeber und anderen relevanten Stakeholdern besprochen.<br>*Anticipated deviations from the test plan or backlog are discussed with the principal and other relevant stakeholders.* | S | T/F (7.2.2) | Machen Sie Planabweichungen zum festen Punkt im Refinement bzw. in Statusrunden. |
| `KB07.E.02` | Anpassungen des Testplans bzw. Backlogs werden dokumentiert, soweit von den Stakeholdern gefordert.<br>*Adjustments to the test plan or backlog are documented as required by stakeholders.* | S | T/F (7.2.3) | Führen Sie eine Änderungshistorie für den Testplan. |
| `KB07.E.03` | Der Testmanager bzw. das Team hat die Befugnis zur (Neu-)Zuordnung der Testressourcen.<br>*The test manager or the team has the authority to (re)allocate test resources.* | M | O/E (7.3.1) | Delegieren Sie die Entscheidung über Testressourcen formal an Testmanager bzw. Team. |

**OPTIMIEREND** – Erkenntnisse aus dem Testprozessmanagement fördern die Effektivität und Effizienz der Steuerung von Testprojekten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB07.O.01` | Das Testprozessmanagement wird regelmäßig bewertet, intern durch das Team bzw. die Testorganisation und gemeinsam mit den Stakeholdern.<br>*Test process management is evaluated regularly, internally by the team or test organisation and together with stakeholders.* | S | O/F (7.3.2) | Bewerten Sie Steuerung und Koordination der Tests in jeder Retrospektive und einmal jährlich mit den Stakeholdern. |
| `KB07.O.02` | Erkenntnisse aus früheren Testprojekten werden zur Verbesserung des Testprozessmanagements genutzt.<br>*Lessons learned from previous test projects are used to improve test process management.* | M | – | Pflegen Sie eine Lessons-Learned-Sammlung und prüfen Sie sie zu Projektbeginn. |

### KB08 – Kostenschätzung und Planung / Estimating and planning

*Der richtige Einsatz geeigneter Techniken ermöglicht eine realistische und verlässliche Kostenschätzung und Planung des Testprozesses.*  
*Proper use of suitable techniques enables realistic and reliable estimating and planning of the test process.*

**KONTROLLIERT** – Der benötigte Umfang an Ressourcen pro Aktivität wird prognostiziert.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB08.K.01` | Für die Schätzung des Testaufwands werden einfache Techniken eingesetzt, z. B. Verhältniswerte oder Planning Poker.<br>*Simple techniques are used to estimate test effort, e.g. ratios or planning poker.* | S | P/G (8.1.1) | Schätzen Sie Testaufwände explizit mit (z. B. im Planning Poker). |
| `KB08.K.02` | Für jede Aktivität ist bekannt, wann sie stattfindet, welche Ressourcen sie benötigt und welche Produkte sie liefert; berücksichtigt werden Testplanung, Testfallentwurf, Testdatenbereitstellung, Testdurchführung und Konservierung.<br>*For each activity it is known when it takes place, which resources it needs and which products it delivers; test planning, test case design, test data provision, execution and conservation are taken into account.* | S | P/F (8.1.2) | Verwenden Sie eine Checkliste der Testaktivitäten für jede Schätzung. |
| `KB08.K.03` | Abhängigkeiten zwischen Testphasen, Testarten bzw. Teams werden in der Planung dargestellt und mit den Stakeholdern besprochen.<br>*Dependencies between test phases, test types or teams are shown in the plan and discussed with stakeholders.* | S | T/G (8.2.1) | Visualisieren Sie Testabhängigkeiten (z. B. Abhängigkeitsboard bei mehreren Teams). |
| `KB08.K.04` | Testschätzungen und Testplanung werden mit dem Auftraggeber besprochen.<br>*Test estimates and planning are discussed with the principal.* | S | – | Stellen Sie die Testschätzung dem Auftraggeber vor und dokumentieren Sie seine Zustimmung. |

**EFFIZIENT** – Formale Techniken machen Kostenschätzung und Planung verlässlich.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB08.E.01` | Um ein möglichst zuverlässiges Ergebnis zu erzielen, kommen mindestens zwei Schätztechniken zum Einsatz.<br>*At least two estimating techniques are used to obtain a reliable result.* | S | – | Ergänzen Sie die bestehende Schätzung um eine zweite Technik (z. B. Analogieschätzung). |
| `KB08.E.02` | Testphasen und/oder Testaktivitäten werden mithilfe formaler Techniken geschätzt und geplant.<br>*Test phases and/or activities are estimated and planned using formal techniques.* | M | – | Führen Sie eine formale Schätztechnik ein (z. B. Testpunktanalyse). |
| `KB08.E.03` | Metriken (z. B. Burndown/Burnup, Velocity) werden definiert und gepflegt, um Schätzung und Planung zu unterstützen.<br>*Metrics (e.g. burndown/burnup, velocity) are defined and maintained to support estimating and planning.* | S | O/F (8.3.1) | Nutzen Sie Velocity und Burndown für die Planung von Testanteilen. |
| `KB08.E.04` | Die Testplanung sieht ein Testbarkeitsreview der Testbasis und eine Bewertung des Testprojekts vor.<br>*Test planning includes a testability review of the test basis and an evaluation of the test project.* | S | – | Planen Sie Testbarkeitsreview und Projektbewertung als feste Aktivitäten ein. |
| `KB08.E.AI1` | 🤖 Der Einfluss von KI-Werkzeugen auf den Testaufwand wird in Schätzungen berücksichtigt.<br>*The impact of AI tools on test effort is taken into account in estimates.* | S | – | Erfassen Sie Zeitersparnis bzw. Mehraufwand durch KI-Werkzeuge und berücksichtigen Sie sie in der Schätzung. |

**OPTIMIEREND** – Die Kostenschätzung basiert auf den Erfahrungswerten des Unternehmens.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB08.O.01` | Die Testplanung beinhaltet die Konservierung der Testware für die künftige Wiederverwendung.<br>*Test planning includes conserving testware for future reuse.* | S | – | Planen Sie Zeit für das Aufbereiten wiederverwendbarer Testware am Projektende ein. |
| `KB08.O.02` | Ein Satz von Schätztechniken und -prinzipien wird auf Unternehmensebene gepflegt.<br>*A set of estimating techniques and principles is maintained at organisational level.* | M | – | Stellen Sie unternehmensweit gültige Schätzverfahren und Vorlagen bereit. |
| `KB08.O.03` | Schlüsselzahlen für die festgelegten Schätztechniken werden auf Unternehmensebene zur Verfügung gestellt.<br>*Key figures for the defined estimating techniques are provided at organisational level.* | L | – | Sammeln Sie Ist-Aufwände projektübergreifend und leiten Sie Kennzahlen ab. |
| `KB08.AG.22` | 🔄 Die Schätztechniken werden in der Retrospektive bewertet.<br>*Estimating techniques are evaluated in the retrospective.* | S | T/F (8.2.2) | Vergleichen Sie in der Retrospektive Schätzung und Ist-Aufwand für Testaufgaben. |

### KB09 – Metriken / Metrics

*Metriken ermöglichen Objektivität durch die Quantifizierung von Beobachtungen.*  
*Metrics provide objectivity by quantifying observations.*

**KONTROLLIERT** – Die definierten Metriken ermöglichen die Bewertung und Überwachung des Testprozesses.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB09.K.01` | Im Testprozess werden Metriken definiert und verwendet, um das Testprojekt zu bewerten und zu überwachen.<br>*Metrics are defined and used in the test process to assess and monitor the test project.* | S | – | Definieren Sie 3–5 Basismetriken (z. B. Testfortschritt, offene Fehler nach Schwere). |
| `KB09.K.02` | Die Daten für die Metriken werden einheitlich erfasst und systematisch gespeichert; Mittel und Verfahren dazu sind dokumentiert.<br>*Data for metrics is collected uniformly and stored systematically; means and procedures are documented.* | S | O/C (9.3.1) | Dokumentieren Sie Datenquelle, Berechnung und Ablage jeder Metrik. |
| `KB09.K.03` | Die Eingabedaten für die Metriken sind nachweislich korrekt.<br>*The input data for metrics is demonstrably correct.* | M | – | Führen Sie Plausibilitätsprüfungen der Metrikdaten ein. |
| `KB09.AG.11` | 🔄 Grunddaten zum Testen werden erhoben und analysiert: Zeit für Testentwurf und -durchführung je Testfall, Anzahl vorbereiteter und durchgeführter Testfälle je Tag/Sprint/Projekt sowie Anteil der Testaktivitäten an der Gesamtteamarbeit.<br>*Basic testing data is collected and analysed: time for test design and execution per test case, number of test cases prepared and executed per day/sprint/project, and share of test activities in total team work.* | M | P/C (9.1.1) | Erfassen Sie Testaufwände und Testfallzahlen je Sprint im Werkzeug. |
| `KB09.K.AI1` | 🤖 Nutzung und Nutzen von KI-Werkzeugen werden mit einfachen Kennzahlen erfasst (z. B. Akzeptanzrate KI-generierter Testfälle).<br>*Use and benefit of AI tools are captured with simple metrics (e.g. acceptance rate of AI-generated test cases).* | S | – | Erfassen Sie, wie viele KI-Vorschläge übernommen, angepasst oder verworfen werden. |

**EFFIZIENT** – Die durch Metriken erzielte Objektivität rechtfertigt den Aufwand für Erfassung und Analyse der Messdaten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB09.E.01` | Der Aufwand für Erhebung, Analyse und Bewertung der Daten wird gegen den Nutzen (z. B. Informationsbedarf der Stakeholder) abgewogen.<br>*The effort for collecting, analysing and evaluating data is weighed against its benefit (e.g. stakeholder information needs).* | S | O/E (9.3.2) | Prüfen Sie jede Metrik jährlich auf Nutzen und streichen Sie ungenutzte. |
| `KB09.E.02` | Die Erhebung von Metriken steht nicht im Konflikt mit Fortschritt und Qualität des Testprozesses.<br>*Collecting metrics does not conflict with the progress and quality of the test process.* | S | – | Automatisieren Sie die Datenerhebung aus den Werkzeugen. |
| `KB09.E.03` | Im Testprozess werden Metriken definiert und verwendet, um die Effizienz des Testprozesses zu messen.<br>*Metrics are defined and used to measure the efficiency of the test process.* | M | – | Ergänzen Sie Effizienzmetriken (z. B. Fehlerfindungsrate, Testaufwand je Fehler). |
| `KB09.E.04` | Metriken werden in den Retrospektiven bzw. mit den Stakeholdern besprochen und Schlussfolgerungen umgesetzt.<br>*Metrics are discussed in retrospectives or with stakeholders and conclusions are implemented.* | S | T/C (9.2.1) | Nutzen Sie Metriken als Input für jede Retrospektive. |

**OPTIMIEREND** – Metriken werden dem sich ständig ändernden Informationsbedarf angepasst.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB09.O.01` | Es wird überwacht, wie Metriken zur Erfüllung des Informationsbedarfs beitragen.<br>*It is monitored how metrics contribute to meeting information needs.* | M | – | Befragen Sie die Empfänger regelmäßig zum Nutzen der Metriken. |
| `KB09.O.02` | Änderungen des Informationsbedarfs führen zu neuen oder optimierten Metriken.<br>*Changes in information needs lead to new or optimised metrics.* | M | – | Etablieren Sie einen einfachen Änderungsprozess für Metriken. |
| `KB09.O.AI1` | 🤖 Die Qualität KI-generierter Artefakte wird gemessen (z. B. Anteil fehlerhafter oder verworfener Vorschläge).<br>*The quality of AI-generated artefacts is measured (e.g. share of faulty or rejected suggestions).* | M | – | Bewerten Sie KI-Artefakte stichprobenartig nach festen Qualitätskriterien. |

### KB10 – Fehlermanagement / Defect management

*Das Fehlermanagement behandelt einzelne Fehler und Fehlergruppen; Grundursachen werden analysiert und Empfehlungen abgeleitet.*  
*Defect management handles individual defects and groups of defects; root causes are analysed and recommendations derived.*

**KONTROLLIERT** – Fehler werden einzeln verfolgt und der Fehlerstatus wird überwacht.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB10.K.01` | Der Fehlerlebenszyklus (einschließlich Fehlernachtest) ist definiert und wird angewandt.<br>*The defect life cycle (including retest) is defined and applied.* | S | – | Definieren Sie Fehlerstatus und Übergänge und bilden Sie sie im Werkzeug ab. |
| `KB10.K.02` | Für jeden (in eine Folgephase bzw. einen Folgesprint übertragenen) Fehler werden erfasst: eindeutige ID, zugehöriger Testfall, meldende Person, Datum, Schweregrad, Beschreibung (Reproduktionsschritte, erwartetes und beobachtetes Ergebnis) und Status.<br>*For each defect (carried over to a later phase or sprint) the following are recorded: unique ID, related test case, reporter, date, severity, description (steps to reproduce, expected and observed result) and status.* | S | P/D (10.1.2) | Machen Sie diese Attribute im Fehlerformular zu Pflichtfeldern. |
| `KB10.K.03` | Verantwortlichkeiten für die Fehlerbehandlung sind festgelegt (nicht nur Entwickler, auch Product Owner und Scrum Master).<br>*Responsibilities for defect handling are defined (not only developers but also Product Owner and Scrum Master).* | S | T/C (10.2.1) | Legen Sie fest, wer Fehler priorisiert, zuweist und schließt. |
| `KB10.K.04` | Alle an der Fehlerbewertung und -behandlung Beteiligten bzw. das gesamte Team haben Zugriff auf die Fehlerverwaltung (vorzugsweise ein Werkzeug).<br>*Everyone involved in defect evaluation and handling, or the whole team, has access to defect administration (preferably a tool).* | S | T/E (10.2.2) | Geben Sie allen Teammitgliedern Zugriff auf das Fehlerwerkzeug. |

**EFFIZIENT** – Gemeinsamkeiten von Fehlern werden analysiert, um ähnliche Fehler zu finden.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB10.E.01` | Das Fehlermanagementwerkzeug erlaubt Statusübergänge nur autorisierten Personen.<br>*The defect management tool allows status transitions only by authorised persons.* | S | – | Konfigurieren Sie Berechtigungen für Statusübergänge im Werkzeug. |
| `KB10.E.02` | Alle Beteiligten, Teams und Projekte verwenden dasselbe Fehlermanagementwerkzeug oder nahtlos verbundene Werkzeuge.<br>*All parties, teams and projects use the same defect management tool or seamlessly connected tools.* | M | O/D (10.3.1) | Konsolidieren Sie Fehlerwerkzeuge oder richten Sie eine Synchronisation ein. |
| `KB10.E.03` | Das Fehlermanagement bietet umfangreiche Berichtsmöglichkeiten (Filtern, Gruppieren, Sortieren).<br>*Defect management offers extensive reporting options (filtering, grouping, sorting).* | S | – | Richten Sie Standardberichte und Filter für Fehler ein. |
| `KB10.E.04` | Trends werden identifiziert; dazu werden zusätzlich Subsystem, Priorität, Programmversion, Testbasis-Version, Ursache, alle Statusübergänge und bearbeitende Person erfasst.<br>*Trends are identified; for this, subsystem, priority, program version, test basis version, root cause, all status transitions and resolver are also recorded.* | M | T/G (10.2.4) | Ergänzen Sie Ursachen- und Versionsfelder und werten Sie Trends monatlich aus. |
| `KB10.AG.11` | 🔄 Der Fehlerlebenszyklus ist so kurz wie möglich: Fehler werden im Sprint ihrer Entstehung behoben, besser noch bereits in Refinement, Planung oder bei der Erstellung der User Stories vermieden.<br>*The defect life cycle is as short as possible: defects are fixed in the sprint in which they were introduced, or better still prevented during refinement, planning or story creation.* | M | P/C (10.1.1) | Vereinbaren Sie, gefundene Fehler bevorzugt im laufenden Sprint zu beheben. |
| `KB10.AG.13` | 🔄 Entwickler bzw. Tester tragen aus Testsicht zur Risikoanalyse von Fehlern bei.<br>*Developers or testers contribute to the risk analysis of defects from a testing perspective.* | S | P/E (10.1.3) | Bewerten Sie bei jedem Fehler gemeinsam das Risiko für weitere Bereiche. |
| `KB10.AG.23` | 🔄 Fehler werden in den Retrospektiven analysiert, um die Qualität des Testobjekts einzuschätzen.<br>*Defects are analysed in retrospectives to indicate the quality of the test object.* | S | T/F (10.2.3) | Nehmen Sie eine kurze Fehleranalyse in jede Retrospektive auf. |
| `KB10.E.AI1` | 🤖 KI unterstützt bei Duplikaterkennung, Klassifizierung und Priorisierung von Fehlermeldungen.<br>*AI supports duplicate detection, classification and prioritisation of defect reports.* | M | – | Erproben Sie KI-gestützte Duplikaterkennung im Fehlerwerkzeug. |

**OPTIMIEREND** – Fehler werden nach Gemeinsamkeiten analysiert, um künftige Fehler zu vermeiden.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB10.O.01` | Richtlinien für das Fehlermanagement werden von der Linienorganisation oder dem Projektmanagement bereitgestellt und in jedem Projekt angewandt.<br>*Defect management guidelines are provided by the line organisation or project management and applied in every project.* | M | – | Erstellen Sie eine projektübergreifende Fehlermanagement-Richtlinie. |
| `KB10.O.02` | Das Fehlermanagement liegt in der Verantwortung der Linien- oder Projektorganisation; der Testprozess liefert die notwendigen Daten.<br>*Defect management is the responsibility of the line or project organisation; the test process provides the necessary data.* | M | – | Übertragen Sie die Verantwortung für das Fehlermanagement formal der Linien- bzw. Projektorganisation. |
| `KB10.O.03` | Fehler werden auf Projekt- bzw. Programmebene nach Gemeinsamkeiten analysiert; daraus werden Verbesserungen abgeleitet, um künftige Fehler zu vermeiden.<br>*Defects are analysed for commonalities at project or programme level; improvements are derived to prevent future defects.* | L | O/E (10.3.2) | Führen Sie quartalsweise Ursachenanalysen durch und verfolgen Sie die abgeleiteten Maßnahmen. |
| `KB10.O.AI1` | 🤖 KI-gestützte Ursachenanalyse und Fehlervorhersage werden zur Prozessverbesserung genutzt.<br>*AI-based root cause analysis and defect prediction are used for process improvement.* | L | – | Nutzen Sie die Fehlerhistorie für KI-gestützte Ursachen- und Vorhersageanalysen. |

### KB11 – Testwaremanagement / Testware management

*Das Testwaremanagement gewährleistet die Stimmigkeit zwischen den Testprodukten untereinander sowie mit den zugehörigen Entwurfsdokumenten.*  
*Testware management ensures consistency among test products and with the related design documents.*

**KONTROLLIERT** – Alle verwendeten und freigegebenen Test- und Entwurfsdokumente werden einzeln identifiziert und erfasst.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB11.K.01` | Testbasis, Testobjekt und die gesamte Testware (Skripte, Daten, Pläne) sind durch Name und Version identifiziert.<br>*The test basis, test object and all testware (scripts, data, plans) are identified by name and version.* | S | P/F (11.1.1) | Versionieren Sie Testware im Werkzeug bzw. Repository. |
| `KB11.K.02` | Jeder Testfall bezieht sich auf ein Dokument der Testbasis.<br>*Each test case refers to a document of the test basis.* | S | – | Verknüpfen Sie jeden Testfall mit der zugehörigen Anforderung bzw. User Story. |
| `KB11.K.03` | Das Testteam bzw. jedes Teammitglied hat Zugang zu allen Objekten des Testwaremanagements.<br>*The test team or every team member has access to all objects under testware management.* | S | T/G (11.2.1) | Prüfen und vergeben Sie Zugriffsrechte auf Testware-Ablagen. |
| `KB11.K.04` | Das Verfahren und die logische Struktur zur Verwaltung von Testware, Testdaten, Testbasis und Testobjekt sind beschrieben und dem Team bekannt.<br>*The procedure and logical structure for managing testware, test data, test basis and test object are described and known to the team.* | S | T/F (11.2.2) | Beschreiben Sie Ablagestruktur und Konventionen auf einer Wiki-Seite. |
| `KB11.K.AI1` | 🤖 KI-generierte Testware wird wie andere Testware versioniert und ist als KI-generiert erkennbar.<br>*AI-generated testware is versioned like other testware and recognisable as AI-generated.* | S | – | Kennzeichnen Sie KI-generierte Testfälle bzw. Skripte mit einem Attribut oder Tag. |

**EFFIZIENT** – Die Beziehungen zwischen allen (Test-)Produkten sind bekannt und werden aktuell gehalten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB11.E.01` | Testbasis, Testobjekt und Testware werden durch Name und Version eindeutig identifiziert, auch über Teams hinweg.<br>*The test basis, test object and testware are uniquely identified by name and version, also across teams.* | M | – | Führen Sie eindeutige, teamübergreifende Namens- und Versionskonventionen ein. |
| `KB11.E.02` | Es besteht transparente Rückverfolgbarkeit von den Testfällen zur Testbasis bzw. zu den Anforderungen.<br>*There is transparent traceability from test cases to the test basis or requirements.* | M | P/G (11.1.2) | Nutzen Sie Verknüpfungen bzw. eine Traceability-Matrix zwischen Anforderungen und Testfällen. |
| `KB11.E.03` | Das Testwaremanagement wird durch eine logische Speicherstruktur mit Rollen- und Berechtigungskonzept unterstützt.<br>*Testware management is supported by a logical storage structure with roles and permissions.* | M | – | Richten Sie ein Rollen- und Berechtigungskonzept für Testware ein. |

**OPTIMIEREND** – Testware wird für die Wiederverwendung in künftigen Projekten bereitgestellt und tatsächlich wiederverwendet.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB11.O.01` | Zu Projektbeginn wird vereinbart und im Verlauf überprüft, welche Testware am Projektende konserviert wird.<br>*At project start it is agreed, and reviewed during the project, which testware is conserved at the end.* | S | – | Legen Sie im Testplan fest, welche Testware erhalten bleibt. |
| `KB11.O.02` | Richtlinien zur Konservierung von Testware für die projektübergreifende Wiederverwendung stehen zur Verfügung; der Nutzen der Wiederverwendung wird gemessen.<br>*Guidelines for conserving testware for cross-project reuse are available; the benefit of reuse is measured.* | M | O/F (11.3.1) | Erstellen Sie eine Richtlinie zur Testware-Konservierung und messen Sie die Wiederverwendung. |
| `KB11.O.03` | Für die Übergabe an Wartung bzw. Folgeprojekte gibt es ein Verfahren; zu wartende Testware ist leicht von nicht zu wartender trennbar.<br>*There is a procedure for handing testware over to maintenance or follow-up projects; testware to be maintained is easily separated from the rest.* | M | O/G (11.3.2) | Kennzeichnen Sie Testware nach Wartungsstatus und definieren Sie ein Übergabeverfahren. |

### KB12 – Methodisches Vorgehen / Methodology practice

*Eine beschriebene Testmethode lenkt und unterstützt die Testprojekte.*  
*A described test method guides and supports test projects.*

**KONTROLLIERT** – Eine beschriebene Testmethode ermöglicht eine vorhersehbare Ausführung der Testaktivitäten.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB12.K.01` | Der Testprozess folgt einer dokumentierten Testmethode bzw. Richtlinie, die Testaktivitäten, zu liefernde Testprodukte und Anforderungen an die Arbeitsweise beschreibt.<br>*The test process follows a documented test method or guideline describing test activities, test products to deliver and requirements on the way of working.* | M | P/D (12.1.1) | Dokumentieren Sie eine schlanke Testmethode bzw. übernehmen Sie einen Standard (z. B. TMap, ISTQB). |
| `KB12.K.02` | Die Testmethode passt zur Entwicklungsmethode des Projekts.<br>*The test method fits the development method used by the project.* | M | – | Gleichen Sie die Testmethode mit dem Vorgehensmodell (z. B. Scrum) ab. |
| `KB12.K.03` | Die Testprojekte bzw. Teams halten die Testmethode für zweckmäßig; ihre praktische Anwendung wird im Team bewertet.<br>*Test projects or teams consider the test method useful; its practical use is evaluated in the team.* | S | T/D (12.2.1) | Holen Sie regelmäßig Feedback der Teams zur Testmethode ein. |

**EFFIZIENT** – Die beschriebene Testmethode bietet praktische Unterstützung für die Testprojekte.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB12.E.01` | Die Testmethode beschreibt für alle Testaktivitäten Ziel, verantwortliche Rolle, Werkzeuge und Techniken sowie Vorbedingungen.<br>*The test method describes for all test activities the goal, responsible role, tools and techniques and preconditions.* | M | O/D (12.3.1) | Ergänzen Sie die Methode um eine Aktivitätenübersicht mit Ziel, Rolle und Vorbedingungen. |
| `KB12.E.02` | Ein vollständiger Satz an Vorlagen ist Teil der Testmethode.<br>*A complete set of templates is part of the test method.* | M | O/E (12.3.2) | Stellen Sie Vorlagen für Testplan, Testfall, Fehler und Bericht bereit. |
| `KB12.E.03` | Obligatorische, konditionale und optionale Elemente der Testmethode sind gekennzeichnet.<br>*Mandatory, conditional and optional elements of the test method are marked.* | S | O/F (12.3.3) | Kennzeichnen Sie Methodenelemente als Pflicht, bedingt oder optional. |
| `KB12.E.04` | Die obligatorischen und bedingten Elemente werden in der Praxis umgesetzt.<br>*Mandatory and conditional elements are applied in practice.* | M | – | Prüfen Sie die Anwendung der Pflichtelemente stichprobenartig. |
| `KB12.E.AI1` | 🤖 Die Testmethode beschreibt KI-gestützte Aktivitäten inklusive Rollen, Prüf- und Freigabepunkten.<br>*The test method describes AI-supported activities including roles, review and approval points.* | M | – | Ergänzen Sie die Testmethode um KI-gestützte Aktivitäten mit Freigabepunkten. |

**OPTIMIEREND** – Abweichungen von der Testmethode werden bewertet und führen zu einer Verbesserung der Methode.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB12.O.01` | Testteams geben strukturiert Rückmeldung zur Testmethode.<br>*Test teams give structured feedback on the test method.* | S | – | Richten Sie einen Feedbackkanal (z. B. Formular, Retro-Thema) zur Testmethode ein. |
| `KB12.O.02` | Die Testmethode bzw. Testpraxis wird regelmäßig bewertet und kontinuierlich weiterentwickelt.<br>*The test method or practice is evaluated periodically and continuously improved.* | M | O/G (12.3.4) | Planen Sie eine jährliche Überarbeitung der Testmethode. |

### KB13 – Professionalität der Tester / Tester professionalism

*Zur Professionalität der Tester gehört die geeignete Mischung aus Fähigkeiten, Kompetenzen, Fachgebieten und Kenntnissen, um die Testaktivitäten auf dem geforderten Niveau durchzuführen.*  
*Tester professionalism comprises the right mix of skills, competences, domains and knowledge to perform test activities at the required level.*

**KONTROLLIERT** – Spezifische Fähigkeiten der Tester in der Anwendung von Testmethoden verbessern Planbarkeit und Kontrollierbarkeit des Testprozesses.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB13.K.01` | Die Tester bzw. Entwickler mit Testrolle haben eine Testschulung (insbesondere zu Test Engineering und Testfallentwurf) erhalten oder verfügen über ausreichende Erfahrung im strukturierten Testen.<br>*Testers or developers with a test role have received test training (especially test engineering and test case design) or have sufficient experience in structured testing.* | M | P/A (13.1.1) | Planen Sie eine Basisschulung im strukturierten Testen für alle mit Testrolle ein. |
| `KB13.K.02` | Die Grundlagen der eingesetzten Testmethode (z. B. TMap, ISTQB) sind den Testern bzw. Entwicklern bekannt und werden angewandt.<br>*The essentials of the test method used (e.g. TMap, ISTQB) are known to and applied by testers or developers.* | S | P/B (13.1.2) | Führen Sie eine kurze Methodeneinführung für alle Teammitglieder durch. |
| `KB13.K.03` | Das benötigte Fach-, Branchen- und technische Wissen ist dem Team bei Bedarf zugänglich.<br>*The required business, industry and technical knowledge is accessible to the team when needed.* | S | T/A (13.2.1) | Benennen Sie Ansprechpartner für Fach- und Technikfragen. |
| `KB13.K.04` | Testfähigkeiten werden regelmäßig mit Team und Management anhand von Erwartungen besprochen und bewertet.<br>*Testing skills are discussed and evaluated against expectations regularly with team and management.* | S | P/D (13.1.4) | Nehmen Sie Testkompetenzen in Mitarbeitergespräche auf. |
| `KB13.K.AI1` | 🤖 Tester verfügen über Grundkenntnisse in der Nutzung generativer KI (z. B. Prompting, Grenzen, Halluzinationen).<br>*Testers have basic knowledge of using generative AI (e.g. prompting, limitations, hallucinations).* | S | – | Bieten Sie eine kurze Einführung in generative KI für das Testen an. |

**EFFIZIENT** – Das Testpersonal hat spezifische Testrollen und erfüllt seine Aufgaben erwartungsgemäß.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB13.E.01` | Die Tester sind im Softwaretest zertifiziert (z. B. TMap NEXT, ISTQB); die Organisation stellt Schulungs- und Zertifizierungsmöglichkeiten bereit.<br>*Testers are certified in software testing (e.g. TMap NEXT, ISTQB); the organisation provides training and certification facilities.* | M | O/B (13.3.1) | Ermöglichen Sie Zertifizierungen (z. B. ISTQB Foundation) mit Budget und Lernzeit. |
| `KB13.E.02` | Die Tester können das Prinzip der gewählten Techniken erklären und ihre Anwendung begründen.<br>*Testers can explain the principle behind the chosen techniques and justify their use.* | M | – | Üben Sie Testentwurfsverfahren in Workshops an echten Beispielen. |
| `KB13.E.03` | Die Tester üben ihren Beruf gerne aus und haben eine gute Beziehung zu anderen Berufsgruppen im Projekt.<br>*Testers enjoy their work and have good relations with other disciplines in the project.* | M | – | Erheben Sie Zufriedenheit und Zusammenarbeit in Teamumfragen. |
| `KB13.E.04` | Testaufgaben werden erwartungsgemäß definiert, zugewiesen und durchgeführt.<br>*Test tasks are defined, assigned and performed as expected.* | S | – | Prüfen Sie in der Retrospektive, ob Testaufgaben wie geplant erledigt wurden. |
| `KB13.AG.13` | 🔄 Individuelles Wissen und Können wird im Team geteilt, z. B. indem andere mittesten.<br>*Individual knowledge and skills are shared with the team, e.g. by letting others test.* | S | P/B (13.1.3) | Führen Sie Pair-Testing bzw. Wissensaustausch-Sessions ein. |
| `KB13.E.AI1` | 🤖 Tester verfügen über eine KI-bezogene Qualifizierung (z. B. ISTQB CT-AI oder CT-GenAI).<br>*Testers hold an AI-related qualification (e.g. ISTQB CT-AI or CT-GenAI).* | M | – | Ermöglichen Sie ausgewählten Testern eine KI-Zertifizierung. |

**OPTIMIEREND** – Das Testpersonal handelt aus dem Blickwinkel der Qualitätssicherung und entwickelt seine Fähigkeiten kontinuierlich weiter.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB13.O.01` | Die Tester nehmen an Fachgruppen teil, besuchen Seminare oder lesen Fachliteratur; die Organisation ermöglicht dies.<br>*Testers take part in special interest groups, attend seminars or read literature; the organisation enables this.* | S | O/C (13.3.2) | Ermöglichen Sie die Teilnahme an Testcommunities und Konferenzen. |
| `KB13.O.02` | Testfunktionen werden vom Personalmanagement berücksichtigt und sind Teil der beruflichen Laufbahn im Unternehmen.<br>*Test roles are recognised by HR and form part of career paths in the organisation.* | L | – | Definieren Sie mit dem Personalbereich einen Karrierepfad für Testrollen. |
| `KB13.O.03` | Die Tester übernehmen Verantwortung für ihre Arbeit und streben eine kontinuierliche Verbesserung ihres Arbeitsprozesses an.<br>*Testers take responsibility for their work and strive to continuously improve their work process.* | M | – | Vereinbaren Sie individuelle Verbesserungsziele mit den Testern. |

### KB14 – Testfalldesign / Test case design

*Das Testfalldesign steuert die Testdurchführung mit dem Ziel, die Fehlersuche an der Teststrategie auszurichten.*  
*Test case design steers test execution with the aim of aligning defect detection with the test strategy.*

**KONTROLLIERT** – Die Testfälle machen die Testdurchführung wiederholbar und personenunabhängig.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB14.K.01` | Testfälle werden – auf Basis einer bewussten, risiko- und strategiebasierten Entscheidung – auf logischer Ebene mit Vorlage oder Werkzeug dokumentiert.<br>*Test cases are documented at logical level using a template or tool, based on a deliberate, risk- and strategy-based choice.* | S | P/C (14.1.1) | Legen Sie fest, welche Testfälle dokumentiert werden, und nutzen Sie eine einheitliche Vorlage. |
| `KB14.K.02` | Jeder dokumentierte Testfall enthält Ausgangssituation, durchzuführende Testaktionen, vorhergesagtes Ergebnis und benötigte Testdaten.<br>*Each documented test case contains initial situation, test actions to perform, predicted result and required test data.* | S | P/D (14.1.2) | Machen Sie diese Elemente zu Pflichtfeldern im Testfall. |
| `KB14.K.03` | Testfälle bzw. Testskripte verweisen auf den Teil der Testbasis (z. B. Use Case, User Story), der das getestete Systemverhalten beschreibt.<br>*Test cases or scripts reference the part of the test basis (e.g. use case, user story) that describes the tested behaviour.* | S | P/E (14.1.3) | Verknüpfen Sie Testfälle mit User Stories bzw. Anforderungen. |

**EFFIZIENT** – Der Entwurf von Testfällen, die auf eine spezifische Überdeckung abzielen, unterstützt eine systematische Umsetzung der Teststrategie.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB14.E.01` | Testfälle können von anderen Fachleuten der Testorganisation verstanden und gewartet werden.<br>*Test cases can be understood and maintained by other professionals in the test organisation.* | S | – | Führen Sie Peer-Reviews für Testfälle ein. |
| `KB14.E.02` | Die durch die Testfälle erreichte Überdeckung der Testbasis ist bekannt und klar ausgewiesen.<br>*The coverage of the test basis achieved by the test cases is known and clearly indicated.* | M | T/C (14.2.1) | Weisen Sie die Anforderungsüberdeckung im Testwerkzeug aus. |
| `KB14.E.03` | Es werden formale Testdesigntechniken eingesetzt, um Testfälle zu entwerfen.<br>*Formal test design techniques are used to design test cases.* | M | – | Wenden Sie z. B. Äquivalenzklassen und Grenzwertanalyse verbindlich an. |
| `KB14.E.04` | Für Qualitätsmerkmale, für die keine Testfälle entworfen werden können (z. B. Benutzbarkeit), werden Checklisten oder Reviews eingesetzt.<br>*Checklists or reviews are used for quality characteristics that cannot be covered by test cases (e.g. usability).* | S | T/D (14.2.2) | Erstellen Sie Checklisten für nicht-funktionale Qualitätsmerkmale. |
| `KB14.E.AI1` | 🤖 KI erzeugt aus der Testbasis Testfallvorschläge unter Vorgabe von Testentwurfsverfahren; Tester prüfen und übernehmen sie.<br>*AI generates test case suggestions from the test basis using specified test design techniques; testers review and adopt them.* | S | – | Erproben Sie KI-generierte Testfallvorschläge mit festem Review-Schritt. |

**OPTIMIEREND** – Die Bewertung von Testfällen, Testdesigntechniken und Fehlern erhöht die Testeffektivität.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB14.O.01` | Fehler aus späteren Teststufen oder der Produktion werden analysiert, um Treffsicherheit und Effektivität der Testfälle zu verbessern.<br>*Defects from later test levels or production are analysed to improve the accuracy and effectiveness of test cases.* | M | T/F (14.2.3) | Ergänzen Sie für jeden Produktionsfehler einen Regressionstestfall und prüfen Sie die Ursache der Lücke. |
| `KB14.O.02` | Testfälle werden von unabhängiger Seite auf Gültigkeit und Wartbarkeit geprüft.<br>*Test cases are independently reviewed for validity and maintainability.* | M | – | Lassen Sie Testfälle stichprobenartig von einem anderen Team prüfen. |
| `KB14.O.03` | Testdesigntechniken und Checklisten werden bewertet, angepasst und für die Wiederverwendung gepflegt.<br>*Test design techniques and checklists are evaluated, adjusted and maintained for reuse.* | M | O/F (14.3.1) | Pflegen Sie eine gemeinsame Sammlung bewährter Techniken und Checklisten. |
| `KB14.O.AI1` | 🤖 Abdeckungslücken und redundante Testfälle werden KI-gestützt identifiziert.<br>*Coverage gaps and redundant test cases are identified with AI support.* | M | – | Lassen Sie den Testfallbestand KI-gestützt auf Lücken und Dubletten analysieren. |

### KB15 – Testwerkzeuge / Test tools

*Testwerkzeuge ermöglichen oder beschleunigen testspezifische Aktivitäten.*  
*Test tools enable or accelerate test-specific activities.*

**KONTROLLIERT** – Testwerkzeuge, die für testspezifische Aktivitäten benötigt werden, stehen zur Verfügung und werden eingesetzt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB15.K.01` | Die zur Durchführung testspezifischer Aktivitäten und zum Erreichen der Testziele benötigten Werkzeuge stehen dem Team zur Verfügung und werden genutzt.<br>*The tools needed to perform test-specific activities and achieve test objectives are available to the team and used.* | S | – | Ermitteln Sie fehlende Werkzeuge und stellen Sie sie bereit. |
| `KB15.K.02` | Kenntnisse über die eingesetzten Werkzeuge sind vorhanden; Schulungen zur richtigen Nutzung werden angeboten und wahrgenommen.<br>*Knowledge of the tools used is available; training in their proper use is offered and attended.* | S | T/A (15.2.1) | Bieten Sie Werkzeugschulungen an und dokumentieren Sie Kurzanleitungen. |
| `KB15.K.03` | Alle Beteiligten, inklusive Einkauf, halten die eingesetzten Testwerkzeuge für nützlich.<br>*All parties, including purchasing, consider the test tools used to be useful.* | S | – | Holen Sie Feedback der Beteiligten zu den Werkzeugen ein. |
| `KB15.AG.11` | 🔄 Regressionstests werden mit einem Werkzeug automatisiert durchgeführt.<br>*Regression testing is performed automatically with a tool.* | M | P/A (15.1.1) | Automatisieren Sie die wichtigsten Regressionstests (z. B. mit Playwright) und lassen Sie sie in der CI laufen. |
| `KB15.AG.31` | 🔄 Wartung, Know-how und Support für die eingesetzten Testwerkzeuge sind verfügbar.<br>*Maintenance, knowledge and support for the test tools in use are available.* | S | O/A (15.3.1) | Benennen Sie Werkzeugverantwortliche und regeln Sie den Support. |
| `KB15.K.AI1` | 🤖 Für KI-gestützte Testwerkzeuge existiert eine Freigabe- und Bewertungsliste.<br>*An approval and evaluation list exists for AI-based test tools.* | S | – | Führen Sie eine Liste freigegebener KI-Testwerkzeuge mit Bewertung. |

**EFFIZIENT** – Testwerkzeuge werden eingesetzt, um testspezifische Aktivitäten zu beschleunigen.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB15.E.01` | Die Werkzeuge wurden ausgewählt bzw. werden bewertet, um schneller, kostengünstiger und besser zu testen oder den Testprozess beherrschbarer zu machen.<br>*Tools were selected or are evaluated to test faster, cheaper and better or to make the test process more manageable.* | M | O/B (15.3.2) | Bewerten Sie Werkzeuge anhand von Zeit-, Kosten- und Qualitätskriterien. |
| `KB15.E.02` | Die Testwerkzeuge stehen den Testern jederzeit zur Verfügung.<br>*Test tools are available to testers at any time.* | S | P/A (15.1.2) | Sorgen Sie für ausreichende Lizenzen und Verfügbarkeit der Werkzeuge. |
| `KB15.E.03` | Für jedes eingeführte Testwerkzeug wurde ein Business Case erstellt.<br>*A business case was created for every test tool introduced.* | M | – | Erstellen Sie für neue Werkzeuge einen kurzen Business Case. |
| `KB15.E.04` | Die Nutzung der Testwerkzeuge ist in den Testprozess integriert.<br>*The use of test tools is integrated into the test process.* | M | – | Beschreiben Sie Werkzeugeinsatz je Testaktivität in der Testmethode. |
| `KB15.E.AI1` | 🤖 Automatisierte Testskripte (z. B. Playwright) werden KI-gestützt erstellt bzw. gewartet und durchlaufen ein Code-Review.<br>*Automated test scripts (e.g. Playwright) are created or maintained with AI support and undergo code review.* | S | – | Nutzen Sie KI-Assistenten für Testskripte und machen Sie Code-Reviews verpflichtend. |
| `KB15.E.AI2` | 🤖 KI-gestützte Selbstheilung von Selektoren bzw. Wartungsvorschläge reduzieren den Pflegeaufwand der Testautomatisierung.<br>*AI-based self-healing of selectors or maintenance suggestions reduce the upkeep of test automation.* | M | – | Erproben Sie Self-Healing bzw. KI-Wartungsvorschläge in einem Pilotprojekt. |

**OPTIMIEREND** – Testwerkzeuge und ihr Einsatz werden kontinuierlich bewertet und verbessert.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB15.O.01` | Eine Werkzeugrichtlinie ist für alle (agilen) Aktivitäten definiert und mit der Testrichtlinie konsistent.<br>*A tool policy is defined for all (agile) activities and kept consistent with the test policy.* | M | O/C (15.3.3) | Erstellen Sie eine Werkzeugrichtlinie und gleichen Sie sie mit der Testrichtlinie ab. |
| `KB15.O.02` | Expertise, Best Practices und von Werkzeugen erzeugte Testprodukte werden gesammelt und für künftige Projekte veröffentlicht.<br>*Expertise, best practices and tool-generated test products are collected and published for future projects.* | M | – | Richten Sie eine Wissenssammlung zu Werkzeugen und Automatisierung ein. |
| `KB15.O.03` | Testwerkzeuge werden regelmäßig daraufhin bewertet, ob die Ziele aus Business Case und Werkzeugrichtlinie erreicht werden.<br>*Test tools are regularly evaluated against the goals of the business case and tool policy.* | M | – | Führen Sie eine jährliche Werkzeugbewertung durch. |
| `KB15.O.AI1` | 🤖 Der Einsatz von KI-Agenten für explorative oder autonome Testausführung wird erprobt und bewertet.<br>*The use of AI agents for exploratory or autonomous test execution is trialled and evaluated.* | L | – | Führen Sie ein begrenztes Experiment mit KI-Testagenten durch und bewerten Sie die Ergebnisse. |

### KB16 – Testumgebung / Test environment

*Die Testumgebung ist in Entwurf, Implementierung und Wartung auf die Ziele der jeweiligen Teststufe abgestimmt.*  
*The test environment is designed, implemented and maintained in line with the goals of the respective test level.*

**KONTROLLIERT** – Änderungen der Testumgebung geschehen nicht unerwartet.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB16.K.01` | Die Anforderungen an Testumgebung (Konfiguration) und Testdaten sind dokumentiert bzw. zu Beginn der Iteration klar definiert.<br>*Requirements for the test environment (configuration) and test data are documented or clearly defined at the start of the iteration.* | S | P/A (16.1.2) | Dokumentieren Sie Umgebungs- und Testdatenbedarf je Release bzw. Sprint. |
| `KB16.K.02` | Mit den bereitstellenden Parteien sind Arbeitsvereinbarungen (Aufgaben, Verantwortlichkeiten, Verfügbarkeit) getroffen und abgestimmt.<br>*Working agreements (tasks, responsibilities, availability) are made and aligned with the parties providing the environment.* | S | T/B (16.2.1) | Schließen Sie Vereinbarungen zur Umgebungsverfügbarkeit mit Betrieb bzw. Dienstleister. |
| `KB16.K.03` | Die Testumgebung steht dem Team für die vereinbarte Zeit zur Verfügung.<br>*The test environment is available to the team for the agreed time.* | M | – | Messen Sie die Verfügbarkeit der Testumgebung und eskalieren Sie Ausfälle. |
| `KB16.K.04` | Der Testmanager wird rechtzeitig informiert, wenn eine Änderung der Testumgebung geplant ist.<br>*The test manager is informed in time when a change to the test environment is planned.* | S | – | Führen Sie einen Änderungskalender für Testumgebungen. |

**EFFIZIENT** – Die Testumgebung geht gezielt auf die Anforderungen der jeweiligen Teststufe oder Testart ein.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB16.E.01` | Die Abnahme bzw. Prüfung (Verfügbarkeit, Funktion) der Testumgebung erfolgt anhand einer vorab erstellten Checkliste.<br>*Acceptance or checking (availability, function) of the test environment is done with a predefined checklist.* | S | P/C (16.1.3) | Erstellen Sie eine Abnahme-Checkliste bzw. automatisierte Smoke-Tests für die Umgebung. |
| `KB16.E.02` | Ein logischer und funktionaler Entwurf der Testumgebung (Anwendungen, Systeme, Verbindungen, Stubs, Treiber/Mocks) liegt vor und wird gepflegt.<br>*A logical and functional design of the test environment (applications, systems, connections, stubs, drivers/mocks) exists and is maintained.* | M | O/B (16.3.1) | Erstellen Sie ein Architekturdiagramm der Testumgebung inkl. Mocks. |
| `KB16.E.03` | Lieferanten stellen einen technischen Entwurf der Testumgebung bereit, der formal vom Testmanager oder Testumgebungsexperten abgenommen wird.<br>*Suppliers provide a technical design of the test environment that is formally accepted by the test manager or environment specialist.* | M | O/C (16.3.2) | Fordern Sie einen technischen Entwurf vom Lieferanten an und nehmen Sie ihn formal ab. |
| `KB16.E.04` | Vereinbarungen mit Lieferanten haben den Charakter eines Service Level Agreements.<br>*Agreements with suppliers have the character of a service level agreement.* | L | – | Überführen Sie Umgebungsvereinbarungen in SLAs mit messbaren Kennzahlen. |
| `KB16.AG.11` | 🔄 (Automatisierte) Testfälle können auf allen relevanten Umgebungen ausgeführt werden.<br>*(Automated) test cases can be run on all relevant environments.* | M | P/A (16.1.1) | Parametrisieren Sie automatisierte Tests für alle Zielumgebungen. |
| `KB16.E.AI1` | 🤖 Synthetische, datenschutzkonforme Testdaten werden KI-gestützt erzeugt.<br>*Synthetic, privacy-compliant test data is generated with AI support.* | M | – | Erproben Sie die KI-gestützte Erzeugung synthetischer Testdaten. |

**OPTIMIEREND** – Testumgebungen werden den Testern als Dienstleistung zur Verfügung gestellt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB16.O.01` | Die Verantwortung für Testumgebungen und Testdaten liegt eindeutig bei einer Abteilung.<br>*Responsibility for test environments and test data clearly lies with one department.* | M | O/D (16.3.3) | Benennen Sie eine verantwortliche Abteilung für Testumgebungen und Testdaten. |
| `KB16.O.02` | Die Verwendung von Testumgebungen ist in einem Standardvertrag festgehalten.<br>*The use of test environments is laid down in a standard contract.* | L | – | Erstellen Sie einen Standardvertrag für die Nutzung von Testumgebungen. |
| `KB16.O.03` | Ein Leistungsverzeichnis legt fest, welche Dienstleistungen zur Testumgebung gehören und welche nicht.<br>*A service catalogue defines which services belong to the test environment and which do not.* | M | – | Erstellen Sie ein Leistungsverzeichnis für Testumgebungs-Services. |
| `KB16.O.AI1` | 🤖 Logs und Monitoringdaten der Testumgebung werden KI-gestützt auf Auffälligkeiten analysiert.<br>*Logs and monitoring data of the test environment are analysed for anomalies with AI support.* | M | – | Lassen Sie Testumgebungs-Logs KI-gestützt auf Anomalien auswerten. |

### KB17 – KI-Governance, Ethik und Kompetenz / AI governance, ethics and literacy 🤖

*Klare Regeln, Verantwortlichkeiten und Kompetenzen sorgen für einen sicheren, rechtskonformen und wirksamen Einsatz von KI in Entwicklung und Qualitätssicherung.*  
*Clear rules, responsibilities and competences ensure safe, compliant and effective use of AI in development and quality assurance.*

**KONTROLLIERT** – Der KI-Einsatz ist geregelt: zulässige Werkzeuge, Datenklassen, Verantwortlichkeiten und Grundkompetenzen sind festgelegt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB17.K.01` | 🤖 Es existiert eine schriftliche KI-Richtlinie, die zulässige KI-Werkzeuge und zulässige Datenklassen festlegt.<br>*A written AI policy exists that defines permitted AI tools and permitted data classes.* | M | – | Erstellen Sie eine kompakte KI-Richtlinie (zugelassene Tools, erlaubte und verbotene Daten). |
| `KB17.K.02` | 🤖 Eine verantwortliche Person bzw. Rolle für den KI-Einsatz in Entwicklung und QS ist benannt und bekannt.<br>*A person or role responsible for AI use in development and QA is named and known.* | S | – | Benennen Sie eine verantwortliche Person für den KI-Einsatz und machen Sie sie bekannt. |
| `KB17.K.03` | 🤖 Vertrauliche und personenbezogene Daten (z. B. Produktions- oder Kundendaten) werden nachweislich nicht in nicht freigegebene KI-Dienste eingegeben.<br>*Confidential and personal data (e.g. production or customer data) is demonstrably not entered into non-approved AI services.* | S | – | Sensibilisieren Sie alle Mitarbeitenden und sperren Sie nicht freigegebene KI-Dienste technisch, wo möglich. |
| `KB17.K.04` | 🤖 Alle Mitarbeitenden, die KI nutzen, haben eine Grundschulung zu Chancen, Grenzen und Risiken erhalten (KI-Kompetenz).<br>*All staff using AI have received basic training on opportunities, limits and risks (AI literacy).* | M | – | Führen Sie eine verpflichtende KI-Grundschulung durch (auch im Hinblick auf den EU AI Act). |

**EFFIZIENT** – KI-Ergebnisse sind nachvollziehbar, werden geprüft und KI-Anwendungsfälle werden vor Einführung bewertet.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB17.E.01` | 🤖 Für jedes KI-erzeugte Arbeitsergebnis (Testfall, Code, Dokument, Bericht) ist eine menschliche Prüfung und Freigabe definiert (Human-in-the-Loop).<br>*A human review and approval is defined for every AI-generated work product (test case, code, document, report) (human-in-the-loop).* | S | – | Definieren Sie je Artefakttyp, wer KI-Ergebnisse prüft und freigibt. |
| `KB17.E.02` | 🤖 KI-erzeugte Artefakte sind gekennzeichnet und nachvollziehbar (Werkzeug, Modellversion, Datum, ggf. Prompt).<br>*AI-generated artefacts are labelled and traceable (tool, model version, date, prompt where applicable).* | M | – | Führen Sie eine Kennzeichnungspflicht und Metadaten für KI-Artefakte ein. |
| `KB17.E.03` | 🤖 Jeder KI-Anwendungsfall wird vor Einführung hinsichtlich Risiko, Datenschutz und regulatorischer Einstufung bewertet.<br>*Every AI use case is assessed for risk, data protection and regulatory classification before introduction.* | M | – | Nutzen Sie eine Checkliste zur Bewertung neuer KI-Anwendungsfälle. |
| `KB17.E.04` | 🤖 Lizenz- und Urheberrechtsfragen KI-generierten Codes und Inhalts sind geregelt.<br>*Licensing and copyright questions for AI-generated code and content are settled.* | M | – | Klären Sie mit Rechtsabteilung bzw. Einkauf die Nutzungsbedingungen der KI-Werkzeuge. |

**OPTIMIEREND** – Der KI-Einsatz wird anhand von Nutzen, Qualität, Kosten und Risiken kontinuierlich weiterentwickelt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB17.O.01` | 🤖 Eingesetzte KI-Werkzeuge und Modelle werden regelmäßig hinsichtlich Nutzen, Qualität, Kosten und Risiken neu bewertet.<br>*AI tools and models in use are regularly reassessed for benefit, quality, cost and risk.* | M | – | Planen Sie eine halbjährliche Neubewertung der KI-Werkzeuge ein. |
| `KB17.O.02` | 🤖 Eine gemeinsam gepflegte Bibliothek bewährter Prompts, Vorlagen und Lessons Learned steht allen Teams zur Verfügung.<br>*A jointly maintained library of proven prompts, templates and lessons learned is available to all teams.* | S | – | Richten Sie eine zentrale Prompt- und Erfahrungsbibliothek ein. |
| `KB17.O.03` | 🤖 Der wirtschaftliche Nutzen des KI-Einsatzes (z. B. Zeitersparnis vs. Lizenz- und Nutzungskosten) wird gemessen und berichtet.<br>*The economic benefit of AI use (e.g. time saved vs. licence and usage costs) is measured and reported.* | L | – | Erheben Sie Zeitersparnis und Kosten des KI-Einsatzes und berichten Sie sie quartalsweise. |

### KB18 – KI-gestützte Anforderungsanalyse und -prüfung / AI-supported requirements analysis and review 🤖

*KI unterstützt die frühe Qualitätssicherung von Anforderungen und Akzeptanzkriterien und verbessert so Testbarkeit und Rückverfolgbarkeit.*  
*AI supports early quality assurance of requirements and acceptance criteria, improving testability and traceability.*

**KONTROLLIERT** – Anforderungen liegen digital vor und werden KI-gestützt auf Qualitätsmängel und Testbarkeit geprüft.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB18.K.01` | 🤖 Anforderungen bzw. User Stories liegen in einem zentralen, digital auswertbaren Werkzeug vor.<br>*Requirements or user stories are held in a central, digitally analysable tool.* | M | – | Führen Sie Anforderungen zentral in einem Werkzeug (z. B. Jira) zusammen. |
| `KB18.K.02` | 🤖 KI wird eingesetzt, um Anforderungen auf Mehrdeutigkeit, Unvollständigkeit und Widersprüche zu prüfen; die Ergebnisse werden von Fachexperten bewertet.<br>*AI is used to check requirements for ambiguity, incompleteness and contradictions; the results are assessed by domain experts.* | S | – | Lassen Sie neue User Stories vor dem Refinement KI-gestützt prüfen und besprechen Sie die Hinweise. |
| `KB18.K.03` | 🤖 Akzeptanzkriterien werden KI-gestützt auf Testbarkeit geprüft, bevor eine Story als „ready“ gilt (Definition of Ready).<br>*Acceptance criteria are checked for testability with AI support before a story is considered “ready” (Definition of Ready).* | S | – | Ergänzen Sie die Definition of Ready um eine KI-gestützte Testbarkeitsprüfung. |

**EFFIZIENT** – KI unterstützt das Ableiten von Akzeptanzkriterien, die Rückverfolgbarkeit und die Auswirkungsanalyse von Änderungen.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB18.E.01` | 🤖 KI erzeugt aus Anforderungen Vorschläge für Akzeptanzkriterien bzw. Szenarien (z. B. Gherkin), die im Refinement abgestimmt werden.<br>*AI generates suggestions for acceptance criteria or scenarios (e.g. Gherkin) from requirements, which are agreed in refinement.* | S | – | Nutzen Sie KI-Vorschläge für Akzeptanzkriterien als Diskussionsgrundlage im Refinement. |
| `KB18.E.02` | 🤖 Die Rückverfolgbarkeit Anforderung ↔ Testfall wird KI-gestützt erstellt bzw. auf Lücken geprüft.<br>*Traceability between requirements and test cases is created or checked for gaps with AI support.* | M | – | Lassen Sie die Traceability KI-gestützt auf fehlende Verknüpfungen prüfen. |
| `KB18.E.03` | 🤖 Bei Änderungsanforderungen wird eine KI-gestützte Auswirkungsanalyse (betroffene Anforderungen, Testfälle, Komponenten) durchgeführt.<br>*For change requests, an AI-supported impact analysis (affected requirements, test cases, components) is performed.* | M | – | Erproben Sie KI-gestützte Auswirkungsanalysen für Änderungsanforderungen. |

**OPTIMIEREND** – Wirksamkeit und Prüfkriterien der KI-Anforderungsprüfung werden gemessen und kontinuierlich verbessert.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB18.O.01` | 🤖 Die Wirksamkeit der KI-Anforderungsprüfung wird gemessen (z. B. früh gefundene Mängel vs. später gefundene Fehler).<br>*The effectiveness of AI requirements review is measured (e.g. defects found early vs. later).* | M | – | Erfassen Sie früh gefundene Anforderungsmängel und vergleichen Sie sie mit späteren Fehlern. |
| `KB18.O.02` | 🤖 Prüfkriterien und Prompts für die Anforderungsprüfung werden auf Basis der Messergebnisse kontinuierlich verbessert.<br>*Review criteria and prompts for requirements checks are continuously improved based on measurement results.* | S | – | Überarbeiten Sie Prompts und Prüfkriterien regelmäßig anhand der Ergebnisse. |

### KB19 – KI-gestützte Softwareentwicklung und Dokumentation / AI-supported software development and documentation 🤖

*KI-Assistenten und -Agenten werden in Entwicklung und Dokumentation kontrolliert, sicher und messbar wirksam eingesetzt.*  
*AI assistants and agents are used in development and documentation in a controlled, secure and measurably effective way.*

**KONTROLLIERT** – KI-Code-Assistenten sind freigegeben und KI-generierter Code unterliegt denselben Qualitätstoren wie manueller Code.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB19.K.01` | 🤖 Es werden ausschließlich freigegebene KI-Code-Assistenten mit geregelten Datenschutzeinstellungen genutzt.<br>*Only approved AI coding assistants with defined privacy settings are used.* | S | – | Geben Sie KI-Code-Assistenten mit geprüften Datenschutzeinstellungen zentral frei. |
| `KB19.K.02` | 🤖 KI-generierter Code durchläuft dieselben Qualitätstore wie manuell geschriebener Code (Review, statische Analyse, Security-Scan, Tests).<br>*AI-generated code passes the same quality gates as manually written code (review, static analysis, security scan, tests).* | S | – | Stellen Sie sicher, dass die CI-Qualitätstore ohne Ausnahme für KI-Code gelten. |
| `KB19.K.03` | 🤖 Unit-Tests werden KI-unterstützt erstellt und von den Entwicklern auf Aussagekraft geprüft (keine reinen „Coverage-Tests“).<br>*Unit tests are created with AI support and checked by developers for meaningfulness (no mere “coverage tests”).* | S | – | Prüfen Sie KI-generierte Unit-Tests im Review gezielt auf fachliche Assertions. |

**EFFIZIENT** – Projektkontext, Dokumentation und Sicherheitsrisiken werden für den KI-Einsatz systematisch gesteuert.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB19.E.01` | 🤖 Projektkontext und Regeln für KI-Agenten sind im Repository dokumentiert (z. B. AGENTS.md, Coding-Guidelines).<br>*Project context and rules for AI agents are documented in the repository (e.g. AGENTS.md, coding guidelines).* | S | – | Legen Sie eine AGENTS.md mit Projektregeln und Konventionen im Repository an. |
| `KB19.E.02` | 🤖 Technische und fachliche Dokumentation (API-Doku, Release Notes, Benutzerhilfe, Testberichte) wird KI-gestützt erstellt und fachlich freigegeben.<br>*Technical and business documentation (API docs, release notes, user help, test reports) is created with AI support and approved by experts.* | M | – | Erzeugen Sie Dokumentationsentwürfe KI-gestützt und legen Sie einen Freigabeschritt fest. |
| `KB19.E.03` | 🤖 Abweichungen zwischen Code und Dokumentation werden automatisiert bzw. KI-gestützt erkannt.<br>*Discrepancies between code and documentation are detected automatically or with AI support.* | M | – | Richten Sie eine automatische Prüfung auf veraltete Dokumentation ein. |
| `KB19.E.04` | 🤖 KI-spezifische Sicherheitsrisiken (Prompt-Injection, Preisgabe von Secrets, erfundene Paketabhängigkeiten) sind bekannt und werden technisch adressiert.<br>*AI-specific security risks (prompt injection, secret leakage, hallucinated package dependencies) are known and technically addressed.* | M | – | Ergänzen Sie Secret-Scanning, Abhängigkeitsprüfung und Schulung zu Prompt-Injection. |

**OPTIMIEREND** – Wirkung und agentische Workflows werden gemessen, abgesichert und weiterentwickelt.

| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |
|---|---|:-:|---|---|
| `KB19.O.01` | 🤖 Die Wirkung von KI auf Durchlaufzeit und Fehlerdichte wird gemessen und mit Nicht-KI-Entwicklung verglichen.<br>*The impact of AI on lead time and defect density is measured and compared with non-AI development.* | L | – | Vergleichen Sie Durchlaufzeit und Fehlerdichte von KI-unterstützten und anderen Änderungen. |
| `KB19.O.02` | 🤖 Agentische Workflows (KI-Agent erstellt Änderung inkl. Tests und Doku als Pull Request) sind mit klaren Leitplanken etabliert.<br>*Agentic workflows (AI agent creates a change including tests and docs as a pull request) are established with clear guardrails.* | L | – | Erproben Sie agentische Pull Requests mit definierten Leitplanken und Pflicht-Review. |
| `KB19.O.03` | 🤖 Projektwissen (Dokumentation, Entscheidungen, Fehlerhistorie) ist für das Team über eine KI-gestützte Wissensbasis durchsuchbar.<br>*Project knowledge (documentation, decisions, defect history) is searchable for the team via an AI-supported knowledge base.* | L | – | Bauen Sie eine KI-gestützte Wissensbasis über Projektdokumentation und Entscheidungen auf. |

## 4. Zuordnung aller 108 Agile-TPI-Kontrollpunkte

| Agile-ID | Cluster | Original (EN) | → Katalog-ID | Art |
|---|:-:|---|---|---|
| 1.1.1 | C | The Product Owner is familiar with and known to all team members. | `KB01.K.01` | zusammengeführt |
| 1.1.2 | D | The Product Owner’s (pro) active tasks and responsibilities are carried out well. | `KB01.AG.12` | neu (agil) |
| 1.1.3 | D | All relevant stakeholders are defined and known to the whole team. | `KB01.E.01` | zusammengeführt |
| 1.2.1 | C | The Product Owner is the owner of the product risk analysis (the input for the test strategy). | `KB01.K.04` | zusammengeführt |
| 1.2.2 | E | Information on the quality of both the test activities and the test object is provided to stakeholders. | `KB01.E.02` | zusammengeführt |
| 1.3.1 | C | Resources for the optimization of test activities (like training, coaching, interest groups) are provided by the organization. | `KB01.O.01` | zusammengeführt |
| 1.3.2 | D | Budget for resources (including testing) is granted by and negotiable with the Product Owner. | `KB01.K.02` | zusammengeführt |
| 2.1.1 | A | Test activities like product risk analysis, planning, preparation, test case design are performed prior to test execution, with the goal of keeping the test activities off the sprints' critical path. | `KB02.AG.11` | neu (agil) |
| 2.1.2 | A | Testers/developers participate in project and sprint planning in order to align the test activities with other activities. | `KB02.K.02` | zusammengeführt |
| 2.1.3 | B | Quality and test aspects are well considered in the analysis and mitigation of overall project and sprint risks by team and Product owner. | `KB02.K.03` | zusammengeführt |
| 2.1.4 | C | Quality and test aspects are well considered in the impact (risks) of changes (in priority, user stories, functional or technical solutions) in the refinement session. | `KB02.E.01` | zusammengeführt |
| 2.2.1 | A | The developer/tester contributes to the optimization of the test basis (more than a testability review), in which the object under test is described. | `KB02.E.03` | zusammengeführt |
| 2.3.1 | A | Lessons learned from the evaluated test activities are used for (the set up of) future projects. | `KB02.O.01` | zusammengeführt |
| 2.3.2 | B | Training and coaching facilities are provided before sprint activities start. | `KB02.AG.32` | neu (agil) |
| 3.1.1 | A | Product risks are defined and managed during the project e.g. by risk poker for stories. | `KB03.K.02` | zusammengeführt |
| 3.1.2 | B | The test activities and strategy (including retest and regression testing) are based on the product risks. | `KB03.K.04` | zusammengeführt |
| 3.1.3 | C | The strategy is agreed with the whole and the Product owner. | `KB03.K.01` | zusammengeführt |
| 3.1.4 | D | When more than one test levels are executed (unit testing, functional testing, acceptance testing) the tests are differentiated between the levels (test types, test coverage and test depth), depending on the analyzed risks. | `KB03.K.03` | zusammengeführt |
| 3.2.1 | A | The strategy is monitored and where necessary adapted during the project. | `KB03.AG.21` | neu (agil) |
| 3.2.2 | C | Interface and integration test activities are planned and discussed with other teams. | `KB03.E.02` | zusammengeführt |
| 3.2.3 | C | Depending on the risks more than one test technique is used to develop test cases. | `KB03.E.03` | zusammengeführt |
| 3.3.1 | A | The process of product risk analysis and strategy is evaluated during the retrospective or during the refinement of user stories. | `KB03.O.01` | zusammengeführt |
| 3.3.2 | C | Incidents that occur after tests/in production are analyzed to adapt the test strategy. | `KB03.O.02` | zusammengeführt |
| 4.1.1 | D | The quality and test tasks and responsibilities are clear and aligned with the Scrum master and product owner. | `KB04.K.03` | zusammengeführt |
| 4.1.2 | E | The quality and test tasks and responsibilities are clear for the whole team. | `KB04.K.01` | zusammengeführt |
| 4.1.3 | F | The quality and test work in progress can be processed by any team member. | `KB04.AG.13` | neu (agil) |
| 4.1.4 | G | The assigned roles, products and services are clear to stakeholders outside the team. | `KB04.K.04` | zusammengeführt |
| 4.2.1 | D | With more than one tester in the team and in case of more teams: test activities are reconciled and aligned. | `KB04.E.01` | zusammengeführt |
| 4.2.2 | F | The team feels accountable for success and failure of product and process quality. | `KB04.O.02` | zusammengeführt |
| 4.3.1 | D | The tasks, role, responsibilities and expectations for the tester-role are clearly defined timely before the sprint activities start. | `KB04.K.03` | zusammengeführt |
| 4.3.2 | G | The quality and testing products and services are evaluated regularly on an organizational level. | `KB04.O.01` | zusammengeführt |
| 5.1.1 | A | Each individual developer/tester (pro)actively participates in the daily stand-ups to provide and receive relevant information. | `KB05.AG.11` | neu (agil) |
| 5.1.2 | C | Relevant information from stakeholders outside the team is (pro)actively gathered, especially in a Scrum of Scrums situation. | `KB05.K.02` | zusammengeführt |
| 5.2.1 | B | Relevant information (like product quality and risks) is defined and effectively communicated with team and stakeholders. | `KB05.K.04` | zusammengeführt |
| 5.2.2 | D | Different means of communication are considered for effective messages inside and outside the team. | `KB05.E.03` | zusammengeführt |
| 5.3.1 | C | Best practices and lessons learned regarding (means of) communication and its efficiency are regularly evaluated and improvements are implemented. | `KB05.O.01` | zusammengeführt |
| 6.1.1 | D | The reporting in the standup contains aspects of time and/or costs, results and (above all) product risks. | `KB06.K.01` | zusammengeführt |
| 6.1.2 | F | The reporting (frequency and content) to the Product Owner matches his/her basic demands for the decision making process. | `KB06.K.02` | zusammengeführt |
| 6.1.3 | F | Reporting is done in writing as and when required by the stakeholder(s). | `KB06.K.03` | zusammengeführt |
| 6.2.1 | D | The reporting from retrospectives contains trends and recommendations concerning test time and cost. | `KB06.E.02` | zusammengeführt |
| 6.2.2 | D | The reporting from retrospectives contains trends and recommendations concerning product quality and -risks. | `KB06.E.03` | zusammengeführt |
| 6.2.3 | F | Reporting demands from stakeholders is balanced against the effort for providing them. | `KB06.E.01` | zusammengeführt |
| 6.3.1 | E | Information from the teams is used for improvements of all quality and test activities and the software development lifecycle. | `KB06.O.01` | zusammengeführt |
| 7.1.1 | E | The backlog and the definition of done include test activities to be performed and the required quality. | `KB07.AG.11` | neu (agil) |
| 7.1.2 | E | The sprint planning and/or backlog refinement are aligned with the Product Owner. | `KB07.K.02` | zusammengeführt |
| 7.1.3 | F | Each test activity is visible for the team and monitored and where necessary adjusted. | `KB07.K.03` | zusammengeführt |
| 7.2.1 | E | The definition of done is discussed with the Product Owner and other relevant stakeholders. | `KB07.K.04` | zusammengeführt |
| 7.2.2 | F | Anticipated deviations of the backlog are discussed with the Product Owner in the backlog refinement session. | `KB07.E.01` | zusammengeführt |
| 7.2.3 | F | Adjustments of the backlog are documented as and if required by the stakeholders. | `KB07.E.02` | zusammengeführt |
| 7.3.1 | E | The (re)allocation of test resources is delegated to the team(s). | `KB07.E.03` | zusammengeführt |
| 7.3.2 | F | The coordination and management of test activities is evaluated regularly, internally by the team and with stakeholders. | `KB07.O.01` | zusammengeführt |
| 8.1.1 | G | For (test) effort estimation, simple techniques are used such as planning poker. | `KB08.K.01` | zusammengeführt |
| 8.1.2 | F | For the estimation the activities taken into account are: test planning, defining test cases, gathering of test data, executing test cases, conservation of test cases. | `KB08.K.02` | zusammengeführt |
| 8.2.1 | G | The need for a plotted planning, indicating the dependencies between test varieties and teams, is discussed with the stakeholders. | `KB08.K.03` | zusammengeführt |
| 8.2.2 | F | The estimation techniques are evaluated during the retrospective. | `KB08.AG.22` | neu (agil) |
| 8.3.1 | F | Metrics like burndown/burnup or velocity are defined and maintained to support the estimating and planning activities of the teams. | `KB08.E.03` | zusammengeführt |
| 9.1.1 | C | Information and data is gathered and analyzed: • Required time for test design and execution (per test case) • Number of test cases that can be prepared, designed and executed in one day/sprint/project • The time for test activities against the total team activities per day/sprint/project. | `KB09.AG.11` | neu (agil) |
| 9.2.1 | C | Metrics that are used throughout the sprints are defined, discussed and evaluated in the retrospective(s). | `KB09.E.04` | zusammengeführt |
| 9.3.1 | C | Means and procedures to collect, store, provide and manage metrics that support the Agile teams are documented. | `KB09.K.02` | zusammengeführt |
| 9.3.2 | E | The efforts to provide metrics are measured against their benefit for Agile activities, e.g. the way metrics contribute to the need for information from stakeholders. | `KB09.E.01` | zusammengeführt |
| 10.1.1 | C | The defect life-cycle is as short as possible; defects are solved during the sprint where they were injected or, even better, during Refinement and Planning or even Creating the user stories. | `KB10.AG.11` | neu (agil) |
| 10.1.2 | D | When defects are transferred to a following phase or sprint, the following data is stored: the related test case, person reporting the defect, date, severity category, description (the actions to reproduce the defect, expected and observed result) and defect status. | `KB10.K.02` | zusammengeführt |
| 10.1.3 | E | The developer/tester contributes, from a testing perspective, to the risk analysis of defects. | `KB10.AG.13` | neu (agil) |
| 10.2.1 | C | Handling of the defects is assigned to a specific role (not only developers but also Product Owner and Scrum master). | `KB10.K.03` | zusammengeführt |
| 10.2.2 | E | The whole team has access to the defect administration (preferably a tool). | `KB10.K.04` | zusammengeführt |
| 10.2.3 | F | Defects are analyzed in the retrospective(s) to indicate the quality of the test object. | `KB10.AG.23` | neu (agil) |
| 10.2.4 | G | Trends in defects are analyzed. For this, more information is recorded about a defect: the subsystem, priority, program and version, test basis and version, root cause, all status transitions and problem solver. | `KB10.E.04` | zusammengeführt |
| 10.3.1 | D | All teams and projects use the same defect management system (tool) ór a seamless connection between all systems is provided. | `KB10.E.02` | zusammengeführt |
| 10.3.2 | E | Defects are analyzed on a project/program level and test practice improvements are initiated to prevent future defects. | `KB10.O.03` | zusammengeführt |
| 11.1.1 | F | The test basis, the test object and all testware (scripts, data, plans) are identified by name and version. | `KB11.K.01` | zusammengeführt |
| 11.1.2 | G | Each test case is easily traceable to the test basis in a transparent way. | `KB11.E.02` | zusammengeführt |
| 11.2.1 | G | Items under testware management are accessible for each team member. | `KB11.K.03` | zusammengeführt |
| 11.2.2 | F | There is a procedure and a logical structure to manage test data, testware, the test basis and the test object. | `KB11.K.04` | zusammengeführt |
| 11.3.1 | F | Guidelines are provided for conserving testware for further use across projects. | `KB11.O.02` | zusammengeführt |
| 11.3.2 | G | A procedure is defined for the handover of testware to upcoming projects. | `KB11.O.03` | zusammengeführt |
| 12.1.1 | D | Test activities are performed following a described guideline, the test products to be delivered and additional requirements on the way of working. | `KB12.K.01` | zusammengeführt |
| 12.2.1 | D | The practical use of the guidelines or test method is evaluated by/in the team. | `KB12.K.03` | zusammengeführt |
| 12.3.1 | D | The test method describes for all activities the goal, the responsible role, any tools and techniques to be used and the preconditions. | `KB12.E.01` | zusammengeführt |
| 12.3.2 | E | A complete and comprehensive set of templates is part of the test method. | `KB12.E.02` | zusammengeführt |
| 12.3.3 | F | Mandatory, conditional and optional elements of the test method are well indicated. | `KB12.E.03` | zusammengeführt |
| 12.3.4 | G | The test practice is periodically evaluated and adjustments are implemented where necessary. | `KB12.O.02` | zusammengeführt |
| 13.1.1 | A | Developers with a test role have followed a test training, specifically on test engineering and test case design. | `KB13.K.01` | zusammengeführt |
| 13.1.2 | B | The essentials of a test method like TMap or ISTQB are well known to and applied by the developers. | `KB13.K.02` | zusammengeführt |
| 13.1.3 | B | Individual knowledge and skills are shared with the team e.g. by letting others test. | `KB13.AG.13` | neu (agil) |
| 13.1.4 | D | Testing skills are discussed and evaluated against expectations on a regular basis with team and management. | `KB13.K.04` | zusammengeführt |
| 13.2.1 | A | Required expertise – either industry, business and/or technical – for and within the team is at hand when needed. | `KB13.K.03` | zusammengeführt |
| 13.3.1 | B | Training and certification facilities in test methods, like TMap NEXT® or ISTQB® are provided by the organization. | `KB13.E.01` | zusammengeführt |
| 13.3.2 | C | Facilities to participate in Special Interest Groups, attend test seminars or read and apply test literature are available. | `KB13.O.01` | zusammengeführt |
| 14.1.1 | C | A well-considered choice, based on product risks and strategy, is made to document test cases on a logical level using a template or a tool | `KB14.K.01` | zusammengeführt |
| 14.1.2 | D | Each documented test case contains the following elements: • A (description of the) initial situation • The change process = test actions to be performed • The predicted result (!) • The required test data. | `KB14.K.02` | zusammengeführt |
| 14.1.3 | E | In the test case or test script a reference is made to the test basis (like use cases and user stories), describing a specific system behavior. | `KB14.K.03` | zusammengeführt |
| 14.2.1 | C | The coverage level of the test basis is clearly indicated (for example in the requirements document). | `KB14.E.02` | zusammengeführt |
| 14.2.2 | D | A checklist or other means such as reviews are applied for quality aspects (for example usability) that cannot be covered by test cases. | `KB14.E.04` | zusammengeführt |
| 14.2.3 | F | The accuracy and effectiveness of test cases are evaluated and improved where necessary. | `KB14.O.01` | zusammengeführt |
| 14.3.1 | F | Test design techniques and checklists are evaluated, adjusted and maintained for further re-use. | `KB14.O.03` | zusammengeführt |
| 15.1.1 | A | A test tool is used to automatically perform regression testing | `KB15.AG.11` | neu (agil) |
| 15.1.2 | A | The tools are available and can be used at any required time if not permanently. | `KB15.E.02` | zusammengeführt |
| 15.2.1 | A | Training for the proper use of (implemented) test tools is provided and followed. | `KB15.K.02` | zusammengeführt |
| 15.3.1 | A | Maintenance, knowledge about and support for the test tools in use is available. | `KB15.AG.31` | neu (agil) |
| 15.3.2 | B | The use of tools is evaluated against aspects of testing faster, cheaper, better or making the test process more manageable | `KB15.E.01` | zusammengeführt |
| 15.3.3 | C | A tool policy is defined for all agile activities | `KB15.O.01` | zusammengeführt |
| 16.1.1 | A | The (automated) test cases can be run on all relevant environments. | `KB16.AG.11` | neu (agil) |
| 16.1.2 | A | The required test environment configuration and test data are clearly defined at the start of the iteration. | `KB16.K.01` | zusammengeführt |
| 16.1.3 | C | A predefined checklist is used to check the (availability and functionality) of the environment. | `KB16.E.01` | zusammengeführt |
| 16.2.1 | B | Working agreements with supplying parties regarding availability of environments are well defined and aligned. | `KB16.K.02` | zusammengeführt |
| 16.3.1 | B | A logical or functional design of the test environment is provided and maintained by the organization. It addresses applications, systems and their connections, and the use of stubs and drivers (mock-ups). | `KB16.E.02` | zusammengeführt |
| 16.3.2 | C | A technical design of the test environment is available and formally accepted by the test manager or the test environment specialist. | `KB16.E.03` | zusammengeführt |
| 16.3.3 | D | The ownership of test environments and test data is assigned to a distinct department. | `KB16.O.01` | zusammengeführt |
