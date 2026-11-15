# Abnahme-Checkliste Release 1.0

Stand: 16.11.2026 · Bezug: Meilenstein MS-8 (`06_umsetzung/01_roadmap.md`)

Diese Liste trennt, was **automatisch nachgewiesen** ist (Teil A), von dem, was nur der Auftraggeber bzw. der Betrieb **selbst prüfen und entscheiden** kann (Teil B und C). Die Abnahme ist erteilt, wenn Teil A vollständig ☑ ist und in Teil B und C nichts mehr ☐ ist, das als „Pflicht“ markiert ist.

Status: ☑ erfüllt · ☐ offen · ◐ teilweise

## Teil A – Automatisch nachgewiesen

| Nr. | Kriterium | Nachweis | Status |
|---|---|---|---|
| A-1 | Alle Testfälle des Testfallkatalogs sind automatisiert | 252 von 252 (`02_testfallkatalog.md`); die CI-Pipeline bricht ab, sobald ein Fall ohne Test dazukommt | ☑ |
| A-2 | Unit-, API- und Datenbanktests grün | `npm run test:unit` (Vitest, PostgreSQL 16) | ☑ lokal |
| A-3 | E2E-Tests grün auf allen 7 Geräteprofilen (NFA-02/03) | `npm run test:e2e`: 1004 bestanden (Mac, 15.11.2026) | ☑ lokal |
| A-4 | E2E-Tests grün gegen den Produktions-Build | `npm run build && E2E_PROD=1 npm run test:e2e`: 1018 bestanden (Mac, 15.11.2026) | ☑ lokal |
| A-5 | Pipeline grün auf GitHub (Prüfungen, Unit/DB, E2E je Engine, Container) | GitHub → Actions → „CI“, letzter Durchgang auf `main` | ☐ **Ergebnis hier eintragen** |
| A-6 | Container: Rauchtest und Selbsttest der Betriebsskripte (Start mit `docker-compose.prod.yml`, Ersteinrichtung, Sicherung, Wiederherstellung) | Job „Container“ der Pipeline; lokal `tools/docker/smoke-test.sh`, `tools/ops/selftest.sh` | ☐ mit A-5 |
| A-7 | Keine bekannten Sicherheitslücken in Abhängigkeiten | `npm audit --audit-level=moderate`: 0 | ☑ |
| A-8 | Security-Review ohne offene kritische oder hohe Befunde | `03_security-review.md`: F-01 … F-11 behoben | ☑ |
| A-9 | Barrierefreiheit geprüft (NFA-10) | `03_security-review.md`, Abschnitt 4: axe-core (WCAG 2.1 A/AA) für alle Seiten und Dialoge in `barrierefreiheit.spec.ts` | ☑ automatisiert (manuell: B-13) |
| A-10 | Mandantentrennung | TC-TEN-*, `tests/e2e/rechte-und-mandanten.spec.ts`, API-Tests | ☑ |
| A-11 | Dokumentation baut fehlerfrei | `npm run docs:build` (Teil der Pipeline) | ☑ |

Hinweis zu A-6: Das Image wurde in der Entwicklungsumgebung nur auf einem Ersatz-Basisimage gebaut (kein Zugriff auf Docker Hub). Der Bau auf `node:22-bookworm-slim` und der Start mit `docker compose` samt PostgreSQL-Container laufen erstmals in der Pipeline bzw. auf dem Zielserver.

## Teil B – Fachliche Abnahme (Auftraggeber)

Am besten auf dem Testsystem mit zwei Firmen und je einer Person pro Rolle. Kurzanleitung je Rolle: Starlight „Handbuch → Erste Schritte nach Rolle“.

| Nr. | Prüfung | Pflicht | Status / Datum / Kürzel |
|---|---|---|---|
| B-1 | **Fragenkatalog fachlich freigegeben** (223 Kontrollpunkte, DE/EN; Übersicht `03_fragenkatalog/05_katalog-v1-uebersicht.md`; 116 zugeordnete Sichten und 152 Abhängigkeiten sind als Vorschlag gekennzeichnet) – MS-2, AP-2.7 | ja | ☐ |
| B-2 | Ersteinrichtung, Einladung per Mail, Einmal-Link, Passwortregeln mit Stärkeanzeige | ja | ☐ |
| B-3 | Admin: Benutzer, Abteilungen, Firma mit Logo und Branche, E-Mail-Test, Audit-Log | ja | ☐ |
| B-4 | Assessment anlegen, Team und Zuweisung, Fragebogen in zwei Abteilungen gleichzeitig (Live-Anzeige), Kommentare | ja | ☐ |
| B-5 | Zusammenführung mit Begründung, Änderungshistorie | ja | ☐ |
| B-6 | Bericht: Reifegrade plausibel, Diagramme, Druck/PDF auf A4 (NFA-13) | ja | ☐ |
| B-7 | Benchmark: erst ab 5 Firmen der Branche, nur Median/Quartile; Opt-out wirkt | ja | ☐ |
| B-8 | Empfehlungen regelbasiert: Reihenfolge und Texte fachlich sinnvoll; Maßnahmenplan, CSV-Export | ja | ☐ |
| B-9 | Empfehlungen mit KI: Einwilligungsdialog zeigt, was gesendet wird; Ergebnis mit dem **eigenen** KI-Anbieter geprüft (automatisiert ist nur ein Test-Dienst) | wenn KI genutzt wird | ☐ |
| B-10 | Sprachen: Oberfläche und Katalog Deutsch/Englisch, Stichprobe der Übersetzung | ja | ☐ |
| B-11 | Bedienung auf einem echten iPhone, iPad und Android-Gerät (automatisiert sind Geräteprofile im Emulator) | empfohlen | ☐ |
| B-13 | Kurze Prüfung mit Screenreader (VoiceOver bzw. NVDA) für Anmeldung, Fragebogen und Bericht – automatische Prüfungen finden nur einen Teil der Probleme | empfohlen | ☐ |
| B-12 | Offene Fragen Teil 3 (`01_anforderungen/04_offene-fragen.md`): Vorschläge gelten als angenommen – einverstanden? Insbesondere R-12 (Namen in der Historie für Leser; Abstimmung Datenschutz/Betriebsrat) | ja | ☐ |

## Teil C – Betriebsbereitschaft (Betrieb)

Anleitung: Starlight „Betrieb“ (Installation mit Docker, Backup und Wiederherstellung, Update und Rollback, Laufender Betrieb).

| Nr. | Prüfung | Pflicht | Status / Datum / Kürzel |
|---|---|---|---|
| C-1 | Installation auf dem Zielserver nach Anleitung; `app` und `db` sind `healthy` | ja | ☐ |
| C-2 | Reverse Proxy mit gültigem TLS-Zertifikat; `TRUST_PROXY=true`, `COOKIE_SECURE=true` (Auflage R-1, R-2) | ja | ☐ |
| C-3 | Ersteinrichtung mit `ai-tpi-setup`; danach `SETUP_ENABLED=false` (Auflage R-6) | ja | ☐ |
| C-4 | `.env.production` mit `SECRET_ENCRYPTION_KEY` im Passwort-Tresor, getrennt von den Sicherungen (Auflage R-5) | ja | ☐ |
| C-5 | Tägliche Sicherung eingerichtet (cron), Kopie auf ein anderes System (NFA-07) | ja | ☐ |
| C-6 | **Wiederherstellung einmal geübt** (`tools/ops/selftest.sh` auf dem Server und eine echte Sicherung auf einem Testsystem eingespielt) | ja | ☐ |
| C-7 | SMTP eingerichtet, Test-Mail kommt an; Absenderadresse mit dem Mail-Team abgestimmt (SPF/DKIM) | ja | ☐ |
| C-8 | Überwachung von `/api/health` und Protokollrotation eingerichtet | empfohlen | ☐ |
| C-9 | Zwei Admins je Firma angelegt | empfohlen | ☐ |
| C-10 | Repository-Sichtbarkeit geprüft: `emptyarmy/Workspace` ist **öffentlich** (Stand 16.11.2026). Für eine nur intern genutzte Anwendung auf „privat“ stellen oder bewusst öffentlich lassen | ja | ☐ |
| C-11 | Rechtliches geklärt: Nutzung des TPI-NEXT®-Modells nur intern (F-02), Datenschutz-Hinweise für Nutzer, Auftragsverarbeitung mit dem KI-Anbieter (falls Cloud-KI) | ja | ☐ |

## Bekannte Grenzen von Release 1.0

- Eine Server-Instanz; Rate-Limits und Live-Aktualisierung gelten je Prozess (ADR-008, R-2).
- Kein automatisches Deployment und keine Container-Registry; gebaut wird auf dem Zielserver.
- Kein Schlüsselwechsel für `SECRET_ENCRYPTION_KEY` ohne Neueingabe der Geheimnisse (R-5).
- Nicht enthalten (Backlog, Release 2): Vergleich mit dem Vorjahr, Gewichte je Kernbereich, Excel-Export, SSO/OIDC, konfigurierbare Passwortrichtlinie, Bestätigungs-Mail bei E-Mail-Änderung, Row Level Security.

## Abnahme

| | Name | Datum | Unterschrift / Kürzel |
|---|---|---|---|
| Fachlich (Teil B) | | | |
| Betrieb (Teil C) | | | |

Nach der Abnahme: Version markieren (`git tag v1.0.0 && git push --tags`) und `APP_IMAGE=ai-tpi:v1.0.0` in `.env.production` eintragen.
