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
| `npm run build` | Produktionsbuild der Weboberfläche (`apps/web/dist`) |
| `npm run typecheck` | TypeScript-Prüfung aller Pakete |
| `npm run lint` | ESLint |
| `npm run format` | Prettier für das ganze Projekt |
| `npm run test` | `test:unit` und danach `test:e2e` |
| `npm run test:unit` | Vitest (Unit, API; Datenbanktests mit `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright auf allen Geräteprofilen |
| `npm run test:e2e:ui` | Playwright im UI-Modus |
| `npm run test:planned` | Platzhalter-Tests für noch nicht automatisierte Katalogfälle neu erzeugen (`tests/e2e/geplant/`) |
| `npm run db:generate` | Migration aus `schema.ts` erzeugen |
| `npm run db:migrate` | Migrationen ausführen + Stammdaten (löscht keine Daten; zum Zurücksetzen siehe [Anwendung zurücksetzen](/entwicklung/zuruecksetzen/)) |
| `npm run catalog:validate` | Fragenkatalog gegen das Schema prüfen (Python) |
| `npm run docs:dev` | Dokumentation mit Neuladen (Port 4321) |
| `npm run docs:build` | Dokumentation als statische Seite (`apps/docs/dist`) |
| `npm run docs:preview` | gebaute Dokumentation ansehen |

## Paketinterne Skripte

| Paket | Skript | Wirkung |
|---|---|---|
| `@ai-tpi/server` | `start` | Server ohne Neuladen (wird von Playwright genutzt) |
| `@ai-tpi/server` | `db:reset:e2e` | Testdatenbank leeren und neu aufbauen (nur Namen mit `_e2e`/`_test`) |
| `@ai-tpi/docs` | `sync` | Projektdokumentation aus `docs/` übernehmen |

Aufruf z. B. mit `npm run start -w @ai-tpi/server`.
