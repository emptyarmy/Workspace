---
title: Konfiguration (.env)
description: Alle Umgebungsvariablen von API-Server, Weboberfläche, Tests und Dokumentation.
sidebar:
  order: 1
---

Die Konfiguration steht in `.env` im Projektordner (Vorlage: `.env.example`). Werte aus der Umgebung haben Vorrang vor `.env`. Der Server prüft alle Werte beim Start und bricht bei ungültigen Angaben mit einer Meldung ab.

## API-Server

| Variable | Standard | Bedeutung |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` oder `production` |
| `SERVER_HOST` | `127.0.0.1` | Adresse, auf der der Server lauscht |
| `SERVER_PORT` | `3000` | Port des API-Servers. Die Weboberfläche nutzt denselben Wert für ihren Proxy. Die Vorlage `.env.example` setzt `3001`, weil 3000 oft belegt ist. Ist der Port belegt, bricht der Server mit einer Meldung ab. |
| `DATABASE_URL` | – | PostgreSQL, z. B. `postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi`. Ohne Angabe laufen nur Katalog und Health. |
| `SETUP_ENABLED` | `true` | Ersteinrichtung erlauben (zusätzlich nur direkt über localhost – nicht über einen Proxy – und nur ohne Nutzer) |
| `SECRET_ENCRYPTION_KEY` | – | Schlüssel (≥ 32 Zeichen) für SMTP-Passwörter und KI-API-Schlüssel. **Pflicht bei `production`**; leer = Entwicklungsschlüssel |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Basis für Links in E-Mails (Einladung, Einmal-Link) |
| `COOKIE_SECURE` | `production`: `true`, sonst `false` | Sitzungs-Cookie nur über HTTPS; wenn aktiv, sendet der Server auch HSTS. Nur für ein Intranet ohne HTTPS bewusst auf `false` setzen |
| `TRUST_PROXY` | `false` | Hinter einem Reverse Proxy `true`: Client-Adresse aus `X-Forwarded-For` (für Rate-Limits und Audit-Log). Die Ersteinrichtung prüft unabhängig davon die Socket-Adresse |
| `LOG_LEVEL` | `info` (Tests: aus) | Protokollstufe des JSON-Protokolls auf stdout: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`. Cookies und Schlüssel werden geschwärzt |
| `AUTH_RATE_LIMIT_PER_MIN` | `30` (Tests: `0`) | Anfragen je Minute und Client-Adresse an Anmeldung, „Passwort vergessen“, Passwort setzen und Ersteinrichtung; darüber 429 `rate_limited`. `0` = aus |
| `RESET_MAILS_PER_15_MIN` | `3` (Tests: `0`) | „Passwort vergessen“-Mails je E-Mail-Adresse in 15 Minuten; darüber wird still nichts versendet (die Antwort bleibt gleich). `0` = aus |
| `MAIL_TRANSPORT` | `smtp` | Standard-Mailversand: `smtp`, `sendmail` (Betriebssystem) oder `memory` (nur Tests) |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | SMTP-Server für `MAIL_TRANSPORT=smtp` (lokal Mailpit) |
| `MAIL_FROM` | `AI_TPI <no-reply@ai-tpi.local>` | Standard-Absender |
| `WEB_DIST_DIR` | – | Ordner der gebauten Weboberfläche (`apps/web/dist`). Gesetzt → der Server liefert die Oberfläche selbst aus (mit eigener Content-Security-Policy, Single-Page-Fallback); leer → nur API (Entwicklung mit Vite). Im Container `/app/web` |
| `TEST_ENDPOINTS` | `false` | Testschnittstellen `/api/test/*`, nur zusammen mit `NODE_ENV=test` |

Firmen können Mailserver und KI-Module zusätzlich im Admin-Bereich festlegen (siehe [E-Mail und KI-Module](/handbuch/e-mail-und-ki/)).

## Weboberfläche

| Variable | Standard | Bedeutung |
|---|---|---|
| `WEB_PORT` | `5173` | Port des Entwicklungsservers |
| `SERVER_PORT` | `3000` | Ziel des Proxys für `/api` und `/public` |

## Tests

| Variable | Bedeutung |
|---|---|
| `TEST_DATABASE_URL` | Datenbank für die Vitest-Datenbanktests (wird geleert) |
| `E2E_DATABASE_URL` | Datenbank für Playwright (muss auf `_e2e`/`_test` enden). Ohne Angabe: aus `DATABASE_URL` mit Datenbank `ai_tpi_e2e` |
| `E2E_SERVER_PORT` / `E2E_WEB_PORT` | Ports der Testserver (Standard 3100 / 5180) |
| `PW_SKIP_FIREFOX`, `PW_CHROMIUM_ONLY`, `PW_CHROMIUM_PATH` | Browserauswahl, siehe [Tests](/entwicklung/tests/) |
| `SZENARIO_DATABASE_URL`, `SZENARIO_SERVER_PORT`, `SZENARIO_WEB_PORT`, `SZENARIO_SMTP_HOST`, `SZENARIO_SMTP_PORT`, `SZENARIO_MAILPIT_URL` | Szenario „Humani“ (`npm run test:szenario`): Datenbank (Standard: wie `DATABASE_URL`, Datenbank `ai_tpi_szenario_e2e`), Ports (3200, 5190), Mailpit (`localhost:1025`, `http://localhost:8025`) |
| `E2E_PROD` | `1` = Tests gegen den Produktions-Build (gebündelter Server liefert die gebaute Oberfläche aus); vorher `npm run build` |

## Dokumentation

| Variable | Standard | Bedeutung |
|---|---|---|
| `DOCS_PORT` | `4321` | Port von `npm run docs:dev` und `docs:preview`. Nur als Umgebungsvariable beim Start (`DOCS_PORT=4322 npm run docs:dev`), nicht aus der `.env`. |

## Container (docker-compose.prod.yml)

Für den Betrieb mit Docker Compose liegt die Vorlage `.env.production.example` im Projektordner. Zusätzlich zu den Variablen oben:

| Variable | Standard | Bedeutung |
|---|---|---|
| `POSTGRES_PASSWORD` | – (Pflicht) | Passwort der Datenbank im Container `db`. Ohne Sonderzeichen wählen (steht in der Datenbank-URL), z. B. `openssl rand -hex 32` |
| `POSTGRES_USER` / `POSTGRES_DB` | `ai_tpi` / `ai_tpi` | Nutzer und Datenbank |
| `APP_PORT` | `3000` | Port auf dem Host, nur an `127.0.0.1` gebunden – Ziel des Reverse Proxys |
| `RUN_MIGRATIONS` | `true` | Migrationen beim Start des Containers ausführen |
| `APP_IMAGE` | `ai-tpi:latest` | Name des gebauten Images; bei Updates die Version eintragen (`ai-tpi:v1.1.0`), damit das vorige für einen Rollback bleibt |
| `NODE_IMAGE` / `POSTGRES_IMAGE` | `node:22-bookworm-slim` / `postgres:16-alpine` | Basis-Images, z. B. aus einem Firmen-Spiegel |
| `BACKUP_DIR` / `KEEP` | `./backups` / `14` | Nur für `tools/ops/backup.sh`: Zielordner und Anzahl aufbewahrter Sicherungen ([Backup](/betrieb/backup-und-wiederherstellung/)) |
| `SETUP_COMPANY_NAME`, `SETUP_COMPANY_SLUG`, `SETUP_INDUSTRY_CODE`, `SETUP_ADMIN_NAME`, `SETUP_ADMIN_EMAIL`, `SETUP_ADMIN_PASSWORD` | – | Nur für `ai-tpi-setup`: Werte der Ersteinrichtung ohne Rückfragen (automatisierte Installation) |

Im Container sind `NODE_ENV=production`, `SERVER_HOST=0.0.0.0`, `SERVER_PORT=3000` und `WEB_DIST_DIR=/app/web` fest gesetzt. Siehe [Installation mit Docker](/betrieb/installation-mit-docker/).

## Empfehlungen für den Produktivbetrieb

- `NODE_ENV=production` (setzt `COOKIE_SECURE`, Rate-Limits und Protokoll automatisch), `PUBLIC_BASE_URL=https://…`
- `SECRET_ENCRYPTION_KEY` setzen und sicher aufbewahren
- Nach der Ersteinrichtung `SETUP_ENABLED=false`
- Betrieb hinter einem Reverse Proxy mit HTTPS, dann `TRUST_PROXY=true`
- Auflagen aus dem [Security-Review](/projekt/test/security-review/) beachten
