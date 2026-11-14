# Chatverlauf – Projekt AI_TPI

- **Zeitraum:** 08.11.2026, 23:16 – 09.11.2026, 01:54 (Europe/Berlin)
- **Projektordner:** `/Users/miku/Documents/Workspace/Claude_codebase/AI_TPI`
- **Hinweis:** Die Sitzung legt kein Rohprotokoll ab, das sich exportieren lässt. Dieses Dokument wurde deshalb aus dem Gesprächsverlauf niedergeschrieben: Nachrichten des Nutzers **wörtlich**, Antworten des Assistenten **sinngemäß vollständig**, Werkzeugschritte (Dateien lesen, schreiben, übertragen) **zusammengefasst**.

---

## 1. Nutzer – 08.11.2026, 23:16

Anhänge: `Testmanagement_und_KVP.docx`, `AgileTPI_Tool_2_5xls.xls`, `Agile_Test_Practice_Improvement_2.4.doc`

> Kontinuierliche Testrpozess Verbesserung / Continuous Testprocess Improvement (TPI)
>
> Gegeben sind die angehängten Dokumente:
>
> Ich benötige eine Java Script Applikation local im Verzeichnis /Users/miku/Documents/Workspace/Claude_codebase/AI_TPI die als Projekt von MS Visual Code gelesen werden. Die Applikation soll mit positiv und negeativ Testfälle mit Plawright automatisch getestet sein. Dem Nutzer aus dem Fachbereich sollen die Fragen zum Reifegrad des Testprozesses in der Applikation angezeigt werden. Er soll die Möglichkeit gegliedert nach den Kernprozessen beantworten zu können. Für die Auswahl der Sprache sollte Deutsch und Englisch auswählbar sein. Die deutschen Fragen sind im Dokument mit den Endung *.docx aufgeführt. Die gleichen englischen Fragen sind in der Excel Tabelle vorhanden. Prüfe zunächst die Fragen und erweitere die Fragen der 14 Kernbereiche sinnvoll um weitere, eventuell sogar um einen weiteren Kernbereich, um die Berücksichtigung von Künstlicher Intelligenz, den Einsatz von KI in der Software Qualitätssicherung, in der Anforderungsprüfung, in der Testfall Automatisierung und in KI unterstützten Softwareentwicklung und Ki unterstützten Software Dokumentation.
> Für das Ergebnis der Fragen und weiterführende Analyse soll die Applikation ein Bericht erstellt werden. Beispiel für einen graphischen Bericht findest du in der *.xls Excel Datei, die Visual Basis Macros für die Berichterzeugung enthält. Der Bericht soll vollständig in der Java Script Applikation ausgewertet werden und KI gestützte Handlungsempfehlungen erzeugen. Dabei soll unterschieden werden zwischen kurzfristige Handlungsempfehlungen, die schnell umgesetzt werden können und jene, die über einen Zeitraum von einem Monat und mehr umgesetzt werden können.
>
> Ich fass das noch einmal kurz zusammen:
> Der Fragenkatalog aus den 14 Kernbereichen mit den Reifegarden INITIAL, KONTROLLIERT, EFFIZIENT , OPTIMIEREND sind zu analysieren und um sinnvolle Fragen für die Nutzung von KI zu ergänzen, evtl. auch um weitere Kernbereiche.
> Für den Fragenkatalog soll eine Jave Script Entwicklung erzeugt werden, die den Nutzer über den Browser die Fragen beantworten lässt und auch die Möglichkeit bietet Kommentare zur ergänzen. Bei den Kommentaren soll der Autor der Quelle ausgewählt werden können und zu den Kommentaren als Information gespeichert werden.
> Die Auswertung des Fragenkataloges soll in Anlehnung an die Excel Tabelle graphisch, optisch ansprechend erfolgen aber auch mit einer KI gestützten Handlungsempfehlung für kurzzeitige und langfristige Verbesserung aufwarten.
> Die Applikation soll als responsive Design für den Browser auf Labtops, für Tablets und für Mobiltelefone für Samsung und iPhone entwickelt werden. Für die Funktionen der Oberfläche sollen Playrwright Testfälle für positiv und negativ Tests entwickelt werden.
>
> Lege im Verzeichnis /Users/miku/Documents/Workspace/Claude_codebase/AI_TPI  zunächst ein Projekt für MS Visual Code mit einer Agents.md Datei an. Erzeuge noch keinen Code sondern erstelle erst einen Plan für die Entwicklung und Umsetzung. Erstelle Fragen, welche Informationen noch benötigt werden um die Anforderungen eindeutig festzulegen. Erzeuge eine Struktur von *.md Dateien und gliedere das Projekt eindeutig.

### Arbeitsschritte
- Alle drei Dokumente gelesen. Die Excel-Datei war schreibgeschützt verschlüsselt und wurde mit dem Standardpasswort entschlüsselt; die VBA-Makros wurden ausgelesen.
- Zugriff auf den Ordner `Claude_codebase` angefragt und erhalten.
- Projektstruktur angelegt: `AGENTS.md`, `README.md`, VS-Code-Workspace, `docs/00_ueberblick` bis `docs/07_entscheidungen`, `docs/_quellen` (Originaldokumente).
- Der Ordner `.vscode` durfte aus der Ferne nicht beschrieben werden. Einstellungen und Extension-Empfehlungen stehen deshalb in `AI_TPI.code-workspace`.

### Assistent
Das Projekt wurde angelegt: 33 Dateien mit Plan, Struktur und `AGENTS.md`, noch ohne Code.

**Die Quellen passen in drei Punkten nicht zur Aufgabenstellung:**
- **Deutsche und englische Fragen sind nicht dieselben.** Word = TPI NEXT® (Stufen Kontrolliert/Effizient/Optimierend, ca. 150 Kontrollpunkte). Excel = Agile TPI (Individuum/Team/Organisation, Prioritätsgruppen A–G, 108 Kontrollpunkte). Eine englische Fassung muss übersetzt werden.
- **Beide Quellen haben 16 Kernbereiche, nicht 14.**
- **Das Word-Dokument ist lückenhaft:** Bei „Grad der Beteiligung“ fehlen Überschrift und Stufe Kontrolliert; es enthält firmenspezifische Bewertungen und ab dem SAP-Kapitel themenfremde Inhalte.
- Die Excel-Makros färben nur die Reifegradmatrix ein und zeigen den angeklickten Punkt an; alles lässt sich in JavaScript nachbauen.

**KI-Erweiterung (Vorschlag):** neue Kernbereiche KB17 „KI-Governance, Ethik und Kompetenz“, KB18 „KI-gestützte Anforderungsprüfung“, KB19 „KI-gestützte Entwicklung und Dokumentation“, optional KB20 „QS KI-basierter Systeme“; 21 KI-Kontrollpunkte in bestehenden Bereichen; insgesamt 55 neue Kontrollpunkte mit Aufwandsklasse (kurzfristig < 1 Monat / langfristig).

**Blockierende Fragen:** F-01 führendes Modell · F-02 Nutzungsrechte · F-03 14 oder 16 Kernbereiche · F-04 welche KI · F-07 Herkunft der Autorenliste · F-09 paralleles Arbeiten vs. lokale Speicherung · F-23 reines JavaScript oder Framework.

---

## 2. Nutzer – 08.11.2026, 23:57

> Zu F-01: Agile Teile zum TPI Next Model ergänzen
> Zu F-02: Die Kontrollpunkte sind ein öffentliches Modell und dürfen offiziell verwendet werden. Die Applikation wird nur intern genutzt.
> Zu F-03: Bitte die 16 Kernbereiche auf 19 erweitern
> Zu F-04: Die Auswahl der KI soll über ein einen Admin Bereich innerhalb der Applikation durch den Nutzer selbst festgelegt und die Konfiguration geändert werden können.
> Zu F-07: Der Nutzer muss sich erst an der Applikation mit seiner Mail Adresse und seinem Passwort anmelden. Eine Anmeldung über SSO sollte im Nachgang auf einfache Weise entwicklungstechnisch möglich sein. Das Initiale Passwort kann sich der Nutzer bei erstmaliger Anmeldung selbst über die Funktion (Link in der Anmeldemaske) "Passwort vergessen" an sine Mail Adresse zuschicken lassen. Eine Änderung des Initialpasswortes nach dem erstmaligen Anmelden durch den Nutzer ist zwingend erforderlich. Eine Prüfung des Passwortes auf Sicherheit wird graphisch in 3 Stufen, schwach, mittel und stark angezeigt. Berückichtig dabei wird die Orginalität, des Passwortes. Die Passwort Richtlinien sind mindestes 6 Zeichen darunter eine Zahl, ein Großbuchstabe und ein Sonderzeichen. Alle Richtlinien werden als aktiv unter dem Passwortfeld eingeblendet und werden aktiv in grüner Farbe markiert, wenn die Anforderung erfüllt wurde. Erst wenn alle Richtlinien erfüllt sind, wird die Passwort Eingabe akzeptiert. Die Playwright Testfälle prüfen auch die noch nicht erfüllt und bereits teilerfüllte Eingabe. Auf der Login Page soll ein Logo der Firma verwendet werden, die aktuell den Reifegrad des Testprozesses ermittelt. Über den Admin Bereich soll es möglich sein die Adresse zu dem Firmenlogo konfigurieren zu können.
> Zu F-09: Es arbeiten mehrere Personen aus mehreren Abteilungen parallel and der Beantwortung des Service Kataloges.
> Zu F-23: JavaScript, React und Vue sind gängige Frameworks, die verwendet werden dürfen.

### Arbeitsschritte
- Architektur auf Client-Server umgestellt (Node.js, PostgreSQL), Datenmodell v2.
- Neue Dokumente: `06_authentifizierung-und-sicherheit.md`, `07_admin-bereich.md`, `03_fragenkatalog/04_agile-ergaenzung.md` (Rohzuordnung aller 108 Agile-TPI-Punkte), ADR-002 bis ADR-005.
- KB20 entfernt (19 Kernbereiche), 50 Testfälle ergänzt.

### Assistent
Alle Antworten wurden eingearbeitet. **Die größte Änderung:** Durch Anmeldung, Admin-Bereich und paralleles Arbeiten wird aus der Browser-App eine Client-Server-Anwendung (Vorschlag React, Node.js, PostgreSQL, Docker); die Roadmap verlängert sich um etwa 3–4 Wochen.

- **Modell:** TPI NEXT bleibt führend, die 108 agilen Punkte sind als Rohfassung zugeordnet; ca. 40–50 Doppelungen, Gesamtkatalog ca. 260–270 Punkte.
- **19 Kernbereiche**, KB20 entfällt, 50 KI-Kontrollpunkte.
- **Anmeldung:** „Passwort vergessen“, Pflichtänderung, vier Regeln live grün, Stärke in drei Stufen (zxcvbn-ts), SSO vorbereitet.
- **Admin-Bereich:** Benutzer, Abteilungen, Logo-URL, KI-Auswahl mit Verbindungstest, Passwortrichtlinie, Mailserver; API-Schlüssel nur auf dem Server.
- **Testfälle:** 50 neue, davon 14 Passwortfälle.
- **Sicherheitshinweis:** 6 Zeichen liegen unter den Empfehlungen von BSI/NIST; Mindestlänge konfigurierbar. `Passw0rt!` erfüllt alle Regeln, gilt aber als „schwach“ (N-09).

**Blockierende Fragen:** N-01 Kontenanlage/erster Admin · N-02 Rollen · N-03 gemeinsame Antwort oder Abteilungsantworten · N-05 Mailserver · N-06 Betrieb · N-07 Initialpasswort oder Einmal-Link · N-10 React/TypeScript · N-11 ein Logo oder mehrere Firmen.

---

## 3. Nutzer – 09.11.2026, 00:36

> Zu N-01: Admin wird automatisch der erste Nutzer, der sich über den Server anmeldet. Der Administrator kann anderen Nutzern admin Rechte zuweisen indem er die Rolle Admin zuordnet. Es gibt in der Applikation drei Rollen zur Auswahl:
> Admin, Nutzer, Gast wobei nimmer nur eine Rolle zugleich einer Nutzer E-Mail zugewiesen werden kann. Der Admin kann initial neue Nutzer anlegen, den Nutzer Account aktiv oder inaktiv setzen, Nutzernamen und e-Mail ändern oder löschen. Vor dem Löschen wird eine Rückfrage vom System an den Nutzer gestellt (Pop up), ob die Löschung tatsächlich erfolgen soll. Diesen Dialog muss der Admin bestätigen oder aktiv abbrechen. Sobald der Admin den Nuzter angelegt wird, wird dieser über eine Email benachrichtigt indem ein Link auf die Login Page geschickt wird, um die Registrierung zu starten. Es wird darüber in der e-mail informiert, wie der Nutzer sich das erste Initialpasswort selbst erstellen kann.
> Zu N-02: Die vorgeschlagenen Rollen werden bestätigt.
> Zu N-03: der Assessor führt die von den Abteilungen separat erfassten Antworten zusammen, sämtliche Änderungen und Anpassungen werden in der Änderungshistorie protokolliert. Über den Admin Bereich kann können alle Rollen den Änderungsverlauf einsehen, natürlich auch wer und wann die Änderung vorgenommen wurde.
> Zu N-05: Die Konfiguration des Mailservers erfolgt durch den Admin im Admin Bereich Es wird ein Default Mailserver der vom Betriebsystem verwendete Standard verwendet.
> Zu N-06: Der Server soll zunächst lokal laufen, später dann über eine CI/CD-Pipeline gebaut und betrieben werden.
> Zu N07: Einmallink in der E-Mail
> Zu N10: TypeScript und Vue dürfen eingesetzt werden
> Zu N11: Mehrere Firmen werden ihr Logo verwenden der Bericht enthält auch ein Benchmark Vergleich, wie die Firma im Vergleich zur Firmen innerhalb der selben Branche  und im Vergleich zu allen befragten Firmen stehen. Die aktuelle Branche wird im Admin Bereich für das aktuelle Firman Logo vom Admin ausgewählt. Schlage eine Liste von generellen Branchen vor.

### Arbeitsschritte
- Neue Dokumente: `08_mandanten-und-benchmark.md` (inkl. 25 Branchen nach WZ 2008/NACE), `02_analyse/03_zusammenfuehrung-und-historie.md`, ADR-006.
- Technologie auf Vue 3 + TypeScript umgestellt (ADR-002), Betrieb lokal → CI/CD (ADR-003).
- Testkatalog auf 174 Fälle erweitert.
- Die Übertragung schlug zunächst fehl, weil der Rechner nicht erreichbar war; die Dateien wurden als ZIP bereitgestellt.

### Assistent
Die Antworten wurden eingearbeitet, konnten aber zunächst nicht übertragen werden (Rechner im Ruhezustand); Ersatz: `AI_TPI_docs_runde2.zip`.

- **Technologie:** Vue 3 mit TypeScript, Node.js, PostgreSQL; zunächst lokal, später CI/CD.
- **Benutzerverwaltung:** erster Nutzer wird Admin; Einladungs-Mail mit Anleitung „Passwort vergessen“; Einmal-Link; Lösch-Dialog mit vorausgewähltem „Abbrechen“.
- **Zusammenführung:** Abteilungen antworten separat, Assessor führt mit Begründung zusammen; unveränderbare Historie für alle Rollen.
- **Mehrere Firmen und Benchmark:** eigenes Logo und eigene Branche, strikte Datentrennung, anonymer Vergleich über Mittelwerte und Mindestanzahl.
- **Branchenliste:** 25 Branchen, erweiterbar.
- **Hinweise:** Widerspruch Rollen (Admin/Assessor/Befragter/Leser vs. Admin/Nutzer/Gast); „Erster Nutzer wird Admin“ ist ein Sicherheitsrisiko; auf macOS ist kein Mailserver eingerichtet (Mailpit für die Entwicklung).

**Blockierende Fragen:** R-08 Rollen · R-02 Admin je Firma · R-01 Logo vor der Anmeldung · R-06 Absicherung erster Admin.

---

## 4. Nutzer – 09.11.2026, 00:44

> Rechner ist wieder aufgeweckt

### Assistent
Alle 31 aktualisierten Dateien wurden in den Projektordner übertragen; das ZIP-Archiv wird nicht mehr gebraucht. Neu: `08_mandanten-und-benchmark.md`, `03_zusammenfuehrung-und-historie.md`, `ADR-006-mandanten-und-benchmark.md`. Offen: R-08, R-02, R-01, R-06.

---

## 5. Nutzer – 09.11.2026, 00:46

> Admin, Assessor, Befragter und Leser sind die zu verwendeten Rollen und werden festgelegt.

### Assistent
Die vier Rollen sind in allen Dokumenten verbindlich; jeder Nutzer hat genau eine.

| Rolle | Darf |
|---|---|
| Admin | alles, inkl. Admin-Bereich; vergibt Rollen |
| Assessor | Assessments anlegen, Kernbereiche zuweisen, zusammenführen, Empfehlungen |
| Befragter | für die eigene Abteilung antworten und kommentieren, Bericht lesen |
| Leser | nur lesen |

4 neue Tests (178 gesamt). Neue Frage R-15: Dürfen Leser kommentieren? Offen: R-02, R-01, R-06.

---

## 6. Nutzer – 09.11.2026, 00:48

> Erster Nutzer der sich über localhost anmeldet wird Admin.

### Assistent
Die Regel steht in allen betroffenen Dokumenten; der Konsolen-Code entfällt.
- `/setup` gibt es nur, solange kein Nutzer existiert und der Aufruf von localhost kommt; sonst „nicht gefunden“.
- Der Server prüft die tatsächliche Verbindung, nicht fälschbare Angaben.
- Für den späteren Betrieb hinter Proxy/Docker: Abschalter `SETUP_ENABLED=false` und Konsolenbefehl `npm run create-admin`.
- 3 neue Tests (181 gesamt). Offen: R-02, R-01.

---

## 7. Nutzer – 09.11.2026, 00:59

> Zu R-02: Jeder Admin verwaltet seine Firma. Admin Firmen Email und Nutzer Email müssen der selben Firma angehören. Admins können Admins anderer Firmen mit anderen Firmen Adressen erstellen.
> Zu R-01: dem Vorschlag wird gefolgt
> Zu R-06: nur über localhost abgesichert

### Assistent
Alle blockierenden Fragen sind beantwortet.
- **R-02:** Jeder Admin verwaltet nur seine Firma; Firmen hinterlegen ihre E-Mail-Domain(s); Nutzer müssen eine Adresse dieser Domain haben; Admins können neue Firmen mit Admin anlegen; der erste Admin legt bei der Einrichtung seine Firma an.
- **R-01:** `/login/<firmenkürzel>`, auch in der Einladungs-Mail; `/login` neutral.
- **R-06:** nur localhost.
- 11 neue Tests (192 gesamt).
- Neue Fragen: S-01 Zugriff auf selbst angelegte Firmen/Admins · S-03 externe Berater · S-04 KI- und Mail-Konfiguration je Firma.

---

## 8. Nutzer – 09.11.2026, 01:14

> zu S-01: Ein Admin kann auch Admins für bestehende Firmen anlegen und hat weiterhin Zugriff auf die Admins, die er angelegt hat. Er kann auch den erstellten Admin auf die Rolle eines Nutzers umstellen und weitere Admins für eine bereits bestehende Firma anlegen.
> zu S-03: Externe Berater müssen eine interne Firmenadresse bekommen. Sie unterscheiden sich z.B. durch ein Präfix in der email Adresse ext.<vorname>.<nachname>@<firmenname>.com
> zu S-04: Jede Firma bekommt ihre eigenen Einstellungen für die auswählbaen KI Module und Mail Server Konfiguration.

### Assistent
- **S-01:** Admins legen Admins für neue und bestehende Firmen an; unter „Von mir angelegte Admins“ Rollenwechsel, aktiv/inaktiv, Einladung erneut senden; Schutz des letzten Admins je Firma.
- **S-03:** Präfix `ext.` wird erkannt (auch Großschreibung), Kennzeichnung „Extern“; Domain-Regel gilt auch für Externe.
- **S-04:** KI-Module und Mailserver je Firma.
- 12 neue Tests (204 gesamt).
- Sicherheitspunkt: Eingriff von außen in fremde Firmen → Vorschlag Benachrichtigung + Audit-Log (S-07). Neue Fragen S-06 bis S-09.

---

## 9. Nutzer – 09.11.2026, 01:32

> zu S-01: Jeder Admin kann für bestehende Admins und Nutzer über einen Button deren Passwörter zurücksetzen. Die Betroffenen bekommen dann einen neuen Link per Mail zugeschickt. Ebenso werden Admins per Mail informiert. Wenn Admins außerhalb ihrer Domain Änderungen an Nutzern vornehmen, weitere Admins erstellen oder bestehende Admins einer Firma gelöscht wurden.
> zu S-06: Admin einer Firma sehen nicht die Ergebnisse des Assessments, nur die aggregierten Daten für den Vergleich zur eigenen Branche und zu allen Branchen.
> zu S-08: Externe Nutzer werden nicht von Hand in dieser Applikation konfiguriert. Dies erfolgt durch die Mail Server Administratoren, welche die eMail einrichten:
> Zu S-09: die Annahme ist richtig. Neben dem Assessor kann auch der Admin das KI-Modell auswählen:

### Assistent
- **S-06:** Admin wird reine Verwaltungsrolle; keine Antworten, Kommentare, Berichte oder Empfehlungen, nur zusammengefasste Benchmark-Werte; Sperre auch auf dem Server.
- **Passwort zurücksetzen per Button**, neuer Einmal-Link; **Benachrichtigung** der Admins bei Eingriffen von Admins fremder Domains.
- **S-08:** „Extern“ ergibt sich nur aus der Adresse.
- **S-09:** Assessor und Admin wählen das KI-Modul.
- 17 neue Tests (221 gesamt).
- Neue Fragen: S-12 Historie enthält Ergebnisse · S-11 Sperre auch für eigene Firma? · S-13 Löschen fremder Admins · S-10 Reichweite des Passwort-Resets.

---

## 10. Nutzer – 09.11.2026, 01:45

> zu S-12. Vorschlag akzeptiert
> Zu S-11: Die Sperre gilt nicht für die eigene Firma. In der eigenen Firma dürfen die Admins auch die Ergebnisse der Befragung sehen.
> zu S-13: Vorschlag akzeptiert
> Zu S-10: Der Admin kann ein Passwort für jeden Nutzer und Admins in seiner eignen Firma zurücksetzen. Der Admin kann ein Passwort der Admins und Nutzer der anderen Firmen zurück setzen. Wird das Passwort eines Nutzers einer anderen Firma über die Mail gestartet, bekommt der Admin der Firma diese Information per Mail zugeschickt.

### Assistent
| Thema | Jetzt im Plan |
|---|---|
| S-11 | Admins sehen Ergebnisse der eigenen Firma, nur lesend; andere Firmen nur Benchmark |
| S-12 | Historie der eigenen Firma; firmenübergreifende Admin-Aktionen als Verwaltungsereignis |
| S-13 | Nur Admins derselben Firma löschen Admins; übrige Admins bekommen eine Mail |
| S-10 | Reset für jeden Nutzer/Admin; bei fremder Firma Info-Mail an deren Admins |

8 neue Tests (229 gesamt). Vorschläge: S-14 Reset fremder Firmen nur per E-Mail-Eingabe · S-15 max. 3 firmenübergreifende Resets je Nutzer und Tag.

---

## 11. Nutzer – 09.11.2026, 01:50

> zu S-14: Vorschlag akzeptiert
> zu S-15: Vorschlag akzeptiert

### Assistent
S-14 und S-15 sind als entschieden eingetragen. Die Rechte- und Firmenlogik ist vollständig festgelegt; offen sind nur Detailfragen mit Vorschlag, die nicht blockieren.

Nächster Schritt (vorgeschlagen): Fragenkatalog erstellen – deutsche Kontrollpunkte bereinigen (inkl. KB2), agile Punkte einordnen und Doppelungen zusammenführen, KB17–KB19 ergänzen, Gesamtkatalog DE/EN als JSON mit Prüfschema plus lesbare Übersicht.

---

## 12. Nutzer – 09.11.2026, 01:54

> Speichere den Chatverlauf in einem lokalen Verzeichnis im Projektordner als gepackte Datei ab.

### Assistent
Dieses Dokument wurde erstellt und als ZIP-Archiv im Projektordner unter `chatverlauf/` abgelegt.

---

## Stand am Ende der Sitzung

| Bereich | Stand |
|---|---|
| Phase | Planung abgeschlossen, alle blockierenden Fragen beantwortet |
| Technologie | Vue 3 + TypeScript, Node.js/Fastify, PostgreSQL, Playwright; lokal → CI/CD |
| Modell | 19 Kernbereiche (TPI NEXT + agile Ergänzung + KB17–19 KI) |
| Rollen | Admin, Assessor, Befragter, Leser (genau eine je Nutzer) |
| Firmen | mehrere Firmen, Domain-Bindung, `/login/<kürzel>`, Benchmark nach Branche |
| Testkatalog | 229 Playwright-/API-Testfälle |
| Nächster Schritt | Fragenkatalog DE/EN als JSON erstellen |
