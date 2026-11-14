# Backlog

Status: ☐ offen · ◐ in Arbeit · ☑ erledigt

## Phase 0 – Analyse & Planung
- ☑ Quelldokumente analysiert
- ☑ Projektstruktur und AGENTS.md angelegt
- ☑ KI-Erweiterung entworfen (KB17–19)
- ☑ Offene Fragen Runde 1 beantwortet (F-01, F-02, F-03, F-04, F-07, F-09, F-23)
- ☑ Planung auf Client-Server, Auth, Admin, Mehrbenutzer aktualisiert
- ☑ Rohzuordnung der 108 Agile-TPI-Kontrollpunkte erstellt
- ☑ Runde 2 eingearbeitet: Vue + TS, Rollen (seit R-08: Admin/Assessor/Befragter/Leser), Einladung, Zusammenführung, Historie, Mandanten, Benchmark, Branchenliste

## Phase 1 – Klärung
- ☑ Blockierende Fragen beantwortet (R-01, R-02, R-06, R-08)
- ☐ Nicht blockierende Fragen (R-03 … R-15, S-01 … S-05) laufend klären

## Phase 2 – Fragenkatalog
- ☑ AP-2.1 DE-Kontrollpunkte TPI NEXT extrahiert und bereinigt (153)
- ☑ AP-2.2 KB2 „Grad der Beteiligung“ vervollständigt (4 rekonstruierte KP)
- ☑ AP-2.3 EN-Übersetzung TPI NEXT; DE-Übersetzung Agile TPI
- ☑ AP-2.4 Agile-KP zugeordnet: 92 zusammengeführt, 16 neu
- ☑ AP-2.5 Aufwand + Empfehlungsbaustein (DE/EN) je KP
- ☑ AP-2.6 KI-Kernbereiche KB17–19 + KI-Ergänzungen übernommen und übersetzt (50)
- ☐ AP-2.7 Fachliche Freigabe (Übersicht: `docs/03_fragenkatalog/05_katalog-v1-uebersicht.md`)
- ☑ JSON-Schema + Validierungsskript (`tools/catalog/validate.py`)

## Phase 3 – Fundament
- ☑ Monorepo TypeScript (apps/web Vue 3, apps/server Fastify, packages/shared, packages/catalog)
- ☑ Docker Compose: PostgreSQL, Mailpit
- ☑ Drizzle-Schema (Firmen, Domains, Nutzer, Token, Setup, Audit), Migration, Stammdaten (25 Branchen, Freemail-Sperrliste) – ADR-007
- ☐ Seed: Testnutzer je Rolle (mit Phase 4)
- ☑ Playwright-Konfiguration: 7 Geräteprofile, Page Object, erste 49 Testfälle (343 Läufe)
- ☐ Playwright: Setup-Projekt mit `storageState`, Mailpit-Helfer (mit Phase 4)
- ☑ Vitest (Unit, API via fastify.inject, DB-Integration), ESLint, Prettier, Typprüfung
- ☑ Grundgerüst-Oberfläche: Login mit Firmenlogo/Platzhalter, Passwort vergessen, Passwort festlegen (Live-Regeln, Stärke), DE/EN, responsive

## Phase 4 – Anmeldung & Admin
- ☑ Ersteinrichtung erster Admin inkl. Firma (nur localhost, Socket-Adresse, `SETUP_ENABLED`) – ☐ CLI `create-admin` (mit Phase 2 Betrieb)
- ☑ Einladungs-Mail (DE/EN-Vorlagen) bei Nutzeranlage, „Einladung erneut senden“
- ☑ Login-Seite mit firmenspezifischem Logo (`/login/<kürzel>`, Platzhalter)
- ☑ „Passwort vergessen“ mit Einmal-Link; Mail-Transport sendmail/SMTP/memory
- ☑ Passwort über Einmal-Link setzen gilt als Initialpasswort (R-07); Routenschutz für angemeldete Bereiche
- ☑ Passwortregeln live (grün) + Stärkeanzeige 3 Stufen (zxcvbn-ts), geteilt Client/Server
- ☑ Sitzungen, CSRF-Header, Kontosperre, Audit-Log – ☐ IP-basiertes Rate Limit
- ◐ SSO-Vorbereitung: Tabelle `auth_identity` vorhanden; Provider-Schnittstelle folgt mit SSO
- ☐ Admin: Benutzer (anlegen, ändern, aktiv/inaktiv, löschen mit Bestätigungsdialog, Rollen), Firmen (Logo, Branche), Abteilungen, Branchenliste, Passwortrichtlinie, Mail
- ☐ Mandantentrennung (companyId, Row Level Security) + Negativtests
- ☐ Firmen-Domains, Domain-Prüfung, Freemail-Sperrliste
- ☐ Admins für neue/bestehende Firmen anlegen; „Von mir angelegte Admins“; Benachrichtigung der Ziel-Admins
- ☐ Kennzeichnung externer Berater (`ext.`-Präfix, keine manuelle Pflege)
- ☐ Passwort-Reset per Button (Admin), firmenübergreifende Benachrichtigungs-Mails
- ☐ Admin: Lesezugriff auf Ergebnisse der eigenen Firma, Sperre für andere Firmen; Benchmark-Ansicht für alle Rollen
- ☐ Firmenübergreifender Passwort-Reset per E-Mail-Eingabe mit Limit und Info-Mail
- ☐ KI-Modul-Auswahl durch Assessor und Admin
- ☐ KI- und Mail-Konfiguration je Firma

## Phase 5 – Erfassung (erledigt 13.11.2026)
- ☑ Assessment anlegen (Stammdaten FA-1.1, Vorgehensmodell klassisch/agil, KI ein/aus), ändern, löschen, Status Erfassung → Zusammenführung → Freigegeben
- ☑ Team (Mitglieder), Zuweisung Kernbereich → eine oder mehrere Abteilungen, Abgabe je Abteilung + Wiederöffnen
- ☑ Fragebogen (Desktop, Tablet, Mobil): Navigation, Fortschritt, Filter „nur offene“ und klassisch/agil/KI, KI-/agil-Kennzeichen, Tastatur, Wischen, Speichern je Klick mit Fehleranzeige
- ☑ Abteilungsantworten mit optimistischem Sperren (Version, 409 + Konflikthinweis)
- ☑ Kommentare (Verfasser automatisch, Quelle wählbar, 2000 Zeichen), Quellenverwaltung (Duplikat, Deaktivieren statt Löschen)
- ☑ Zusammenführung (Vergleichsansicht, Vorschlag R-11, Begründungspflicht)
- ☑ Änderungshistorie (append-only per DB-Trigger) + Reiter im Admin-Bereich für alle Rollen, Filter, CSV, „Verlauf anzeigen“ am KP
- ☑ 5b (13.11.2026): Live-Aktualisierung per Server-Sent Events und Präsenzanzeige je Kernbereich (TC-MU-001, TC-MU-003)
- ☑ 5b: Assessment duplizieren (TC-ASM-005), JSON-Export/-Import mit Bericht über übersprungene Einträge (US-1.3, TC-IO-001…005)
- ☑ 5b: Antworten je Kontrollpunkt nacheinander speichern (keine Scheinkonflikte bei schnellen Folgeklicks)

## Phase 6 – Auswertung
- ☐ Scoring Engine + Unit-Tests
- ☐ Reifegradmatrix, Radar, Balken (Ebenen und P/T/O), KI-Index
- ☐ Druck/PDF, JSON-Export
- ☐ Benchmark: Snapshot bei Freigabe, Aggregation Branche/Gesamt, Mindestanzahl, Opt-out

## Phase 7 – Empfehlungen
- ☐ Regel-Engine (Ebene → Cluster → Abhängigkeit → Aufwand) + Unit-Tests
- ☐ KI-Adapter: Anthropic, OpenAI, Azure OpenAI, Ollama, LM Studio, OpenAI-kompatibel
- ☐ Admin: KI-Konfiguration, Schlüssel verschlüsselt, Verbindungstest
- ☐ Datenschutzdialog, Schema-Validierung der KI-Antwort, Fallback
- ☐ Maßnahmenplan

## Phase 8 – Abschluss
- ☐ Alle Testfälle aus `05_test/02_testfallkatalog.md` automatisiert
- ☐ CI/CD-Pipeline (Lint, Typecheck, Unit/API, Playwright, Container-Build)
- ☐ Security-Review (OWASP, Mandantentrennung), A11y-Prüfung
- ☐ Betriebsdokumentation (Installation, Backup, Konfiguration)
- ☐ Benutzerhilfe, Abnahme

## Phase 4a – erledigt (09.11.2026)
- ☑ Admin: Benutzer anlegen (Domain-Prüfung, Einladung), Name/E-Mail/Rolle ändern, aktiv/inaktiv, löschen mit Bestätigungsdialog (pseudonymisiert), Passwort zurücksetzen, Schutz eigener Account und letzter Admin
- ☑ Admin: Meine Firma – Name, Logo-URL (nur https) mit Vorschau, Alternativtext, Branche
- ☑ Kennzeichnung externer Berater (`ext.`)

## Phase 4b – erledigt (09.11.2026)
- ☑ Admins für andere Firmen: neue Firma (Name, Kürzel, Domains, Branche, Logo) + Admin bzw. weiterer Admin für bestehende Firma; Liste „Von mir angelegte Admins“ mit Rolle (nur Nicht-Admin-Rollen), aktiv/inaktiv, Einladung, Passwort-Reset (S-01, M3, M4)
- ☑ Firmenübergreifender Passwort-Reset nur per vollständiger E-Mail-Adresse, neutrale Antwort, Limit 3 je Admin und Kalendertag inkl. unbekannter Adressen (S-10, S-14, S-15)
- ☑ Hinweis-Mails an die aktiven Admins der betroffenen Firma (Admin angelegt, Rolle/Status geändert, Passwort zurückgesetzt) und an die übrigen Admins bei Admin-Löschung (S-01, S-13); Audit-Eintrag in beiden Firmen
- ☑ Abteilungen pflegen (anlegen, umbenennen, deaktivieren, löschen nur ohne Nutzer) und Nutzern zuordnen
- ☑ E-Mail-Domains der eigenen Firma pflegen; Benchmark-Teilnahme (Opt-out)
- ☑ Mailserver je Firma (Standard der Installation oder SMTP), Test-Mail; Einladungen/Links laufen über den Mailserver der Firma des Empfängers (S-04)
- ☑ KI-Module je Firma (regelbasiert/lokal/Cloud, 6 Anbieter), Standardmodul, Verbindungstest, API-Schlüssel AES-256-GCM-verschlüsselt und nur maskiert sichtbar (S-04, S-09)
- ☑ Audit-Log-Ansicht mit Filter (Aktion, Zeitraum), Seitenweise, CSV-Export (Schutz vor Formel-Injektion)

## Branchenliste – erledigt (09.11.2026)
- ☑ Reiter „Branchen“: hinzufügen (Code, DE/EN, NACE), suchen, umbenennen, aktivieren/deaktivieren, ergänzte unbenutzte Branchen löschen; gilt für alle Firmen, Nutzung durch Firmen wird nicht offengelegt

## Phase 4 – verschoben
- ☐ Passwortrichtlinie im Admin-Bereich konfigurierbar (derzeit feste Regeln aus F-07; Konfiguration erst, wenn fachlich benötigt)
- ☐ E-Mail-Änderung mit Bestätigungs-Mail an die neue Adresse (R-09)
- ☐ CLI `create-admin` und IP-basiertes Rate-Limit für Anmeldung/„Passwort vergessen“
- ☐ PostgreSQL Row Level Security als zweite Schutzschicht (derzeit Firmenprüfung in jeder Abfrage)
