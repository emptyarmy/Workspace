---
title: npm-Skripte
description: Alle npm-Skripte im Projektordner und in den einzelnen Paketen.
sidebar:
  order: 4
---

Alle Befehle im **Projektordner** ausführen.

| Skript | Wirkung |
|---|---|
| `npm run dev` | API-Server und Weboberfläche mit automatischem Neuladen |
| `npm run build` | Produktions-Build: Weboberfläche (`apps/web/dist`) und gebündelter Server (`apps/server/dist`: `server.mjs`, `migrate.mjs`, `setup-cli.mjs`) |
| `npm run start` | Produktions-Server aus `apps/server/dist` starten (ohne tsx; Oberfläche mit `WEB_DIST_DIR=apps/web/dist`) |
| `npm run db:migrate:prod` | Migrationen + Stammdaten mit dem gebündelten Skript (`apps/server/dist/migrate.mjs`) |
| `npm run typecheck` | TypeScript-Prüfung aller Pakete |
| `npm run lint` | ESLint |
| `npm run format` | Prettier für das ganze Projekt |
| `npm run test` | `test:unit` und danach `test:e2e` |
| `npm run test:unit` | Vitest (Unit, API; Datenbanktests mit `TEST_DATABASE_URL`) |
| `npm run format:check` | Formatierung prüfen, ohne zu ändern (CI) |
| `npm run test:e2e` | Playwright auf allen Geräteprofilen |
| `npm run test:szenario` | Durchgängiges Szenario „Humani“ von der leeren Datenbank bis zum Bericht, mit Mailpit (`docker compose up -d db mailpit`) |
| `E2E_PROD=1 npm run test:e2e` | Playwright gegen den Produktions-Build (vorher `npm run build`): prüft zusätzlich Auslieferung und Content-Security-Policy (TC-OPS-001/002) |
| `npm run test:e2e:ui` | Playwright im UI-Modus |
| `npm run test:planned` | Platzhalter-Tests für noch nicht automatisierte Katalogfälle neu erzeugen (`tests/e2e/geplant/`) |
| `npm run db:generate` | Migration aus `schema.ts` erzeugen |
| `npm run db:migrate` | Migrationen ausführen + Stammdaten (löscht keine Daten; zum Zurücksetzen siehe [Anwendung zurücksetzen](/entwicklung/zuruecksetzen/)) |
| `npm run catalog:validate` | Fragenkatalog prüfen (Python, ohne Zusatzpakete; Schema mit `jsonschema` oder sonst Node/ajv): JSON-Schema, eindeutige IDs, Zuordnung aller 108 Agile-TPI-Punkte, Sicht P/T/O bei allen Kontrollpunkten, Voraussetzungen (`dependsOn`: Ebene, Umfang, Zyklen). Das Python-Paket `jsonschema` ist optional; ohne es übernimmt `npm run test:unit` die Schema-Prüfung |
| `python3 tools/catalog/build_overview.py` | Katalog-Übersicht `docs/03_fragenkatalog/05_katalog-v1-uebersicht.md` neu erzeugen (mit Sicht und Voraussetzungen) |
| `npm run docs:dev` | Dokumentation mit Neuladen (Port 4321) |
| `npm run docs:build` | Dokumentation als statische Seite (`apps/docs/dist`) |
| `npm run docs:preview` | gebaute Dokumentation ansehen |

## Paketinterne Skripte

| Paket | Skript | Wirkung |
|---|---|---|
| `@ai-tpi/server` | `start` | Server ohne Neuladen aus den Quellen (tsx; wird von Playwright genutzt) |
| `@ai-tpi/server` | `build` | Server mit esbuild bündeln (`dist/server.mjs`, `dist/migrate.mjs`, `dist/setup-cli.mjs`) |
| `@ai-tpi/server` | `start:prod` | gebündelten Server starten (`node dist/server.mjs`) |
| `@ai-tpi/server` | `db:reset:e2e` | Testdatenbank leeren und neu aufbauen (nur Namen mit `_e2e`/`_test`) |
| `@ai-tpi/docs` | `sync` | Projektdokumentation aus `docs/` übernehmen |

Aufruf z. B. mit `npm run start -w @ai-tpi/server`.

## Container

| Befehl | Wirkung |
|---|---|
| `docker build -t ai-tpi .` | Image bauen (mehrstufig: Abhängigkeiten, Build, Laufzeit ohne devDependencies) |
| `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` | Anwendung mit Datenbank starten |
| `docker compose -f docker-compose.prod.yml --env-file .env.production exec app ai-tpi-setup` | Ersteinrichtung im Container (erster Admin und erste Firma) |

| `tools/ops/backup.sh` | Datenbank sichern (prüft die Sicherung, behält die neuesten 14) |
| `tools/ops/restore.sh <datei>` | Sicherung einspielen – ersetzt die Datenbank, mit Rückfrage |
| `tools/ops/selftest.sh [image]` | Betriebsablauf in einem getrennten Compose-Projekt prüfen |
| `tools/docker/smoke-test.sh <image> <datenbank-url>` | Rauchtest des Images gegen eine leere Datenbank |

Details: [Installation mit Docker](/betrieb/installation-mit-docker/), [Backup und Wiederherstellung](/betrieb/backup-und-wiederherstellung/), [Update und Rollback](/betrieb/update-und-rollback/).
