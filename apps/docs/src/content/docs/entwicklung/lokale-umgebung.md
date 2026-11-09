---
title: Lokale Umgebung
description: Ports, Dienste, npm-Skripte und VS-Code-Einrichtung für die Entwicklung.
sidebar:
  order: 2
---

## Dienste und Ports

| Dienst | Standardport | Einstellung |
|---|---|---|
| Weboberfläche (Vite) | 5173 | `WEB_PORT` |
| API-Server | 3000 | `SERVER_PORT` |
| PostgreSQL (Docker) | 5432 | `docker-compose.yml` + `DATABASE_URL` |
| Mailpit SMTP / Weboberfläche | 1025 / 8025 | `SMTP_PORT` |
| Dokumentation (Astro) | 4321 | `DOCS_PORT` |
| Playwright: API / Web | 3100 / 5180 | `E2E_SERVER_PORT` / `E2E_WEB_PORT` |

Die Weboberfläche leitet `/api` und `/public` an `http://127.0.0.1:<SERVER_PORT>` weiter. Server und Weboberfläche lesen beide die `.env` im Projektordner. Ein geänderter Port gilt deshalb für beide.

## Häufige Befehle

| Zweck | Befehl |
|---|---|
| Datenbank + Mailpit starten | `docker compose up -d db mailpit` |
| Entwicklung (API + Web, mit Neuladen) | `npm run dev` |
| Dokumentation ansehen | `npm run docs:dev` |
| Typprüfung / Lint / Formatieren | `npm run typecheck` · `npm run lint` · `npm run format` |
| Produktionsbuild Web / Doku | `npm run build` · `npm run docs:build` |

Alle Skripte: [npm-Skripte](/referenz/skripte/).

## Arbeitsdatenbank zurücksetzen

Löscht **alle** Daten in `ai_tpi`, danach ist die Ersteinrichtung wieder möglich:

```bash
docker compose exec db psql -U ai_tpi -d ai_tpi -c "drop schema public cascade; drop schema if exists drizzle cascade; create schema public;"
npm run db:migrate
```

## VS Code

`AI_TPI.code-workspace` öffnen (*Datei → Arbeitsbereich aus Datei öffnen*). Der Arbeitsbereich enthält Formatierung beim Speichern (Prettier), ESLint, Vue-Unterstützung (Volar) und die Playwright-Erweiterung zum Starten einzelner Tests.
