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
| `SERVER_PORT` | `3000` | Port des API-Servers. Die Weboberfläche nutzt denselben Wert für ihren Proxy. |
| `DATABASE_URL` | – | PostgreSQL, z. B. `postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi`. Ohne Angabe laufen nur Katalog und Health. |
| `SETUP_ENABLED` | `true` | Ersteinrichtung erlauben (zusätzlich nur über localhost und nur ohne Nutzer) |
| `SECRET_ENCRYPTION_KEY` | – | Schlüssel (≥ 32 Zeichen) für SMTP-Passwörter und KI-API-Schlüssel. **Pflicht bei `production`**; leer = Entwicklungsschlüssel |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Basis für Links in E-Mails (Einladung, Einmal-Link) |
| `COOKIE_SECURE` | `false` | Sitzungs-Cookie nur über HTTPS (in Produktion `true`) |
| `MAIL_TRANSPORT` | `smtp` | Standard-Mailversand: `smtp`, `sendmail` (Betriebssystem) oder `memory` (nur Tests) |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | SMTP-Server für `MAIL_TRANSPORT=smtp` (lokal Mailpit) |
| `MAIL_FROM` | `AI_TPI <no-reply@ai-tpi.local>` | Standard-Absender |
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

## Dokumentation

| Variable | Standard | Bedeutung |
|---|---|---|
| `DOCS_PORT` | `4321` | Port von `npm run docs:dev` und `docs:preview`. Nur als Umgebungsvariable beim Start (`DOCS_PORT=4322 npm run docs:dev`), nicht aus der `.env`. |

## Empfehlungen für den Produktivbetrieb

- `NODE_ENV=production`, `COOKIE_SECURE=true`, `PUBLIC_BASE_URL=https://…`
- `SECRET_ENCRYPTION_KEY` setzen und sicher aufbewahren
- Nach der Ersteinrichtung `SETUP_ENABLED=false`
- Betrieb hinter einem Reverse Proxy mit HTTPS
