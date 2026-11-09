# AI_TPI – Kontinuierliche Testprozessverbesserung mit KI-Erweiterung

Mandantenfähige Webanwendung (Vue 3 + TypeScript, Node.js, PostgreSQL) mit Anmeldung, Admin-Bereich, Abteilungs-Zusammenführung und Branchen-Benchmark zur Reifegradbewertung des Testprozesses in 19 Kernbereichen (TPI NEXT® mit agilen Ergänzungen aus Agile TPI) mit zusätzlichen Kernbereichen für den Einsatz von Künstlicher Intelligenz in Qualitätssicherung, Anforderungsprüfung, Testautomatisierung, Softwareentwicklung und Dokumentation.

**Status:** Phase 4a abgeschlossen – Ersteinrichtung, Anmeldung, Einladung, Einmal-Link und Admin-Bereich der eigenen Firma lauffähig und getestet; als Nächstes Phase 4b (firmenübergreifende Admin-Funktionen, KI/Mail je Firma). Fragenkatalog v1.0 als Entwurf in `packages/catalog/`.

## Schnellstart (lokal, macOS)

Voraussetzungen: Node.js ≥ 22, npm, Docker Desktop (für PostgreSQL und Mailpit), Python 3 (nur für Katalogprüfung).

```bash
cp .env.example .env                 # Konfiguration anlegen
docker compose up -d db mailpit      # PostgreSQL + Mailpit starten (Mailpit: http://localhost:8025)
npm install                          # Abhängigkeiten
npm run db:migrate                   # Tabellen + Stammdaten (Branchen, Freemail-Sperrliste)
npm run dev                          # API (Port 3000) + Web (http://localhost:5173)
```

Tests:

```bash
npm run test:unit                    # Unit-, API-Tests (+ DB-Tests mit TEST_DATABASE_URL)
npx playwright install               # einmalig: Chromium, Firefox, WebKit
npm run test:e2e                     # Playwright auf 7 Geräteprofilen
npm run test:e2e:ui                  # Playwright im UI-Modus (oder VS-Code-Extension „Playwright Test“)
npm run typecheck && npm run lint
```

Seiten: `/einrichtung` (Ersteinrichtung, nur localhost, solange kein Nutzer existiert), `/login/<firmenkürzel>`, `/passwort-vergessen`, `/passwort-festlegen?token=…`, `/start`, `/admin`.

**Erster Start:** Nach `npm run dev` im Browser `http://localhost:5173/einrichtung` öffnen, Firma und Admin-Konto anlegen. Mails (Einladung, Einmal-Link) erscheinen in Mailpit unter `http://localhost:8025`.

**Geheimnisse:** SMTP-Passwörter und KI-API-Schlüssel der Firmen werden mit `SECRET_ENCRYPTION_KEY` (mind. 32 Zeichen) verschlüsselt gespeichert. In Entwicklung/Test gilt ohne Eintrag ein fester Entwicklungsschlüssel; in Produktion (`NODE_ENV=production`) startet der Server ohne Schlüssel nicht. Wird der Schlüssel geändert, müssen gespeicherte Passwörter/API-Schlüssel neu eingegeben werden.

**E2E-Tests** nutzen eine eigene Datenbank `ai_tpi_e2e`, die vor jedem Lauf neu aufgesetzt wird: einmalig `docker compose exec db createdb -U ai_tpi ai_tpi_e2e`. Playwright liest `.env` selbst: Ohne `E2E_DATABASE_URL` wird die Adresse aus `DATABASE_URL` abgeleitet (gleicher Server und Port, Datenbank `ai_tpi_e2e`).
Startet Firefox lokal nicht („Could not find profile folder“), lässt `PW_SKIP_FIREFOX=1 npm run test:e2e` dieses Profil weg. Dauerhafte Abhilfe auf macOS: `export TMPDIR="$HOME/pw-tmp"` in `~/.zshrc`.

## Dokumentation (Astro)

Handbuch, Entwicklerdokumentation, Referenz (Konfiguration, REST-API, Fehlercodes) und die Projektdokumentation aus `docs/` als durchsuchbare Website:

```bash
npm run docs:dev                     # http://localhost:4321 (mit Neuladen)
npm run docs:build                   # statische Seite nach apps/docs/dist
```

Die Seiten liegen als Markdown in `apps/docs/src/content/docs/`. Die Projektdokumentation bleibt in `docs/` maßgeblich und wird beim Start bzw. Bauen automatisch übernommen (siehe `apps/docs/scripts/sync-docs.mjs`).

## In VS Code öffnen

1. `Datei → Arbeitsbereich aus Datei öffnen… → AI_TPI.code-workspace`
2. Empfohlene Extensions installieren (u. a. Vue – Official, Playwright Test, ESLint, Prettier).
3. Zuerst lesen: [`AGENTS.md`](AGENTS.md), dann [`docs/06_umsetzung/02_backlog.md`](docs/06_umsetzung/02_backlog.md).

## Dokumentenübersicht

| Bereich                  | Inhalt                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `docs/00_ueberblick`     | Vision, Ziele, Glossar                                                                    |
| `docs/01_anforderungen`  | Fachliche & nichtfunktionale Anforderungen, User Stories, offene Fragen                   |
| `docs/02_analyse`        | Analyse der Quelldokumente, Reifegradmodell & Bewertungslogik                             |
| `docs/03_fragenkatalog`  | Katalogstruktur, KI-Erweiterung, Agile-Ergänzung, Übersetzung, **Katalog-Übersicht v1.0** |
| `packages/catalog`       | **Fragenkatalog** als JSON (DE/EN) mit Schema                                             |
| `tools/catalog`          | Prüf- und Generierungsskripte für den Katalog                                             |
| `docs/04_architektur`    | Architektur, Datenmodell, UI/UX, Bericht, KI-Empfehlungen                                 |
| `docs/05_test`           | Teststrategie & Testfallkatalog Playwright                                                |
| `docs/06_umsetzung`      | Roadmap & Backlog                                                                         |
| `docs/07_entscheidungen` | Architekturentscheidungen (ADR)                                                           |
| `docs/_quellen`          | Originaldokumente                                                                         |

## Hinweis zu Marken und Rechten

TPI NEXT® und TMap® sind eingetragene Marken von Sogeti. Die Kontrollpunkte sind ein öffentliches Modell und dürfen verwendet werden; die Applikation wird nur intern genutzt (F-02).
