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

### Testdateien

| Datei | Inhalt |
|---|---|
| `setup.setup.ts` | Ersteinrichtung über die Oberfläche, speichert die Admin-Sitzung |
| `login.spec.ts` | Anmeldung, Firmenlogo, Passwort vergessen, 404, Ersteinrichtung gesperrt/Server-Fehler |
| `password.spec.ts` | Passwortregeln, Stärkeanzeige, Einmal-Link |
| `admin-flow.spec.ts` | Einladung bis Login, Benutzer verwalten, Rollen und Rechte, Sperre, Meine Firma |
| `admin-4b.spec.ts` | Abteilungen, andere Firmen, Reset-Limit, Domains, E-Mail, KI-Module, Audit-Log, alle Reiter auf allen Geräten |
| `industries.spec.ts` | Branchenliste pflegen |
| `erfassung.spec.ts` | Phase 5: Assessment anlegen/löschen, Team und Zuweisung, Fragebogen (Fortschritt, Filter, Tastatur, Fehler beim Speichern, Konflikt zweier Nutzer), Abgabe, Quellen, Kommentare, Zusammenführung, Änderungshistorie. Jeder Test legt eine eigene Testfirma mit Team an (`erfassung-helpers.ts`, Zeitlimit 90 s), damit die Listen der E2E-Firma klein bleiben |
| `erfassung-live.spec.ts` | Phase 5b: Live-Aktualisierung zweier Browser (≤ 2 s), Präsenzanzeige, Duplizieren, JSON-Export/-Import mit Fehlerfällen |
| `konto-und-verwaltung.spec.ts` | abgelaufener Link/Sitzung, Passwort-Wiederverwendung, Logo in der Kopfzeile, Name/E-Mail ändern, Rollen, Externe, Anmeldelink, Mailfehler, Drehen auf Mobilgeräten |
| `barrierefreiheit.spec.ts` | axe-Scan (WCAG 2.1 A/AA) aller Seiten und Reiter auf Desktop und iPhone |
| `i18n-rwd.spec.ts` | Sprachumschaltung, kein horizontales Scrollen, Touch-Größen |
| `geplant/*.spec.ts` | **Platzhalter** (`test.fixme`) für Funktionen späterer Phasen – siehe unten |

### Barrierefreiheit

`barrierefreiheit.spec.ts` prüft mit [axe-core](https://github.com/dequelabs/axe-core) (`@axe-core/playwright`) jede vorhandene Seite gegen WCAG 2.1 A/AA. Es dürfen **keine** Verstöße der Stufen *critical* und *serious* auftreten. Gefundene Verstöße hängt der Test als JSON an den Playwright-Bericht an.

### Platzhalter für geplante Funktionen

Für jeden Fall des [Testfallkatalogs](/projekt/test/testfallkatalog/), den noch kein echter Test abdeckt, gibt es einen Platzhalter mit `test.fixme`. Titel ist die Testfall-ID mit Beschreibung; „Gerät“ und „Erwartet“ stehen als Anmerkungen im Bericht. Platzhalter laufen nicht, sie werden als übersprungen gezählt und nur im Profil `desktop-chrome` aufgeführt.

```bash
npm run test:planned     # tests/e2e/geplant/ aus dem Katalog neu erzeugen
```

Ablauf für eine neue Funktion: echte Tests mit der Katalog-ID im Titel schreiben, dann `npm run test:planned` ausführen. Damit verschwinden die abgedeckten Platzhalter. Die Dateien in `geplant/` nie von Hand bearbeiten.

### Testschnittstellen

Nur mit `NODE_ENV=test` und `TEST_ENDPOINTS=true` (Playwright-Testserver):

| Schnittstelle | Zweck |
|---|---|
| `GET /api/test/outbox?to=` | versendete Mails inkl. genutztem Mailserver (`via`) |
| `POST /api/test/expire-sessions` | Sitzungen einer Person 61 Minuten „altern“ lassen (Leerlauf-Timeout) |
| `POST /api/test/expire-tokens` | Einmal-Links einer Person ablaufen lassen |
| `GET /api/test/fake-ollama/api/tags` | nachgebildeter Ollama-Server für den KI-Verbindungstest |

Mailserver mit einem Namen unter der reservierten Endung `.invalid` (z. B. `smtp.kaputt.invalid`) schlagen im Testbetrieb wie ein nicht erreichbarer Server fehl.

## Regeln für neue Tests

- Selektoren nur über `data-testid` oder ARIA-Rollen, nie über CSS-Klassen.
- Anmeldeversuche anderer Personen nie über den API-Kontext des Admins (`ada`) ausführen; das überschreibt dessen Sitzung. Stattdessen einen frischen Kontext verwenden (`loggedInContext`).
- Jede neue Route bekommt einen Negativtest für **fremde Firmen** (404) und für **falsche Rollen** (403).
- Neue Oberflächentexte in `de.json` **und** `en.json`; ein Test prüft die Vollständigkeit und die Platzhalter.
