# Testfallkatalog (Playwright) – Entwurf

Typ: **P** = Positivtest, **N** = Negativtest. Gerät: **A** = alle Profile, **D** = Desktop, **M** = Mobil/Tablet.
Alle Tests außer AUTH/PWD starten mit einem angemeldeten Nutzer (Playwright `storageState` je Rolle).

## Anmeldung (AUTH)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-AUTH-001 | P | A | Login mit gültiger E-Mail und Passwort | Startseite, Name in der Kopfzeile |
| TC-AUTH-002 | N | A | Login mit falschem Passwort | generische Meldung „E-Mail oder Passwort falsch“ |
| TC-AUTH-003 | N | D | Login mit unbekannter E-Mail | **identische** Meldung wie TC-AUTH-002 |
| TC-AUTH-004 | N | D | Leere Felder / ungültiges E-Mail-Format | Feldvalidierung, kein Request |
| TC-AUTH-005 | N | D | 5 Fehlversuche in Folge | Konto vorübergehend gesperrt, Hinweis |
| TC-AUTH-006 | N | D | Geschützte URL ohne Anmeldung aufrufen | Weiterleitung zum Login, nach Login zurück zur URL |
| TC-AUTH-007 | P | A | Abmelden | Sitzung beendet; „Zurück“-Taste zeigt keine Daten |
| TC-AUTH-008 | N | D | Sitzung abgelaufen (Uhr per `page.clock` vorgestellt) | Weiterleitung zum Login mit Hinweis |
| TC-AUTH-009 | N | D | Deaktivierter Nutzer meldet sich an | Anmeldung abgelehnt |
| TC-AUTH-010 | P | A | `/login/<firmenkürzel>` zeigt Logo der Firma | `img` mit konfigurierter URL und Alt-Text sichtbar |
| TC-AUTH-012 | N | D | `/login/<unbekanntes-kürzel>` | neutrales Logo, keine Fehlerseite, kein Hinweis auf Existenz |
| TC-AUTH-013 | P | D | Kopfzeile nach Login zeigt Logo der eigenen Firma | korrektes Logo |
| TC-AUTH-011 | N | D | Logo-URL nicht erreichbar (Route liefert 404) | Platzhalter-Logo, Login weiter möglich |

## Passwort vergessen / Initialpasswort (RST)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-RST-001 | P | A | „Passwort vergessen“ mit bekannter E-Mail | Bestätigungsmeldung; Mail mit Einmal-Link in Mailpit vorhanden |
| TC-RST-002 | N | D | „Passwort vergessen“ mit unbekannter E-Mail | **gleiche** Bestätigungsmeldung; keine Mail versendet |
| TC-RST-003 | P | D | Einmal-Link aus der Mail öffnen | Seite „Passwort festlegen“ mit Regelliste erscheint |
| TC-RST-004 | N | D | Einmal-Link nach Ablauf (30 min) verwenden | Abgewiesen, Hinweis auf neuen Reset |
| TC-RST-005 | N | D | Link ein zweites Mal verwenden | Abgewiesen |
| TC-RST-006 | N | D | Während Pflichtänderung andere URL direkt aufrufen | Rückleitung zur Passwortänderung |
| TC-RST-007 | P | D | Passwort über Einmal-Link gesetzt, danach Login | Login erfolgreich, kein weiterer Pflichtdialog (R-07) |
| TC-RST-008 | N | D | Manipulierter/erfundener Token im Link | Abgewiesen, keine Detailinformation |
| TC-RST-009 | N | D | „Passwort vergessen“ für inaktiven Nutzer | gleiche Meldung, keine Mail |

## Passwortrichtlinie und Stärkeanzeige (PWD)
Testdaten als Tabelle (parametrisierte Tests). Erwartung je Regel: ✔ = grün markiert, ○ = nicht erfüllt.

| ID | Typ | Eingabe | ≥6 | Zahl | Groß | Sonder | Button | Stärke (erw.) |
|---|---|---|---|---|---|---|---|---|
| TC-PWD-001 | N | *(leer)* | ○ | ○ | ○ | ○ | inaktiv | – (keine Anzeige) |
| TC-PWD-002 | N | `abc` | ○ | ○ | ○ | ○ | inaktiv | schwach |
| TC-PWD-003 | N | `abcdef` | ✔ | ○ | ○ | ○ | inaktiv | schwach |
| TC-PWD-004 | N | `abcde1` | ✔ | ✔ | ○ | ○ | inaktiv | schwach |
| TC-PWD-005 | N | `Abcde1` | ✔ | ✔ | ✔ | ○ | inaktiv | schwach |
| TC-PWD-006 | N | `Ab1!` | ○ | ✔ | ✔ | ✔ | inaktiv | schwach |
| TC-PWD-007 | N | `ABCDEF!` | ✔ | ○ | ✔ | ✔ | inaktiv | schwach |
| TC-PWD-008 | N | `abcdef1!` | ✔ | ✔ | ○ | ✔ | inaktiv | schwach |
| TC-PWD-009 | N | `Passw0rt!` | ✔ | ✔ | ✔ | ✔ | inaktiv | **schwach** (geringe Originalität) |
| TC-PWD-010 | N | `Qwertz1!` | ✔ | ✔ | ✔ | ✔ | inaktiv | schwach (Tastaturmuster) |
| TC-PWD-011 | N | `Mustermann2026!` (Nutzer Max Mustermann) | ✔ | ✔ | ✔ | ✔ | inaktiv | schwach (Bezug zum Nutzer) |
| TC-PWD-012 | P | `Tisch7&Laterne` | ✔ | ✔ | ✔ | ✔ | aktiv | stark |
| TC-PWD-015 | P | `Kaffee7Mond!` | ✔ | ✔ | ✔ | ✔ | aktiv | mittel |
| TC-PWD-017 | N | `Sommer2026!` (deutsches Wort + Jahr) | ✔ | ✔ | ✔ | ✔ | inaktiv | schwach |
| TC-PWD-016 | N | `Hallo123!` | ✔ | ✔ | ✔ | ✔ | inaktiv | schwach |
| TC-PWD-013 | P | `vK8#qLz2!mWr9$Tb` | ✔ | ✔ | ✔ | ✔ | aktiv | stark |
| TC-PWD-014 | P | `Äpfel9§Birne` (Umlaut + §) | ✔ | ✔ | ✔ | ✔ | aktiv | stark |

Weitere Fälle:
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-PWD-020 | P | A | Regeln vor der ersten Eingabe sichtbar | alle 4 Regeln gelistet, keine grün |
| TC-PWD-021 | P | D | Schrittweise Eingabe `a→A→A1→A1!→A1!xyz` | Regeln werden nacheinander grün (Teilerfüllung sichtbar) |
| TC-PWD-022 | N | D | Erfüllte Regel wieder verletzen (Ziffer löschen) | Regel wechselt von grün zurück, Button wird inaktiv |
| TC-PWD-023 | N | A | Wiederholung stimmt nicht überein | Hinweis, Button inaktiv |
| TC-PWD-024 | N | D | Umgehung der UI: API-Aufruf mit schwachem Passwort (`request.post`) | HTTP 400, Passwort nicht geändert |
| TC-PWD-025 | N | D | Neues = altes Passwort | Ablehnung mit Hinweis |
| TC-PWD-026 | P | D | Sichtbarkeits-Umschalter | Feldtyp wechselt `password` ↔ `text` |
| TC-PWD-027 | P | D | Barrierefreiheit: Regeländerung per `aria-live` | Live-Region enthält aktualisierten Status |
| TC-PWD-028 | P | D | Admin ändert Mindestlänge auf 10 | Regeltext zeigt „mind. 10 Zeichen“, `Abcdef1!` wird abgelehnt |
| TC-PWD-029 | P | M | Regeln und Stärkebalken auf Mobil vollständig sichtbar (nicht von Tastatur verdeckt) | sichtbar nach Scroll-in-View |

## Ersteinrichtung und Benutzerverwaltung (SET / USR)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-SET-001 | P | D | Leere DB: `/setup` über localhost aufrufen, Firma + Admin registrieren | Nutzer wird **Admin**, Firma mit Domain aus E-Mail angelegt, Admin-Bereich sichtbar |
| TC-SET-002 | N | D | Leere DB: `/setup` über Nicht-localhost-Adresse (Server an LAN-IP gebunden, Aufruf über diese IP) | 404, keine Registrierung möglich |
| TC-SET-004 | N | D | Leere DB: Aufruf mit gefälschtem Header `X-Forwarded-For: 127.0.0.1` von Nicht-localhost | 404 (Header wird ignoriert) |
| TC-SET-005 | N | D | `SETUP_ENABLED=false` gesetzt | `/setup` liefert 404 auch über localhost |
| TC-SET-006 | N | A | `/einrichtung` bei nicht laufendem API-Server bzw. nicht erreichbarer Datenbank | eigene Meldung „Server nicht erreichbar“ bzw. „Fehler (HTTP 503)“ mit Hinweis auf `npm run dev`/Datenbank – nicht „Ersteinrichtung nicht verfügbar“ |
| TC-SET-003 | N | D | Zweite Selbstregistrierung nach Ersteinrichtung | nicht möglich (Seite/Endpunkt gesperrt) |
| TC-USR-001 | P | D | Einladungs-Mail prüfen | Link zur firmenspezifischen Login-Seite + Anleitung „Passwort vergessen“ enthalten (DE/EN gemäß Spracheinstellung) |
| TC-USR-002 | P | D | **End-to-End:** Admin legt Nutzer an → Mail → Login-Seite → Passwort vergessen → Einmal-Link → Passwort setzen → Login | Nutzer angemeldet, Status „aktiv“ |
| TC-USR-003 | P | D | Name und E-Mail ändern | Änderung gespeichert; Bestätigungs-Mail an neue Adresse (R-09) |
| TC-USR-004 | N | D | E-Mail auf bereits vergebene Adresse ändern (andere Groß-/Kleinschreibung) | Fehler „E-Mail bereits vergeben“ |
| TC-USR-005 | P | D | Nutzer inaktiv setzen | Login nicht möglich; laufende Sitzung des Nutzers endet |
| TC-USR-006 | P | D | Nutzer wieder aktiv setzen | Login möglich |
| TC-USR-007 | P | D | Löschen → Dialog → **Löschen bestätigen** | Nutzer entfernt; Historie zeigt pseudonymisierten Namen (R-10) |
| TC-USR-008 | N | D | Löschen → Dialog → **Abbrechen** | Nutzer unverändert vorhanden |
| TC-USR-009 | N | D | Löschen → Dialog → **Esc** / Klick außerhalb | wirkt wie Abbrechen |
| TC-USR-010 | P | D | Dialog-Fokus und Tastatur | Fokus initial auf „Abbrechen“, Fokus bleibt im Dialog |
| TC-USR-011 | P | D | Admin weist Nutzer Rolle Admin zu | Nutzer sieht nach Neuladen den Admin-Bereich |
| TC-USR-012 | N | D | Rolle auswählen: Mehrfachauswahl versuchen | UI erlaubt nur eine Rolle (Radio/Select); API mit zwei Rollen → 400 |
| TC-USR-013 | N | D | Admin versucht sich selbst zu löschen / herabzustufen | verhindert |
| TC-USR-019 | N | D | Admin versucht Abteilungsantworten zu erfassen oder zusammenzuführen | nicht möglich, 403 |
| TC-USR-014 | P | D | Rolle Leser: Bericht lesen | lesbar; alle Bearbeitungselemente fehlen; Schreib-API → 403 |
| TC-USR-015 | P | D | Rollenauswahl im Formular | genau die vier Rollen Admin, Assessor, Befragter, Leser wählbar (DE/EN) |
| TC-USR-016 | N | D | API mit unbekannter Rolle (z. B. `guest`) | 400 |
| TC-USR-017 | P | D | Rollenwechsel Befragter → Assessor | Zusammenführung sofort verfügbar |
| TC-USR-018 | N | D | Leser versucht zu kommentieren bzw. zu antworten (UI + API) | nicht möglich; 403 |

## Zusammenführung und Historie (CONS / HIST)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-CONS-001 | P | D | Zwei Abteilungen antworten unterschiedlich auf denselben KP | beide Antworten getrennt gespeichert, keine überschreibt die andere |
| TC-CONS-002 | P | D | Vergleichsansicht des Assessors | alle Abteilungsantworten + Kommentare sichtbar, Systemvorschlag angezeigt |
| TC-CONS-003 | P | D | Gleiche Antworten aller Abteilungen | Vorschlag = gemeinsame Antwort |
| TC-CONS-004 | P | D | Assessor übernimmt Vorschlag | konsolidierte Antwort gesetzt, Bericht aktualisiert |
| TC-CONS-005 | N | D | Assessor weicht ab ohne Begründung | Speichern verhindert, Hinweis |
| TC-CONS-006 | N | D | Befragter ruft Zusammenführung auf | keine Berechtigung (UI + API 403) |
| TC-CONS-007 | P | D | Bericht zeigt Konsenslücken | KP mit uneinigen Abteilungen gelistet |
| TC-CONS-008 | N | D | Befragter einer Abteilung ändert Antwort einer anderen Abteilung (API) | 403 |
| TC-HIST-001 | P | D | Antwort ändern → Historie | Eintrag mit Nutzer, Abteilung, Zeit, alt → neu |
| TC-HIST-002 | P | A | Rollen Assessor, Befragter und Leser öffnen Admin-Bereich | nur Reiter „Änderungshistorie“ sichtbar |
| TC-HIST-003 | P | D | Filter nach KP, Nutzer, Zeitraum; CSV-Export | korrekte Treffer, Datei enthält Einträge |
| TC-HIST-004 | N | D | Historieneintrag ändern/löschen per API | 404/405, Eintrag unverändert |
| TC-HIST-005 | N | D | Historie einer fremden Firma abrufen | 404 |

## Mandanten und Benchmark (TEN / BM)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-TEN-001 | N | D | Nutzer Firma A ruft Assessment-ID von Firma B auf (UI + API) | 404 |
| TC-TEN-002 | N | D | Nutzer Firma A listet Assessments | nur eigene sichtbar |
| TC-TEN-003 | P | D | Admin wählt Branche für Firma | Branche gespeichert, im Bericht angezeigt |
| TC-TEN-004 | N | D | Admin Firma A legt Nutzer mit E-Mail `@firmab.de` an | abgewiesen: „E-Mail-Domain gehört nicht zu Ihrer Firma“ |
| TC-TEN-005 | N | D | Admin ändert E-Mail eines Nutzers auf fremde Domain | abgewiesen |
| TC-TEN-006 | P | D | Admin Firma A legt neue Firma B (Domain `firmab.de`) mit Admin `admin@firmab.de` an | Firma B existiert; Einladungs-Mail mit `/login/<kürzel-B>` |
| TC-TEN-007 | N | D | Neue Firma mit Admin-E-Mail, deren Domain nicht zur neuen Firma gehört | abgewiesen |
| TC-TEN-008 | N | D | Neue Firma mit bereits vergebener Domain bzw. vergebenem Kürzel | abgewiesen |
| TC-TEN-009 | N | D | Neue Firma mit Freemail-Domain (`gmail.com`) | abgewiesen (S-02) |
| TC-TEN-010 | N | D | Admin A ruft Assessments, Berichte, Nutzerliste oder Einstellungen von Firma B auf (UI + API) | 404 (S-06) |
| TC-TEN-016 | P | D | Admin A legt für **bestehende** Firma B einen weiteren Admin `admin2@firmab.de` an | Admin angelegt, Einladung versendet; Admins von B benachrichtigt (S-07) |
| TC-TEN-017 | P | D | Admin A sieht Liste „Von mir angelegte Admins“ | enthält nur von A angelegte Konten, firmenübergreifend |
| TC-TEN-018 | P | D | Admin A stellt von ihm angelegten Admin von B auf Rolle Assessor um | Rolle geändert; Audit-Log in A und B |
| TC-TEN-019 | N | D | Admin A ändert einen **nicht** von ihm angelegten Admin von B (API) | 404 |
| TC-TEN-020 | N | D | Admin A stuft den **letzten** aktiven Admin von B herab | verhindert |
| TC-TEN-021 | N | D | Admin A versucht beim angelegten Admin Name/E-Mail zu ändern oder ihn zu löschen | nicht möglich (nur Rolle/Aktiv-Status) |
| TC-TEN-022 | P | D | Nutzer `ext.max.mustermann@brunata.com` anlegen | Badge „Extern“ in Nutzerliste, Kommentar und Historie |
| TC-TEN-028 | N | D | Nutzerformular enthält kein Feld „extern“; API-Feld `isExternal` im Request wird ignoriert | Kennzeichnung nur aus E-Mail abgeleitet (S-08) |
| TC-TEN-023 | P | D | Präfix in Großschreibung `EXT.Max.M@brunata.com` | als extern erkannt |
| TC-TEN-024 | N | D | Externer mit fremder Domain `ext.max@beratung.de` | abgewiesen (Domain-Regel gilt auch für Externe) |
| TC-TEN-025 | P | D | Firma A und B konfigurieren unterschiedliche KI-Module (gemockt) | Empfehlungen von A über Modul A, von B über Modul B |
| TC-TEN-026 | N | D | Admin A ruft KI- oder Mail-Konfiguration von B ab (API) | 404; API-Schlüssel von B nie in Antworten von A |
| TC-ADM-020 | P | D | Admin klickt „Passwort zurücksetzen“ bei Nutzer → Bestätigen | altes Passwort ungültig, Sitzungen beendet, neuer Einmal-Link in Mailpit |
| TC-ADM-021 | N | D | „Passwort zurücksetzen“ → Abbrechen | nichts geändert, keine Mail |
| TC-ADM-022 | N | D | Nutzer meldet sich nach Reset mit altem Passwort an | abgewiesen |
| TC-ADM-023 | P | D | Admin A setzt Passwort eines Nutzers von Firma B über E-Mail-Eingabe zurück | Nutzer erhält Einmal-Link; **Admins von B** erhalten Info-Mail (S-10) |
| TC-ADM-032 | N | D | Firmenübergreifender Reset mit unbekannter E-Mail | gleiche neutrale Meldung, keine Mail |
| TC-ADM-033 | N | D | Admin A versucht Nutzerliste von Firma B abzurufen (für Reset) | 404 – nur E-Mail-Eingabe möglich (S-14) |
| TC-ADM-034 | N | D | 4. firmenübergreifender Reset desselben Admins am selben Kalendertag (auch unbekannte Adressen zählen) | abgewiesen mit HTTP 429, Schaltfläche deaktiviert, Audit-Eintrag (S-15) |
| TC-ADM-035 | P | D | Admin setzt Passwort eines anderen Admins der **eigenen** Firma zurück | Link versendet, **keine** firmenübergreifende Benachrichtigung |
| TC-ADM-024 | N | D | Rolle Assessor/Befragter/Leser ruft Reset-Endpunkt auf | 403 |
| TC-ADM-025 | P | D | Admin A (Domain a.de) setzt Passwort eines von ihm angelegten Admins von B zurück | Admins von B erhalten Benachrichtigungs-Mail |
| TC-ADM-026 | P | D | Admin A legt Admin für Firma B an | alle Admins von B erhalten Benachrichtigung (wer, was, wann) |
| TC-ADM-027 | P | D | Admin von B löscht Admin von B | übrige Admins von B erhalten Benachrichtigung |
| TC-ADM-028 | N | D | Admin ändert Nutzer der **eigenen** Domain | **keine** firmenübergreifende Benachrichtigung |
| TC-ADM-029 | P | A | Admin öffnet Bericht, Antworten, Kommentare und Empfehlungen der **eigenen** Firma | lesbar, keine Bearbeitungselemente (S-11) |
| TC-ADM-036 | N | D | Admin versucht in der eigenen Firma eine Antwort zu ändern oder zusammenzuführen (API) | 403 |
| TC-ADM-037 | N | D | Admin ruft Bericht/Antworten einer **anderen** Firma auf | 404 |
| TC-ADM-030 | P | D | Admin öffnet Benchmark-Ansicht | nur aggregierte Kennzahlen (Firma vs. Branche vs. alle), keine KP-Antworten/Kommentare |
| TC-ADM-031 | P | D | Admin-Historie der eigenen Firma | enthält Ereignisse der eigenen Firma inkl. Antwortänderungen; firmenübergreifende Admin-Aktionen als Verwaltungsereignisse; nichts von anderen Firmen (S-12) |
| TC-ADM-038 | N | D | Admin A versucht Admin von Firma B zu löschen (auch selbst angelegten) | nicht möglich (S-13) |
| TC-ADM-039 | P | D | Admin von B löscht Admin von B (Bestätigungsdialog) | übrige Admins von B erhalten Mail |
| TC-REC-010 | P | D | Assessor wählt zweites KI-Modul (gemockt) | Empfehlung mit Modul/Modell des gewählten Moduls gespeichert |
| TC-REC-011 | P | D | Admin wählt Standard-KI-Modul der Firma | Vorbelegung bei Assessor geändert |
| TC-REC-012 | N | D | Befragter/Leser versucht KI-Modul zu wählen | Auswahl nicht sichtbar; API 403 |
| TC-TEN-027 | P | D | Einladungs-Mail eines Nutzers von B wird über Mailserver von B versendet | Absender/Transport von B (Mailpit-Header) |
| TC-TEN-011 | N | D | Admin B sieht Nutzer und Daten von Firma A | nicht möglich, 404 |
| TC-TEN-012 | P | D | Domain-Prüfung case-insensitive (`Max@BRUNATA.de`) | als Firmen-Domain erkannt |
| TC-TEN-013 | N | D | Subdomain `@mail.brunata.de`, nicht eingetragen | abgewiesen |
| TC-TEN-014 | N | D | Letzte Domain entfernen, obwohl Nutzer existieren | verhindert |
| TC-TEN-015 | N | D | Letzten Admin von Firma B deaktivieren, während Firma A weitere Admins hat | verhindert (Schutz gilt je Firma) |
| TC-TEN-029 | N | D | Domain hinzufügen: Freemail-Domain bzw. Domain einer anderen Firma | abgewiesen; gültige Domain wird klein geschrieben gespeichert |
| TC-BM-001 | P | D | Fixture mit ≥ 5 Firmen derselben Branche | Radar mit 3 Linien, Tabelle mit Median/Quartil korrekt |
| TC-BM-002 | N | D | Nur 3 Firmen in der Branche | Hinweis „Zu wenige Vergleichsdaten“, kein Branchenwert |
| TC-BM-003 | N | D | Benchmark-Daten enthalten keine Firmennamen/Einzelwerte | API-Antwort geprüft: nur Aggregate |
| TC-BM-004 | P | D | Nur freigegebene Assessments fließen ein | Entwurf einer Firma verändert Benchmark nicht |
| TC-BM-005 | N | D | Firma mit Opt-out | ist nicht im Vergleich enthalten; sieht selbst keinen Benchmark (R-04) |
| TC-BM-006 | P | M | Benchmark-Radar auf Mobil | lesbar, Tabellenalternative vorhanden |

## Admin-Bereich (ADM)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-ADM-001 | P | D | Admin öffnet Admin-Bereich | alle Reiter sichtbar |
| TC-ADM-002 | N | A | Befragter ruft `/admin` auf | keine Verwaltungsfunktionen, nur Reiter „Änderungshistorie“ (TC-HIST-002); Admin-API liefert 403 |
| TC-ADM-003 | P | D | Benutzer anlegen | Benutzer mit Status „eingeladen“ in Liste; Einladungs-Mail in Mailpit |
| TC-ADM-004 | N | D | Benutzer mit vorhandener E-Mail anlegen | Fehlermeldung „E-Mail bereits vergeben“ |
| TC-ADM-005 | N | D | Letzten Admin deaktivieren bzw. herabstufen | verhindert, Hinweis |
| TC-ADM-006 | P | D | Firma: Logo-URL ändern, Vorschau, speichern | firmenspezifische Login-Seite zeigt neues Logo |
| TC-ADM-007 | N | D | Logo-URL ungültig (`ftp://`, kein Bild, 404, `javascript:`) | nicht gespeichert, Fehlermeldung |
| TC-ADM-008 | P | D | KI-Konfiguration speichern + „Verbindung testen“ (gemockt ok) | Erfolgsmeldung mit Antwortzeit |
| TC-ADM-009 | N | D | Verbindungstest schlägt fehl (gemockt 401/Timeout) | verständliche Fehlermeldung |
| TC-ADM-010 | N | D | Pflichtfeld Basis-URL leer bei Modus „Lokales LLM“ | Validierungsfehler |
| TC-ADM-011 | P | D | API-Schlüssel nach Speichern | nur maskiert sichtbar; nicht in API-Antworten/Netzwerk-Log enthalten |
| TC-ADM-012 | N | D | Temperatur > 1 bzw. Timeout 0 | Validierungsfehler |
| TC-ADM-013 | P | D | Wechsel Anbieter (Ollama → Claude, gemockt) | Empfehlungen werden über neuen Adapter erzeugt |
| TC-ADM-014 | P | D | Admin-Änderung erscheint im Audit-Log | Eintrag mit Nutzer und Zeit |
| TC-ADM-015 | P | D | Mail-Transport „Betriebssystem“ → Test-Mail (Test-Setup: sendmail-Mock) | Erfolg angezeigt |
| TC-ADM-016 | N | D | Mail-Transport SMTP mit falschem Host → Test-Mail | Fehlermeldung, Warnhinweis bleibt |
| TC-ADM-017 | P | D | Einladungslink anzeigen/kopieren (Notfallweg) | Link in Zwischenablage, funktionsfähig |
| TC-ADM-040 | P | A | Abteilung anlegen | erscheint in der Liste mit „0 Nutzer“ |
| TC-ADM-041 | N | D | Abteilung ohne Namen bzw. mit vorhandenem Namen (andere Schreibweise) | Feldfehler bzw. „gibt es bereits“ |
| TC-ADM-042 | P | D | Abteilung umbenennen und deaktivieren | neuer Name; Status „inaktiv“, in der Auswahl für neue Nutzer nicht mehr angeboten |
| TC-ADM-043 | P | D | Nutzer mit Abteilung anlegen bzw. Abteilung in der Nutzerliste ändern | Abteilung beim Nutzer sichtbar |
| TC-ADM-044 | N | D | Abteilung mit zugeordneten Nutzern löschen | abgewiesen; nach Umhängen der Nutzer löschbar |
| TC-ADM-045 | N | D | Mail-Transport SMTP ohne Host/Port, Port > 65535, ungültiger Absender | Feldfehler, nichts gespeichert |
| TC-ADM-046 | P | D | Mehrere KI-Module: Standard wechseln, Standard löschen | genau ein Standardmodul; nach Löschen wird ein anderes Standard; Standard kann nicht abgewählt werden |
| TC-ADM-048 | P | D | Reiter „Branchen“ öffnen | alle Branchen mit Code, DE/EN-Bezeichnung, NACE; Standard/ergänzt, inaktiv und eigene Branche gekennzeichnet; keine Angabe, welche Firmen eine Branche nutzen |
| TC-ADM-049 | P | A | Branche anlegen (Code in Kleinbuchstaben eingegeben) | Code groß gespeichert; Branche sofort in den Auswahllisten aller Firmen |
| TC-ADM-050 | N | D | Branche mit ungültigem Code (`1X`, > 5 Zeichen), ohne Bezeichnung, mit vergebenem Code oder vergebener Bezeichnung (DE/EN, Groß-/Kleinschreibung egal) | Feldfehler bzw. Meldung, nichts gespeichert |
| TC-ADM-051 | P | D | Branche umbenennen (auch Standardbranche), NACE ändern | neue Bezeichnung überall sichtbar; Code unverändert; Audit-Eintrag mit alt → neu |
| TC-ADM-052 | N | D | Branche deaktivieren, die einer Firma zugeordnet ist; deaktivierte Branche per API einer Firma zuordnen | abgewiesen; deaktivierte Branche erscheint in keiner Auswahl |
| TC-ADM-053 | N | D | Standardbranche oder verwendete Branche löschen | abgewiesen; ergänzte, unbenutzte Branche nach Bestätigung gelöscht |
| TC-ADM-047 | P | A | Audit-Log filtern (Aktion, Zeitraum) und als CSV exportieren | gefilterte Liste mit lesbaren Bezeichnungen; CSV mit Kopfzeile; Aktionen fremder Admins gekennzeichnet; Start > Ende → Hinweis |

## Mehrbenutzer (MU) – zwei Browser-Kontexte im selben Test
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-MU-001 | P | D | Nutzer A beantwortet KP, Nutzer B sieht die Antwort ohne Neuladen | Anzeige bei B ≤ 2 s |
| TC-MU-002 | N | D | A und B (gleiche Abteilung) ändern denselben KP gleichzeitig | zweiter Speichervorgang erhält Konfliktdialog |
| TC-MU-003 | P | D | Präsenzanzeige „A bearbeitet KB03“ bei B | Hinweis sichtbar |
| TC-MU-004 | N | D | Nutzer ohne Zuweisung versucht, KP eines fremden KB zu beantworten | Antwort-Buttons deaktiviert; API 403 |
| TC-MU-005 | N | D | Nutzer ohne Mitgliedschaft öffnet Assessment-URL | „Keine Berechtigung“ |
| TC-MU-006 | P | D | Kommentar von A erscheint bei B mit Verfasser A | Verfasser korrekt |
| TC-MU-007 | N | D | B versucht Kommentar von A zu löschen (Rolle Befragter) | nicht möglich |

## Assessment / Stammdaten (ASM)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-ASM-001 | P | A | Neues Assessment mit allen Pflichtfeldern anlegen | Assessment erscheint in der Liste |
| TC-ASM-002 | N | A | Speichern ohne Projektnamen | Feldfehler, kein Speichern |
| TC-ASM-003 | N | D | Enddatum vor Startdatum | Validierungsmeldung |
| TC-ASM-004 | N | D | Anzahl Interviews negativ / nicht numerisch | Validierungsmeldung |
| TC-ASM-005 | P | D | Assessment duplizieren | Kopie mit neuem Namen, gleiche Antworten |
| TC-ASM-006 | P | A | Assessment löschen mit Bestätigung | Eintrag entfernt |
| TC-ASM-007 | N | A | Löschen abbrechen | Eintrag bleibt erhalten |
| TC-ASM-008 | P | D | Vorgehensmodell „klassisch“ wählen | agile KP ausgeblendet, nicht im Bericht |
| TC-ASM-009 | P | D | Kernbereich einer Abteilung zuweisen | Zuweisung sichtbar, Nutzer der Abteilung sehen KB unter „Meine Kernbereiche“ |

## Fragebogen / Antworten (ANS)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-ANS-001 | P | A | Navigation zu jedem der Kernbereiche | Überschrift und KP des KB sichtbar |
| TC-ANS-002 | P | A | KP mit „Erfüllt“ beantworten | Status gesetzt, Fortschritt steigt |
| TC-ANS-003 | P | A | Antwort ändern (Erfüllt → Nicht erfüllt) | nur neue Antwort aktiv |
| TC-ANS-004 | P | A | Seite neu laden / anderes Gerät | Antworten bleiben erhalten (serverseitig gespeichert) |
| TC-ANS-011 | N | D | Server nicht erreichbar beim Speichern (Route abort) | Fehlerhinweis, Antwort als „nicht gespeichert“ markiert, Wiederholung möglich |
| TC-ANS-005 | P | D | Filter „nur offene“ | nur unbeantwortete KP sichtbar |
| TC-ANS-006 | P | A | KI-Badge an KI-Kontrollpunkten | Badge bei Tag `AI` sichtbar |
| TC-ANS-007 | N | D | Fragebogen eines nicht existierenden Assessments über URL aufrufen | Hinweis „nicht gefunden“, Link zur Startseite |
| TC-ANS-008 | N | D | Nicht existierender KB in der URL | „Nicht gefunden“-Hinweis, keine Fehlerseite |
| TC-ANS-009 | P | M | Wischen/Pfeile zwischen KB auf Mobil | nächster KB wird angezeigt |
| TC-ANS-010 | P | D | Tastaturbedienung (Tab/Enter/Pfeile) | Antwort ohne Maus möglich |

## Kommentare und Quellen (COM / SRC)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-SRC-001 | P | A | Quelle/Autor anlegen (Name, Rolle, Typ) | erscheint in Auswahlliste |
| TC-SRC-002 | N | D | Quelle ohne Namen anlegen | Validierungsfehler |
| TC-SRC-003 | N | D | Doppelte Quelle (gleicher Name+Rolle) | Hinweis auf Duplikat |
| TC-SRC-004 | N | D | Verwendete Quelle löschen | Löschen verhindert, Deaktivieren angeboten |
| TC-COM-001 | P | A | Kommentar mit ausgewählter Quelle speichern | Kommentar mit Verfasser (angemeldeter Nutzer), Quelle & Zeitstempel sichtbar |
| TC-COM-002 | N | A | Kommentar ohne Quelle speichern (falls Quelle Pflicht, N-12) | Fehlermeldung bzw. Speichern ohne Quelle mit Verfasser |
| TC-COM-003 | N | A | Leerer bzw. nur Leerzeichen-Kommentar | nicht speicherbar |
| TC-COM-004 | N | D | Kommentar > 2000 Zeichen | Zählerwarnung, nicht speicherbar |
| TC-COM-005 | N | D | Kommentar mit `<script>`/HTML | wird als Text angezeigt, nicht ausgeführt |
| TC-COM-006 | P | A | Kommentar bearbeiten | geänderter Text + Änderungszeit |
| TC-COM-007 | P | A | Kommentar löschen mit Bestätigung | Kommentar entfernt |
| TC-COM-008 | P | D | Kommentar im Bericht sichtbar (Matrix-Klick) | Text + Autor angezeigt |
| TC-COM-009 | N | D | Deaktivierte Quelle nicht mehr wählbar | nicht in Auswahl, alte Kommentare bleiben |

## Sprache (I18N)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-I18N-001 | P | A | Umschalten DE → EN | UI, KP-Texte, Ebenen auf Englisch |
| TC-I18N-002 | P | A | Umschalten nach Beantwortung | Antworten unverändert |
| TC-I18N-003 | P | D | Sprachwahl nach Neuladen erhalten | gewählte Sprache aktiv |
| TC-I18N-004 | N | D | Browsersprache nicht unterstützt (z. B. fr) | Fallback Deutsch |
| TC-I18N-005 | N | D | Fehlender Übersetzungsschlüssel (Unit) | Test schlägt fehl |

## Bericht (REP)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-REP-001 | P | A | Bericht bei vollständigem Fixture | Matrix, Radar, Balken, Kennzahlen korrekt |
| TC-REP-002 | P | D | Erreichte Ebene je KB entspricht Erwartung aus Fixture | Werte stimmen exakt |
| TC-REP-003 | P | D | Klick auf Matrixzelle | Detail mit Text + Kommentaren |
| TC-REP-004 | N | A | Bericht ohne jede Antwort | Hinweis „noch keine Daten“, keine leeren Diagramme |
| TC-REP-005 | N | D | Alle KP eines KB „nicht anwendbar“ | KB als „n. a.“, keine Division durch 0 |
| TC-REP-006 | P | D | PDF/Druckansicht | Druck-Layout aktiv, alle Abschnitte vorhanden |
| TC-REP-007 | P | M | Matrix auf Mobil | kompakte Darstellung, Details per Tap |
| TC-REP-008 | P | D | KI-Index separat ausgewiesen | Wert und Radar KI vorhanden |

## Empfehlungen (REC)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-REC-001 | P | A | Regelbasierte Empfehlungen erzeugen | Listen „kurzfristig“ und „langfristig“ gefüllt |
| TC-REC-002 | P | D | Aufwand S → kurzfristig, M/L → langfristig | korrekte Zuordnung |
| TC-REC-003 | P | D | KI-Empfehlungen (gemockt, gültiges JSON) | Anzeige mit KI-Kennzeichnung |
| TC-REC-004 | N | D | KI-Dienst Timeout | Fallback auf Regel-Empfehlungen + Hinweis |
| TC-REC-005 | N | D | KI liefert ungültiges JSON / unbekannte KP-ID | verworfen, Fallback, Hinweis |
| TC-REC-006 | N | D | KI-Dienst HTTP 401 / 500 | verständliche Fehlermeldung |
| TC-REC-007 | N | D | Zustimmung zur Datenübertragung verweigert | kein Netzwerkaufruf (per Route geprüft) |
| TC-REC-008 | P | A | Empfehlung annehmen, bearbeiten, Verantwortlichen setzen | Status/Felder gespeichert |
| TC-REC-009 | N | D | Alle KP erfüllt | Hinweis „keine Handlungsfelder“, ggf. Optimierungstipps |

## Import / Export (IO)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-IO-001 | P | D | Export JSON und Re-Import | identische Daten |
| TC-IO-002 | N | D | Import einer Nicht-JSON-Datei | Fehlermeldung, nichts verändert |
| TC-IO-003 | N | D | Import mit unbekannter schemaVersion | Abweisung mit Hinweis |
| TC-IO-004 | N | D | Import mit unbekannter checkpointId | Abweisung bzw. Bericht über ignorierte Einträge |
| TC-IO-005 | N | D | Import überschreibt bestehendes Assessment – Abbruch | bestehende Daten unverändert |

## Responsive / Barrierefreiheit (RWD / A11Y)
| ID | Typ | Gerät | Testfall | Erwartetes Ergebnis |
|---|---|---|---|---|
| TC-RWD-001 | P | A | Kein horizontales Scrollen der Seite (außer Matrix) | `scrollWidth ≤ clientWidth` |
| TC-RWD-002 | P | M | Touch-Ziele ≥ 44 px | Größenprüfung der Antwort-Buttons |
| TC-RWD-003 | P | M | Drehen Hoch ↔ Quer | Layout passt sich an, Daten bleiben |
| TC-RWD-004 | N | M | Sehr schmaler Viewport 320 px | keine abgeschnittenen Bedienelemente |
| TC-A11Y-001 | P | D | axe-Scan aller Views | 0 kritische Verstöße |

## Automatisierungsstand (14.11.2026)

Automatisiert (Playwright, Vitest-API/DB, Unit): **222 von 248** Testfällen. Die IDs stehen jeweils im Testtitel.

| Bereich | automatisiert / gesamt |
|---|---|
| A11Y | 1 / 1 |
| ADM | 45 / 51 |
| ANS | 11 / 11 |
| ASM | 9 / 9 |
| AUTH | 13 / 13 |
| BM | 6 / 6 |
| COM | 9 / 9 |
| CONS | 8 / 8 |
| HIST | 5 / 5 |
| I18N | 5 / 5 |
| IO | 5 / 5 |
| MU | 7 / 7 |
| PWD | 27 / 27 |
| REC | 0 / 12 |
| REP | 8 / 8 |
| RST | 8 / 9 |
| RWD | 4 / 4 |
| SET | 6 / 6 |
| SRC | 4 / 4 |
| TEN | 25 / 29 |
| USR | 16 / 19 |

Automatisiert: TC-A11Y-001, TC-ADM-001, TC-ADM-002, TC-ADM-003, TC-ADM-004, TC-ADM-005, TC-ADM-006, TC-ADM-007, TC-ADM-008, TC-ADM-009, TC-ADM-010, TC-ADM-011, TC-ADM-012, TC-ADM-014, TC-ADM-015, TC-ADM-016, TC-ADM-017, TC-ADM-020, TC-ADM-021, TC-ADM-022, TC-ADM-023, TC-ADM-024, TC-ADM-025, TC-ADM-026, TC-ADM-027, TC-ADM-028, TC-ADM-032, TC-ADM-033, TC-ADM-034, TC-ADM-035, TC-ADM-038, TC-ADM-039, TC-ADM-040, TC-ADM-041, TC-ADM-042, TC-ADM-043, TC-ADM-044, TC-ADM-045, TC-ADM-046, TC-ADM-047, TC-ADM-048, TC-ADM-049, TC-ADM-050, TC-ADM-051, TC-ADM-052, TC-ADM-053, TC-ANS-001, TC-ANS-002, TC-ANS-003, TC-ANS-004, TC-ANS-005, TC-ANS-006, TC-ANS-007, TC-ANS-008, TC-ANS-009, TC-ANS-010, TC-ANS-011, TC-ASM-001, TC-ASM-002, TC-ASM-003, TC-ASM-004, TC-ASM-005, TC-ASM-006, TC-ASM-007, TC-ASM-008, TC-ASM-009, TC-AUTH-001, TC-AUTH-002, TC-AUTH-003, TC-AUTH-004, TC-AUTH-005, TC-AUTH-006, TC-AUTH-007, TC-AUTH-008, TC-AUTH-009, TC-AUTH-010, TC-AUTH-011, TC-AUTH-012, TC-AUTH-013, TC-BM-001, TC-BM-002, TC-BM-003, TC-BM-004, TC-BM-005, TC-BM-006, TC-COM-001, TC-COM-002, TC-COM-003, TC-COM-004, TC-COM-005, TC-COM-006, TC-COM-007, TC-COM-008, TC-COM-009, TC-CONS-001, TC-CONS-002, TC-CONS-003, TC-CONS-004, TC-CONS-005, TC-CONS-006, TC-CONS-007, TC-CONS-008, TC-HIST-001, TC-HIST-002, TC-HIST-003, TC-HIST-004, TC-HIST-005, TC-I18N-001, TC-I18N-002, TC-I18N-003, TC-I18N-004, TC-I18N-005, TC-IO-001, TC-IO-002, TC-IO-003, TC-IO-004, TC-IO-005, TC-MU-001, TC-MU-002, TC-MU-003, TC-MU-004, TC-MU-005, TC-MU-006, TC-MU-007, TC-PWD-001, TC-PWD-002, TC-PWD-003, TC-PWD-004, TC-PWD-005, TC-PWD-006, TC-PWD-007, TC-PWD-008, TC-PWD-009, TC-PWD-010, TC-PWD-011, TC-PWD-012, TC-PWD-013, TC-PWD-014, TC-PWD-015, TC-PWD-016, TC-PWD-017, TC-PWD-020, TC-PWD-021, TC-PWD-022, TC-PWD-023, TC-PWD-024, TC-PWD-025, TC-PWD-026, TC-PWD-027, TC-PWD-028, TC-PWD-029, TC-REP-001, TC-REP-002, TC-REP-003, TC-REP-004, TC-REP-005, TC-REP-006, TC-REP-007, TC-REP-008, TC-RST-001, TC-RST-002, TC-RST-003, TC-RST-004, TC-RST-005, TC-RST-007, TC-RST-008, TC-RST-009, TC-RWD-001, TC-RWD-002, TC-RWD-003, TC-RWD-004, TC-SET-001, TC-SET-002, TC-SET-003, TC-SET-004, TC-SET-005, TC-SET-006, TC-SRC-001, TC-SRC-002, TC-SRC-003, TC-SRC-004, TC-TEN-003, TC-TEN-004, TC-TEN-005, TC-TEN-006, TC-TEN-007, TC-TEN-008, TC-TEN-009, TC-TEN-011, TC-TEN-012, TC-TEN-013, TC-TEN-014, TC-TEN-015, TC-TEN-016, TC-TEN-017, TC-TEN-018, TC-TEN-019, TC-TEN-020, TC-TEN-021, TC-TEN-022, TC-TEN-023, TC-TEN-024, TC-TEN-026, TC-TEN-027, TC-TEN-028, TC-TEN-029, TC-USR-001, TC-USR-002, TC-USR-003, TC-USR-004, TC-USR-005, TC-USR-006, TC-USR-007, TC-USR-008, TC-USR-009, TC-USR-010, TC-USR-011, TC-USR-012, TC-USR-013, TC-USR-015, TC-USR-016, TC-USR-017.

**Platzhalter für geplante Funktionen:** Für jeden noch nicht automatisierten Fall gibt es in `tests/e2e/geplant/` einen Playwright-Test mit `test.fixme` (Titel = ID + Testfall, Anmerkungen „Gerät“ und „Erwartet“). Er erscheint im Bericht als übersprungen und wird nur im Profil `desktop-chrome` aufgeführt. Die Dateien erzeugt `npm run test:planned` (`tools/tests/generate_planned.py`) aus diesem Katalog. Sobald ein Fall durch einen echten Test abgedeckt ist, verschwindet sein Platzhalter beim nächsten Lauf des Skripts.

Noch offen sind vor allem Fragebogen (ANS), Kommentare (COM/SRC), Bericht (REP), Empfehlungen (REC), Zusammenführung/Historie (CONS/HIST), Benchmark (BM) und Mehrbenutzer (MU) – sie folgen mit den jeweiligen Phasen.
