# Teststrategie

## 1. Teststufen

| Stufe | Werkzeug | Gegenstand | Ziel |
|---|---|---|---|
| Statische Prüfung | ESLint, Prettier, JSON-Schema (Ajv) | Code, Katalog, i18n-Dateien | 0 Fehler |
| Unit | Vitest | Scoring, Regel-Engine, Passwortregeln/-stärke, Validierung | ≥ 90 % Zweigabdeckung von `packages/shared` und Domäne |
| API | Vitest + Supertest | alle Endpunkte inkl. Rollenprüfung (401/403/409) | jede Route positiv + negativ |
| E2E / UI | **Playwright** | alle UI-Funktionen, positiv **und** negativ | 100 % der Testfälle aus `02_testfallkatalog.md` |
| Barrierefreiheit | @axe-core/playwright | alle Views | 0 kritische Verstöße |
| Visuell (optional) | Playwright `toHaveScreenshot` | Bericht, Matrix je Gerät | stabile Darstellung |

## 2. Playwright-Projekte (Geräteprofile)

| Projekt | Playwright-Device | Engine |
|---|---|---|
| desktop-chrome | Desktop Chrome (1920×1080) | Chromium |
| desktop-firefox | Desktop Firefox | Firefox |
| desktop-safari | Desktop Safari | WebKit |
| laptop-small | Desktop Chrome, Viewport 1366×768 | Chromium |
| tablet-ipad | iPad (gen 7) / iPad Pro 11 – hoch & quer | WebKit |
| mobile-iphone | iPhone 15 (bzw. aktuellstes Profil der installierten Playwright-Version) | WebKit |
| mobile-samsung | Galaxy S-Profil (z. B. Galaxy S9+ bzw. neuestes verfügbares) | Chromium |

Konkrete Profile werden bei der Einrichtung gegen `playwright.devices` der installierten Version abgeglichen (F-25).

## 3. Grundsätze
- **Jede Funktion: mindestens ein Positiv- und ein Negativtest.** Negativtests prüfen Fehleingaben, Grenzwerte, fehlerhafte Dateien, nicht erreichbare Dienste, Abbrüche.
- Testumgebung per `docker compose -f docker-compose.test.yml` (App, PostgreSQL, **Mailpit**); Datenbank wird vor jedem Testlauf zurückgesetzt und mit Seed-Daten befüllt (je Rolle ein Testnutzer).
- Anmeldung einmalig im Playwright-`setup`-Projekt; Sitzungen je Rolle als `storageState` gespeichert.
- E-Mails (Passwort vergessen) werden über die **Mailpit-API** ausgelesen.
- Zeitabhängige Fälle (Sitzungs-/Link-Ablauf) über `page.clock` bzw. konfigurierbare Ablaufzeiten.
- Mehrbenutzerfälle mit zwei Browser-Kontexten (`browser.newContext()`) im selben Test.
- Keine echten KI-Aufrufe in Tests – LLM-Endpunkte werden per `page.route()` gemockt.
- Selektoren: `getByRole`, `getByLabel`, `getByTestId`.
- Tests laufen in DE und – für ausgewählte Fälle – in EN.
- Page-Object-Modell unter `tests/e2e/pages/`.
- Reporter: HTML + JUnit (für CI); Traces bei Fehlern.

## 4. Eingangs-/Ausgangskriterien
- **Start E2E:** Build erfolgreich, Unit-Tests grün.
- **Release:** alle Playwright-Projekte grün, keine kritischen A11y-Verstöße, Testfallkatalog zu 100 % automatisiert oder begründet manuell.
