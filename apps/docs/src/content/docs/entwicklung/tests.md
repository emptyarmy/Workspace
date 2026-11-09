---
title: Tests
description: Unit-, API- und Datenbanktests mit Vitest; Oberflächentests mit Playwright auf sieben Geräteprofilen.
sidebar:
  order: 4
---

Jede Funktion wird mit **positiven und negativen Tests** ausgeliefert. Die Testfall-IDs aus dem [Testfallkatalog](/projekt/test/testfallkatalog/) (z. B. `TC-ADM-034`) stehen im Testtitel.

## Vitest: Unit, API und Datenbank

```bash
npm run test:unit
```

| Art | Ort | Hinweis |
|---|---|---|
| Unit | `packages/*/test`, `apps/web/test`, `apps/server/test/*.test.ts` | Passwortregeln, Katalog, i18n-Vollständigkeit, Verschlüsselung |
| API | `apps/server/test/api.test.ts` | Server im Speicher (`app.inject`), ohne Datenbank |
| Datenbank | `apps/server/test/*.integration.test.ts` | nur mit `TEST_DATABASE_URL`; **die Datenbank wird geleert** |

```bash
docker compose exec db createdb -U ai_tpi ai_tpi_test
TEST_DATABASE_URL=postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi_test npm run test:unit
```

## Playwright: Oberfläche auf sieben Geräten

```bash
npx playwright install        # einmalig
npm run test:e2e              # alle Profile
npm run test:e2e:ui           # UI-Modus
npx playwright test --project=desktop-chrome tests/e2e/industries.spec.ts
```

| Profil | Gerät |
|---|---|
| `desktop-chrome` | Chrome, 1920 × 1080 |
| `desktop-firefox` | Firefox |
| `desktop-safari` | WebKit (Safari) |
| `laptop-small` | Chrome, 1366 × 768 |
| `tablet-ipad` | iPad (11. Gen.) |
| `mobile-iphone` | iPhone 17 |
| `mobile-samsung` | Galaxy S24 |

So läuft ein Testlauf ab:

1. Playwright startet einen **eigenen** API-Server (Port 3100) und eine eigene Weboberfläche (Port 5180).
2. Die Testdatenbank `ai_tpi_e2e` wird vorher geleert. Ihre Adresse kommt aus `E2E_DATABASE_URL` oder wird aus `DATABASE_URL` in `.env` abgeleitet.
3. Das Projekt `setup` führt die Ersteinrichtung über die Oberfläche durch und speichert die Admin-Sitzung.
4. E-Mails landen in einer **Test-Outbox** (`/api/test/outbox`), deshalb ist kein Mailpit nötig.
5. Alle Profile teilen sich die Datenbank. Tests verwenden deshalb eindeutige Adressen, und Tests, die Firmeneinstellungen ändern, legen sich eine **eigene Testfirma** an (`createTestCompany` in `tests/e2e/helpers.ts`).
6. KI-Anbieter werden nie echt aufgerufen; der Testserver bildet einen Ollama-Endpunkt nach.

### Umgebungsvariablen für Tests

| Variable | Wirkung |
|---|---|
| `E2E_DATABASE_URL` | Testdatenbank (muss auf `_e2e` oder `_test` enden) |
| `PW_SKIP_FIREFOX=1` | Profil Firefox weglassen |
| `PW_CHROMIUM_ONLY=1` | alle Profile mit Chromium (ohne Browser-Download) |
| `PW_CHROMIUM_PATH` | eigener Chromium-Pfad |
| `E2E_SERVER_PORT`, `E2E_WEB_PORT` | abweichende Testports |

## Regeln für neue Tests

- Selektoren nur über `data-testid` oder ARIA-Rollen, nie über CSS-Klassen.
- Jede neue Route bekommt einen Negativtest für **fremde Firmen** (404) und für **falsche Rollen** (403).
- Neue Oberflächentexte in `de.json` **und** `en.json`; ein Test prüft die Vollständigkeit und die Platzhalter.
