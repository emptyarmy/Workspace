# Agile Ergänzung des TPI-NEXT®-Modells

> Entscheidung F-01: **TPI NEXT® bleibt führend; die agilen Anteile aus Agile TPI werden ergänzt.**
> Status: **umgesetzt** im Katalog v1.0 (Entwurf), fachliche Prüfung ausstehend (AP-2.7).

## 1. Vorgehen

1. **Attribute übernehmen:** Jeder Kontrollpunkt (KP) erhält – wo sinnvoll – die Agile-TPI-Attribute **Sicht** (P = Individuum, T = Team, O = Organisation) und **Cluster** (A–G = Verbesserungsreihenfolge). Damit sind Matrix und Balken wie im Excel-Tool möglich und die Empfehlungen werden nach Clustern priorisiert.
2. **Agile Kontrollpunkte ergänzen:** Alle 108 Agile-TPI-KP werden einem TPI-NEXT-Kernbereich und einer Ebene zugeordnet und erhalten das Tag `agile`.
3. **Dubletten zusammenführen:** Hat ein agiler KP inhaltlich eine Entsprechung in TPI NEXT (z. B. 3.1.2 „strategy based on product risks“ ↔ KB03.K.02), wird **kein neuer KP** angelegt, sondern der TPI-NEXT-KP um die agile Formulierung (Hinweistext) und Sicht/Cluster ergänzt.
4. **Filter in der App:** „Klassisch“, „Agil“ oder „Alle“ – je nach Vorgehensmodell des Projekts (siehe neue Frage N-14).

## 2. Heuristik für den Ebenen-Vorschlag

Agile TPI kennt keine Ebenen, sondern Cluster als Verbesserungsschritte. Als **Startvorschlag** gilt:

| Cluster | Ebene (Vorschlag) |
|---|---|
| A, B | KONTROLLIERT |
| C, D, E | EFFIZIENT |
| F, G | OPTIMIEREND |

Die ID-Konvention für agile KP lautet `KB<NN>.AG.<Sicht><Nr>` (z. B. `KB03.AG.12` = Kernbereich 3, Team-Sicht, KP 2). Nach der fachlichen Zuordnung zu einer Ebene bleibt die ID stabil; die Ebene steht im Attribut `level`.

## 3. Ergebnis (umgesetzt am 09.11.2026)

Die fachliche Zuordnung fiel deutlich günstiger aus als zunächst geschätzt: Die meisten agilen Kontrollpunkte haben eine inhaltliche Entsprechung in TPI NEXT.

| Block | Anzahl |
|---|---|
| Agile-TPI-Kontrollpunkte gesamt | 108 |
| **zusammengeführt** mit TPI-NEXT-Punkten (Formulierung um agile Sicht ergänzt, Sicht/Cluster/Verweis übernommen) | **92** |
| **neu** als agile Kontrollpunkte (`KBnn.AG.xx`, Tag `agile`) | **16** |
| Katalog gesamt (inkl. 157 TPI NEXT und 50 KI) | **223** |

Die verbindliche Zuordnung jedes einzelnen Agile-Punktes steht in `05_katalog-v1-uebersicht.md`, Abschnitt 4. Die Rohfassung unten (Heuristik Cluster → Ebene) ist damit **überholt** und bleibt nur zur Nachvollziehbarkeit erhalten.

## 4. Zuordnungstabelle (Rohfassung, überholt)

Die Spalte „Neue ID“ ist vorläufig. Die deutsche Übersetzung folgt in AP-2.3.

### KB01 – Stakeholder

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 1.1.1 | KB01.AG.11 | P | C | E | The Product Owner is familiar with and known to all team members. |
| 1.1.2 | KB01.AG.12 | P | D | E | The Product Owner’s (pro) active tasks and responsibilities are carried out well. |
| 1.1.3 | KB01.AG.13 | P | D | E | All relevant stakeholders are defined and known to the whole team. |
| 1.2.1 | KB01.AG.21 | T | C | E | The Product Owner is the owner of the product risk analysis (the input for the test strategy). |
| 1.2.2 | KB01.AG.22 | T | E | E | Information on the quality of both the test activities and the test object is provided to stakeholders. |
| 1.3.1 | KB01.AG.31 | O | C | E | Resources for the optimization of test activities (like training, coaching, interest groups) are provided by the organization. |
| 1.3.2 | KB01.AG.32 | O | D | E | Budget for resources (including testing) is granted by and negotiable with the Product Owner. |

### KB02 – Grad der Beteiligung

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 2.1.1 | KB02.AG.11 | P | A | K | Test activities like product risk analysis, planning, preparation, test case design are performed prior to test execution, with the goal of keeping the test activities off the sprints' critical path. |
| 2.1.2 | KB02.AG.12 | P | A | K | Testers/developers participate in project and sprint planning in order to align the test activities with other activities. |
| 2.1.3 | KB02.AG.13 | P | B | K | Quality and test aspects are well considered in the analysis and mitigation of overall project and sprint risks by team and Product owner. |
| 2.1.4 | KB02.AG.14 | P | C | E | Quality and test aspects are well considered in the impact (risks) of changes (in priority, user stories, functional or technical solutions) in the refinement session. |
| 2.2.1 | KB02.AG.21 | T | A | K | The developer/tester contributes to the optimization of the test basis (more than a testability review), in which the object under test is described. |
| 2.3.1 | KB02.AG.31 | O | A | K | Lessons learned from the evaluated test activities are used for (the set up of) future projects. |
| 2.3.2 | KB02.AG.32 | O | B | K | Training and coaching facilities are provided before sprint activities start. |

### KB03 – Teststrategie

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 3.1.1 | KB03.AG.11 | P | A | K | Product risks are defined and managed during the project e.g. by risk poker for stories. |
| 3.1.2 | KB03.AG.12 | P | B | K | The test activities and strategy (including retest and regression testing) are based on the product risks. |
| 3.1.3 | KB03.AG.13 | P | C | E | The strategy is agreed with the whole and the Product owner. |
| 3.1.4 | KB03.AG.14 | P | D | E | When more than one test levels are executed (unit testing, functional testing, acceptance testing) the tests are differentiated between the levels (test types, test coverage and test depth), depending on the analyzed risks. |
| 3.2.1 | KB03.AG.21 | T | A | K | The strategy is monitored and where necessary adapted during the project. |
| 3.2.2 | KB03.AG.22 | T | C | E | Interface and integration test activities are planned and discussed with other teams. |
| 3.2.3 | KB03.AG.23 | T | C | E | Depending on the risks more than one test technique is used to develop test cases. |
| 3.3.1 | KB03.AG.31 | O | A | K | The process of product risk analysis and strategy is evaluated during the retrospective or during the refinement of user stories. |
| 3.3.2 | KB03.AG.32 | O | C | E | Incidents that occur after tests/in production are analyzed to adapt the test strategy. |

### KB04 – Testorganisation

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 4.1.1 | KB04.AG.11 | P | D | E | The quality and test tasks and responsibilities are clear and aligned with the Scrum master and product owner. |
| 4.1.2 | KB04.AG.12 | P | E | E | The quality and test tasks and responsibilities are clear for the whole team. |
| 4.1.3 | KB04.AG.13 | P | F | O | The quality and test work in progress can be processed by any team member. |
| 4.1.4 | KB04.AG.14 | P | G | O | The assigned roles, products and services are clear to stakeholders outside the team. |
| 4.2.1 | KB04.AG.21 | T | D | E | With more than one tester in the team and in case of more teams: test activities are reconciled and aligned. |
| 4.2.2 | KB04.AG.22 | T | F | O | The team feels accountable for success and failure of product and process quality. |
| 4.3.1 | KB04.AG.31 | O | D | E | The tasks, role, responsibilities and expectations for the tester-role are clearly defined timely before the sprint activities start. |
| 4.3.2 | KB04.AG.32 | O | G | O | The quality and testing products and services are evaluated regularly on an organizational level. |

### KB05 – Kommunikation

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 5.1.1 | KB05.AG.11 | P | A | K | Each individual developer/tester (pro)actively participates in the daily stand-ups to provide and receive relevant information. |
| 5.1.2 | KB05.AG.12 | P | C | E | Relevant information from stakeholders outside the team is (pro)actively gathered, especially in a Scrum of Scrums situation. |
| 5.2.1 | KB05.AG.21 | T | B | K | Relevant information (like product quality and risks) is defined and effectively communicated with team and stakeholders. |
| 5.2.2 | KB05.AG.22 | T | D | E | Different means of communication are considered for effective messages inside and outside the team. |
| 5.3.1 | KB05.AG.31 | O | C | E | Best practices and lessons learned regarding (means of) communication and its efficiency are regularly evaluated and improvements are implemented. |

### KB06 – Berichterstattung

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 6.1.1 | KB06.AG.11 | P | D | E | The reporting in the standup contains aspects of time and/or costs, results and (above all) product risks. |
| 6.1.2 | KB06.AG.12 | P | F | O | The reporting (frequency and content) to the Product Owner matches his/her basic demands for the decision making process. |
| 6.1.3 | KB06.AG.13 | P | F | O | Reporting is done in writing as and when required by the stakeholder(s). |
| 6.2.1 | KB06.AG.21 | T | D | E | The reporting from retrospectives contains trends and recommendations concerning test time and cost. |
| 6.2.2 | KB06.AG.22 | T | D | E | The reporting from retrospectives contains trends and recommendations concerning product quality and -risks. |
| 6.2.3 | KB06.AG.23 | T | F | O | Reporting demands from stakeholders is balanced against the effort for providing them. |
| 6.3.1 | KB06.AG.31 | O | E | E | Information from the teams is used for improvements of all quality and test activities and the software development lifecycle. |

### KB07 – Testprozessmanagement

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 7.1.1 | KB07.AG.11 | P | E | E | The backlog and the definition of done include test activities to be performed and the required quality. |
| 7.1.2 | KB07.AG.12 | P | E | E | The sprint planning and/or backlog refinement are aligned with the Product Owner. |
| 7.1.3 | KB07.AG.13 | P | F | O | Each test activity is visible for the team and monitored and where necessary adjusted. |
| 7.2.1 | KB07.AG.21 | T | E | E | The definition of done is discussed with the Product Owner and other relevant stakeholders. |
| 7.2.2 | KB07.AG.22 | T | F | O | Anticipated deviations of the backlog are discussed with the Product Owner in the backlog refinement session. |
| 7.2.3 | KB07.AG.23 | T | F | O | Adjustments of the backlog are documented as and if required by the stakeholders. |
| 7.3.1 | KB07.AG.31 | O | E | E | The (re)allocation of test resources is delegated to the team(s). |
| 7.3.2 | KB07.AG.32 | O | F | O | The coordination and management of test activities is evaluated regularly, internally by the team and with stakeholders. |

### KB08 – Kostenschätzung und Planung

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 8.1.1 | KB08.AG.11 | P | G | O | For (test) effort estimation, simple techniques are used such as planning poker. |
| 8.1.2 | KB08.AG.12 | P | F | O | For the estimation the activities taken into account are: test planning, defining test cases, gathering of test data, executing test cases, conservation of test cases. |
| 8.2.1 | KB08.AG.21 | T | G | O | The need for a plotted planning, indicating the dependencies between test varieties and teams, is discussed with the stakeholders. |
| 8.2.2 | KB08.AG.22 | T | F | O | The estimation techniques are evaluated during the retrospective. |
| 8.3.1 | KB08.AG.31 | O | F | O | Metrics like burndown/burnup or velocity are defined and maintained to support the estimating and planning activities of the teams. |

### KB09 – Metriken

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 9.1.1 | KB09.AG.11 | P | C | E | Information and data is gathered and analyzed: • Required time for test design and execution (per test case) • Number of test cases that can be prepared, designed and executed in one day/sprint/project • The time for test activities against the total team activities per day/sprint/project. |
| 9.2.1 | KB09.AG.21 | T | C | E | Metrics that are used throughout the sprints are defined, discussed and evaluated in the retrospective(s). |
| 9.3.1 | KB09.AG.31 | O | C | E | Means and procedures to collect, store, provide and manage metrics that support the Agile teams are documented. |
| 9.3.2 | KB09.AG.32 | O | E | E | The efforts to provide metrics are measured against their benefit for Agile activities, e.g. the way metrics contribute to the need for information from stakeholders. |

### KB10 – Fehlermanagement

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 10.1.1 | KB10.AG.11 | P | C | E | The defect life-cycle is as short as possible; defects are solved during the sprint where they were injected or, even better, during Refinement and Planning or even Creating the user stories. |
| 10.1.2 | KB10.AG.12 | P | D | E | When defects are transferred to a following phase or sprint, the following data is stored: the related test case, person reporting the defect, date, severity category, description (the actions to reproduce the defect, expected and observed result) and defect status. |
| 10.1.3 | KB10.AG.13 | P | E | E | The developer/tester contributes, from a testing perspective, to the risk analysis of defects. |
| 10.2.1 | KB10.AG.21 | T | C | E | Handling of the defects is assigned to a specific role (not only developers but also Product Owner and Scrum master). |
| 10.2.2 | KB10.AG.22 | T | E | E | The whole team has access to the defect administration (preferably a tool). |
| 10.2.3 | KB10.AG.23 | T | F | O | Defects are analyzed in the retrospective(s) to indicate the quality of the test object. |
| 10.2.4 | KB10.AG.24 | T | G | O | Trends in defects are analyzed. For this, more information is recorded about a defect: the subsystem, priority, program and version, test basis and version, root cause, all status transitions and problem solver. |
| 10.3.1 | KB10.AG.31 | O | D | E | All teams and projects use the same defect management system (tool) ór a seamless connection between all systems is provided. |
| 10.3.2 | KB10.AG.32 | O | E | E | Defects are analyzed on a project/program level and test practice improvements are initiated to prevent future defects. |

### KB11 – Testwaremanagement

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 11.1.1 | KB11.AG.11 | P | F | O | The test basis, the test object and all testware (scripts, data, plans) are identified by name and version. |
| 11.1.2 | KB11.AG.12 | P | G | O | Each test case is easily traceable to the test basis in a transparent way. |
| 11.2.1 | KB11.AG.21 | T | G | O | Items under testware management are accessible for each team member. |
| 11.2.2 | KB11.AG.22 | T | F | O | There is a procedure and a logical structure to manage test data, testware, the test basis and the test object. |
| 11.3.1 | KB11.AG.31 | O | F | O | Guidelines are provided for conserving testware for further use across projects. |
| 11.3.2 | KB11.AG.32 | O | G | O | A procedure is defined for the handover of testware to upcoming projects. |

### KB12 – Methodisches Vorgehen

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 12.1.1 | KB12.AG.11 | P | D | E | Test activities are performed following a described guideline, the test products to be delivered and additional requirements on the way of working. |
| 12.2.1 | KB12.AG.21 | T | D | E | The practical use of the guidelines or test method is evaluated by/in the team. |
| 12.3.1 | KB12.AG.31 | O | D | E | The test method describes for all activities the goal, the responsible role, any tools and techniques to be used and the preconditions. |
| 12.3.2 | KB12.AG.32 | O | E | E | A complete and comprehensive set of templates is part of the test method. |
| 12.3.3 | KB12.AG.33 | O | F | O | Mandatory, conditional and optional elements of the test method are well indicated. |
| 12.3.4 | KB12.AG.34 | O | G | O | The test practice is periodically evaluated and adjustments are implemented where necessary. |

### KB13 – Professionalität der Tester

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 13.1.1 | KB13.AG.11 | P | A | K | Developers with a test role have followed a test training, specifically on test engineering and test case design. |
| 13.1.2 | KB13.AG.12 | P | B | K | The essentials of a test method like TMap or ISTQB are well known to and applied by the developers. |
| 13.1.3 | KB13.AG.13 | P | B | K | Individual knowledge and skills are shared with the team e.g. by letting others test. |
| 13.1.4 | KB13.AG.14 | P | D | E | Testing skills are discussed and evaluated against expectations on a regular basis with team and management. |
| 13.2.1 | KB13.AG.21 | T | A | K | Required expertise – either industry, business and/or technical – for and within the team is at hand when needed. |
| 13.3.1 | KB13.AG.31 | O | B | K | Training and certification facilities in test methods, like TMap NEXT® or ISTQB® are provided by the organization. |
| 13.3.2 | KB13.AG.32 | O | C | E | Facilities to participate in Special Interest Groups, attend test seminars or read and apply test literature are available. |

### KB14 – Testfalldesign

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 14.1.1 | KB14.AG.11 | P | C | E | A well-considered choice, based on product risks and strategy, is made to document test cases on a logical level using a template or a tool |
| 14.1.2 | KB14.AG.12 | P | D | E | Each documented test case contains the following elements: • A (description of the) initial situation • The change process = test actions to be performed • The predicted result (!) • The required test data. |
| 14.1.3 | KB14.AG.13 | P | E | E | In the test case or test script a reference is made to the test basis (like use cases and user stories), describing a specific system behavior. |
| 14.2.1 | KB14.AG.21 | T | C | E | The coverage level of the test basis is clearly indicated (for example in the requirements document). |
| 14.2.2 | KB14.AG.22 | T | D | E | A checklist or other means such as reviews are applied for quality aspects (for example usability) that cannot be covered by test cases. |
| 14.2.3 | KB14.AG.23 | T | F | O | The accuracy and effectiveness of test cases are evaluated and improved where necessary. |
| 14.3.1 | KB14.AG.31 | O | F | O | Test design techniques and checklists are evaluated, adjusted and maintained for further re-use. |

### KB15 – Testwerkzeuge

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 15.1.1 | KB15.AG.11 | P | A | K | A test tool is used to automatically perform regression testing |
| 15.1.2 | KB15.AG.12 | P | A | K | The tools are available and can be used at any required time if not permanently. |
| 15.2.1 | KB15.AG.21 | T | A | K | Training for the proper use of (implemented) test tools is provided and followed. |
| 15.3.1 | KB15.AG.31 | O | A | K | Maintenance, knowledge about and support for the test tools in use is available. |
| 15.3.2 | KB15.AG.32 | O | B | K | The use of tools is evaluated against aspects of testing faster, cheaper, better or making the test process more manageable |
| 15.3.3 | KB15.AG.33 | O | C | E | A tool policy is defined for all agile activities |

### KB16 – Testumgebung

| Agile-ID | Neue ID | Sicht | Cluster | Ebene (Vorschlag) | Checkpoint (EN, Original) |
|---|---|---|---|---|---|
| 16.1.1 | KB16.AG.11 | P | A | K | The (automated) test cases can be run on all relevant environments. |
| 16.1.2 | KB16.AG.12 | P | A | K | The required test environment configuration and test data are clearly defined at the start of the iteration. |
| 16.1.3 | KB16.AG.13 | P | C | E | A predefined checklist is used to check the (availability and functionality) of the environment. |
| 16.2.1 | KB16.AG.21 | T | B | K | Working agreements with supplying parties regarding availability of environments are well defined and aligned. |
| 16.3.1 | KB16.AG.31 | O | B | K | A logical or functional design of the test environment is provided and maintained by the organization. It addresses applications, systems and their connections, and the use of stubs and drivers (mock-ups). |
| 16.3.2 | KB16.AG.32 | O | C | E | A technical design of the test environment is available and formally accepted by the test manager or the test environment specialist. |
| 16.3.3 | KB16.AG.33 | O | D | E | The ownership of test environments and test data is assigned to a distinct department. |