# Offene Fragen zur Klärung der Anforderungen

> Bitte direkt in der Spalte **Antwort** ergänzen. Zu jeder Frage ist ein **Vorschlag** angegeben – wird nichts geantwortet, gilt der Vorschlag als Annahme.
> Priorität: 🔴 blockiert den Start · 🟠 vor Umsetzung der betroffenen Funktion · 🟢 kann später geklärt werden.

## Teil 1 – Beantwortet

### Runde 1 (08.11.2026)
| ID | Frage (kurz) | Antwort | Auswirkung |
|---|---|---|---|
| F-01 | Führendes Modell | TPI NEXT®, agile Teile ergänzen | ADR-001, `03_fragenkatalog/04_agile-ergaenzung.md` |
| F-02 | Nutzungsrechte | öffentliches Modell, nur interne Nutzung | – |
| F-03 | Anzahl Kernbereiche | 19 (16 + KB17–19) | KB20 entfällt |
| F-04 | Welche KI | Auswahl/Konfiguration im Admin-Bereich | ADR-004 |
| F-07 | Anmeldung, Passwort, Logo | Login E-Mail/Passwort, SSO später, Passwortregeln live, Stärke 3 Stufen, Logo konfigurierbar | ADR-005 |
| F-09 | Paralleles Arbeiten | mehrere Abteilungen parallel | Client-Server |
| F-23 | Technologie | JavaScript, React oder Vue | → N-10 |

### Runde 2 und 3 (09.11.2026)
| ID | Frage (kurz) | Antwort | Auswirkung |
|---|---|---|---|
| N-01 | Kontenanlage, erster Admin | **Erster Nutzer, der sich am Server anmeldet, wird Admin.** Admin kann Admin-Rolle vergeben. Genau eine Rolle je E-Mail (Rollen siehe R-08). Admin legt Nutzer an, setzt aktiv/inaktiv, ändert Name/E-Mail, löscht (mit Bestätigungs-Pop-up: bestätigen oder abbrechen). Neue Nutzer erhalten eine **Einladungs-Mail** mit Link zur Login-Seite und Anleitung zum Selbsterstellen des Initialpassworts. | `04_architektur/07_admin-bereich.md`, `06_…sicherheit.md` §0–1 |
| N-02 | Rollen | Vorgeschlagene Rollen bestätigt | siehe R-08 |
| N-03 | Antwortmodell | **Abteilungen antworten separat, Assessor führt zusammen**; alle Änderungen in der **Änderungshistorie**; Einsicht über den Admin-Bereich für **alle Rollen** (wer, wann) | `02_analyse/03_zusammenfuehrung-und-historie.md` |
| N-05 | Mailserver | Konfiguration durch Admin; **Standard: Mailversand des Betriebssystems** | sendmail-Transport, SMTP optional |
| N-06 | Betrieb | **zunächst lokal**, später **CI/CD-Pipeline** | ADR-003 |
| N-07 | Initialpasswort | **Einmal-Link** in der E-Mail | ADR-005 |
| N-10 | Framework | **TypeScript und Vue** dürfen eingesetzt werden | ADR-002: Vue 3 + TypeScript |
| R-08 | Rollenmodell | **Admin, Assessor, Befragter und Leser** sind die verbindlichen Rollen (09.11.2026); genau eine je Nutzer | `07_admin-bereich.md` §1 |
| R-06 | Absicherung erster Admin | **Der erste Nutzer, der sich über localhost anmeldet, wird Admin**; Absicherung nur über localhost (bestätigt) | `06_…sicherheit.md` §0 |
| R-01 | Logo vor der Anmeldung | **Vorschlag angenommen:** `/login/<firmenkürzel>`, auch in der Einladungs-Mail; `/login` neutral | `06_…sicherheit.md` §6 |
| R-02 | Admin-Reichweite | **Jeder Admin verwaltet seine Firma.** Admin- und Nutzer-E-Mail müssen derselben Firma angehören. **Admins können Admins anderer Firmen mit deren Firmenadressen erstellen.** | `08_mandanten-und-benchmark.md` §2 |
| S-01 | Admins für andere Firmen | **Admin kann Admins auch für bestehende Firmen anlegen**, behält Zugriff auf die von ihm angelegten Admins, kann sie auf eine Nutzer-Rolle umstellen und weitere Admins für bestehende Firmen anlegen | `08_…benchmark.md` §2 M3/M4 |
| S-01b | Passwort-Reset, Benachrichtigung | **Admins setzen Passwörter von Admins und Nutzern per Button zurück** (neuer Link per Mail). **Admins werden per Mail informiert**, wenn Admins außerhalb ihrer Domain Nutzer ändern, Admins erstellen oder Admins der Firma gelöscht werden | `07_admin-bereich.md` §3.4–3.5 |
| S-06 | Sicht des Admins | **Admins sehen keine Assessment-Ergebnisse**, nur aggregierte Daten für den Vergleich zur eigenen Branche und zu allen Branchen | Rechtematrix angepasst |
| S-07 | Sicherheit firmenübergreifender Admins | durch S-01b beantwortet: Benachrichtigung per Mail + Audit-Log | – |
| S-08 | Externe manuell markieren | **Nein** – Externe werden von den Mailserver-Administratoren über die E-Mail-Adresse (`ext.`) eingerichtet | kein Feld „extern“ |
| S-09 | KI-Modul-Auswahl | **Annahme bestätigt**; neben dem Assessor kann auch der **Admin** das KI-Modell auswählen | `05_ki-empfehlungen.md` §1a |
| S-10 | Passwort-Reset Reichweite | Admin setzt Passwörter **aller Nutzer und Admins der eigenen Firma** und **auch von Nutzern und Admins anderer Firmen** zurück; bei anderen Firmen erhält deren Admin eine **Info-Mail** | `07_admin-bereich.md` §3.4 |
| S-11 | Ergebnisse eigene Firma | **Admins dürfen die Ergebnisse der eigenen Firma sehen**; Sperre gilt nur für andere Firmen | Rechtematrix angepasst |
| S-12 | Historie für Admins | **Vorschlag akzeptiert** – in Verbindung mit S-11: Admins sehen die Historie der eigenen Firma, firmenübergreifende Admin-Aktionen als Verwaltungsereignisse | – |
| S-13 | Löschen fremder Admins | **Vorschlag akzeptiert:** nur Admins der eigenen Firma löschen; übrige Admins werden informiert | – |
| S-14 | Reset fremder Firmen | **Vorschlag akzeptiert:** nur per Eingabe der vollständigen E-Mail-Adresse, keine Listen/Suche | – |
| S-15 | Reset-Limit | **Vorschlag akzeptiert:** max. 3 firmenübergreifende Resets je Nutzer und Tag + Info-Mail | – |
| S-03 | Externe Berater | **Interne Firmenadresse mit Präfix**, z. B. `ext.<vorname>.<nachname>@<firma>.com` | Kennzeichnung „Extern“ |
| S-04 | KI/Mail-Konfiguration | **Je Firma eigene Einstellungen** für KI-Module und Mailserver | `07_admin-bereich.md` |
| N-11 | Logo / Firmen | **Mehrere Firmen mit eigenem Logo**; Bericht mit **Benchmark** (eigene Branche, alle Firmen); Branche wählt der Admin; Branchenliste vorschlagen | `04_architektur/08_mandanten-und-benchmark.md`, ADR-006 |

## Teil 2 – Neue Fragen

### Runde 4/5 – keine blockiert den Start
| ID | Prio | Frage | Vorschlag | Antwort |
|---|---|---|---|---|
| S-02 | 🟠 | **Freemail-Domains** (gmail.com, web.de, gmx.de, outlook.com …) als Firmen-Domain sperren? | ja, Sperrliste pflegbar | |
| S-05 | 🟢 | Branchenliste: global für alle Firmen (Benchmark braucht gleiche Liste) – wer pflegt sie? | global, Änderung nur per Konfigurationsdatei/Release | |

### Runde 3

| ID | Prio | Frage | Vorschlag | Antwort |
|---|---|---|---|---|
| R-15 | 🟢 | Dürfen **Leser** Kommentare schreiben (z. B. Rückfragen des Managements), oder nur lesen? | nur lesen | |
| R-03 | 🟠 | **Benchmark-Anonymität:** Mindestanzahl Firmen für einen Vergleich (Vorschlag 5)? Nur Median/Quartile, keine Einzelwerte? | 5; Median + Quartile | |
| R-04 | 🟠 | Dürfen Firmen der Teilnahme am Benchmark **widersprechen** (Opt-out)? Dürfen sie dann selbst noch den Vergleich sehen? | Opt-out möglich; wer nicht teilnimmt, sieht keinen Vergleich | |
| R-05 | 🟢 | Branchenliste (25 Einträge, siehe `08_mandanten-und-benchmark.md`) in Ordnung? Zusätzliche Vergleichsdimension **Unternehmensgröße** (KMU / Mittelstand / Konzern)? | Liste ok; Größe als optionales Feld | |
| R-07 | 🟠 | **Doppelte Passwortänderung vermeiden:** Wer sein erstes Passwort über den Einmal-Link selbst festlegt, hat bereits ein eigenes Passwort. Soll das als erfüllte „Pflichtänderung“ gelten? Und soll die Einladungs-Mail optional **direkt** einen Einmal-Link enthalten (ohne Umweg über „Passwort vergessen“)? | gilt als erfüllt; Umweg über „Passwort vergessen“ bleibt Standard | |
| R-09 | 🟢 | Wenn der Admin die E-Mail-Adresse eines Nutzers ändert: Bestätigung an die neue Adresse und Hinweis an die alte? | ja | |
| R-10 | 🟠 | **Gelöschte Nutzer:** Bleiben ihre Antworten, Kommentare und Historieneinträge mit pseudonymisiertem Namen („Gelöschter Nutzer #1234“) erhalten? | ja | |
| R-11 | 🟠 | **Vorschlag für die Zusammenführung:** Soll das System bei uneinigen Abteilungen die strengere Bewertung bzw. „Teilweise“ vorschlagen? Ist eine Begründung des Assessors bei Abweichung Pflicht? | ja / ja | |
| R-12 | 🟠 | **Datenschutz Historie:** Auch Leser sehen in der Änderungshistorie, **wer** wann was geändert hat. Ist das mit Datenschutz bzw. Betriebsrat abgestimmt, oder sollen Leser Namen nur pseudonymisiert sehen? | mit Namen, nach Abstimmung | |
| R-13 | 🟢 | **CI/CD-Plattform** für Phase 2: GitHub Actions, GitLab CI oder Azure DevOps? Zielumgebung (interner Server, Kubernetes, Cloud)? | GitHub Actions, Docker auf internem Server | |
| R-14 | 🟢 | Wird ein **lokaler Mailserver** auf dem Rechner tatsächlich betrieben? Auf macOS ist standardmäßig keiner eingerichtet, Mails würden dann nicht ankommen. Bis zur SMTP-Konfiguration kann der Admin Einladungslinks in der Oberfläche kopieren. | Mailpit lokal; Link-Kopie als Notfallweg | |

## Teil 3 – Weiterhin offen (Vorschlag gilt, falls keine Antwort)

| ID | Prio | Frage | Vorschlag | Antwort |
|---|---|---|---|---|
| N-04 | 🟠 | Kernbereiche Abteilungen zuweisen (nur diese antworten)? | ja; alle Mitglieder dürfen lesen und kommentieren | |
| N-09 | 🟠 | (a) Mindestlänge konfigurierbar, Standard 6? (b) Passwort mit Stärke „schwach“ trotz erfüllter Regeln akzeptieren? | (a) ja; (b) nein, mindestens „mittel“ | |
| N-08 | 🟢 | Sitzung 60 min Leerlauf; 5 Fehlversuche → 15 min Sperre; kein Passwortablauf | wie vorgeschlagen | |
| N-12 | 🟠 | Kommentare: Verfasser automatisch, Quelle zusätzlich wählbar (optional)? | ja | |
| N-13 | 🟢 | E-Mail-Benachrichtigungen (Zuweisung, Erwähnung) | Release 1.1 | |
| N-14 | 🟢 | Vorgehensmodell je Assessment (klassisch / agil / beides) | ja, Standard „beides“ | |
| N-15 | 🟢 | SSO-System später | Entra ID (OIDC) | |
| N-16 | 🟢 | Logo auch hochladen statt nur URL | beides | |
| N-17 | 🟠 | Anzahl gleichzeitiger Nutzer / Firmen | < 50 gleichzeitig, < 100 Firmen | |
| N-18 | 🟠 | KI-Anbieter für Release 1 | Anthropic, OpenAI, Azure OpenAI, Ollama, LM Studio, OpenAI-kompatibel | |
| F-05 | 🟠 | Antwortskala mit „Teilweise“ | ja (Gewicht 0,5) | |
| F-06 | 🟠 | Berechnung Gesamtreifegrad | Minimum, Median, gewichteter Index | |
| F-10 | 🟠 | KI-Kontrollpunkte fachlich passend; separater KI-Index | separater KI-Index | |
| F-12 | 🟢 | Pflege Fragenkatalog | Excel-Import per Skript | |
| F-13 | 🟠 | Exportformate | PDF + JSON (R1), Excel (R1.1) | |
| F-14 | 🟢 | Bericht ein-/zweisprachig | gewählte Sprache | |
| F-17 | 🟢 | Corporate Design, Dunkelmodus | Farben je Firma aus Logo ableitbar; Hell/Dunkel | |
| F-18 | 🟠 | BRUNATA-Bewertungstexte als Demo-Assessment | ja | |
| F-20 | 🟠 | Vorlage Management-Bericht | Gliederung in `04_architektur/04_…` | |
| F-21 | 🟠 | Grenze kurz-/langfristig | Durchlaufzeit < 1 Monat | |
| F-22 | 🟢 | Maßnahmenplan / Export Jira, aqua | Maßnahmenplan R1, Export später | |
| F-25 | 🟠 | Referenzgeräte | Playwright-Emulation | |
| F-15 | 🟢 | Prüfung Übersetzungen | Auftraggeber | |

**Entfallen:** F-08, F-11, F-16, F-19, F-24, F-26 (durch spätere Antworten ersetzt).
