# AGENTS.md – Leitfaden für KI-Coding-Agenten und Entwickler

> Dieses Dokument richtet sich an KI-Agenten (Claude Code, GitHub Copilot, Cline, Cursor u. a.) und an menschliche Entwickler, die am Projekt **AI_TPI** arbeiten. Es ist die verbindliche Arbeitsgrundlage. Bei Widersprüchen gilt: `docs/07_entscheidungen/` (ADRs) > `AGENTS.md` > übrige Dokumente.

## 1. Projektziel in einem Satz

Eine responsive, mandantenfähige Webanwendung (**Vue 3 + TypeScript**, Node.js/Fastify, PostgreSQL), in der sich Mitarbeitende mehrerer Firmen und Abteilungen **anmelden** und parallel den **Reifegrad ihres Testprozesses** in **19 Kernbereichen** (TPI NEXT® + agile Ergänzungen aus Agile TPI + 3 KI-Kernbereiche) zweisprachig (DE/EN) erfassen, kommentieren und auswerten – inklusive grafischem Bericht und **KI-gestützten Handlungsempfehlungen** (kurzfristig < 1 Monat / langfristig ≥ 1 Monat), abgesichert durch **Playwright-Tests** (positiv & negativ).

## 2. Aktueller Projektstatus

| Phase | Status |
|---|---|
| 0 – Analyse & Planung | ☑ abgeschlossen (Runde 1 der Fragen beantwortet) |
| 1 – Klärung offener Fragen | ☑ alle blockierenden Fragen beantwortet (09.11.2026); nicht blockierende Fragen in `docs/01_anforderungen/04_offene-fragen.md` |
| 2 – Fragenkatalog | ◐ Entwurf v1.0 fertig (223 KP, `packages/catalog/`); **fachliche Prüfung ausstehend** |
| 3 – Fundament | ☑ Grundgerüst lauffähig und getestet (09.11.2026) |
| 4a – Anmeldung & Admin eigene Firma | ☑ (09.11.2026) |
| 4b – firmenübergreifende Admin-Funktionen, Abteilungen, KI/Mail je Firma, Audit-Log | ☑ (09.11.2026) |
| 5a – Assessment, Team/Zuweisung, Fragebogen, Kommentare, Quellen, Zusammenführung, Änderungshistorie | ☑ (13.11.2026) – Rechte in `apps/server/src/assessment/access.ts`, Regeln (Vorschlag, Begründungspflicht, Umfang) in `packages/shared/src/assessment.ts` |
| 5b – Live-Updates (SSE, `apps/server/src/assessment/live.ts`), Präsenz, Duplizieren, JSON-Export/-Import (`assessment/transfer.ts`) | ☑ (13.11.2026) |
| 6 – Auswertung (Scoring, Matrix, Radar, Bericht, Benchmark) | **als Nächstes** |
| 2 – Fragenkatalog finalisieren | geplant |
| 3 ff. – Umsetzung | geplant (`docs/06_umsetzung/01_roadmap.md`) |

**Regel:** Jede neue Funktion wird mit Positiv- und Negativtests ausgeliefert; vor jedem Commit `npm run typecheck && npm run lint && npm run test:unit`.

## 3. Verzeichnisstruktur

```
AI_TPI/
├── AGENTS.md                  ← dieses Dokument
├── README.md                  ← Einstieg für Menschen
├── AI_TPI.code-workspace      ← VS-Code-Workspace inkl. Einstellungen & empfohlener Extensions
├── docs/
│   ├── 00_ueberblick/         ← Vision, Ziele, Glossar
│   ├── 01_anforderungen/      ← fachliche/nichtfunktionale Anforderungen, User Stories, OFFENE FRAGEN
│   ├── 02_analyse/            ← Analyse der Quelldokumente, Reifegradmodell & Bewertungslogik
│   ├── 03_fragenkatalog/      ← Struktur, KI-Erweiterung, Übersetzung
│   ├── 04_architektur/        ← Architektur, Datenmodell, UI/UX, Bericht, KI-Empfehlungen
│   ├── 05_test/               ← Teststrategie & Testfallkatalog (Playwright)
│   ├── 06_umsetzung/          ← Roadmap, Backlog
│   ├── 07_entscheidungen/     ← Architecture Decision Records (ADR)
│   └── _quellen/              ← Originaldokumente (nur lesen, nicht ändern!)
├── packages/catalog/          ← Fragenkatalog (JSON + Schema) – maßgebliche Quelle
├── tools/catalog/             ← validate.py, build_overview.py
├── apps/web/                  ← Vue 3 + TypeScript (Vite)
├── apps/server/               ← Fastify + Drizzle + PostgreSQL (Migrationen in drizzle/)
├── apps/docs/                 ← Dokumentationsseite (Astro + Starlight): Handbuch, Entwicklung, Referenz; übernimmt docs/ automatisch
├── packages/shared/           ← Passwortregeln, Stärke, Rollen, E-Mail/Domain – Client UND Server
├── data/                      ← Demo-/Beispieldaten
├── tests/e2e/                 ← Playwright-Specs + Page Objects (pages/)
├── playwright.config.ts       ← 7 Geräteprofile
└── docker-compose.yml         ← PostgreSQL + Mailpit (lokal)

Details: docs/04_architektur/01_architektur.md
```

## 4. Verbindliche Konventionen

### 4.1 Sprache & Benennung
- Dokumentation: **Deutsch**. Code, Bezeichner, Commit-Messages: **Englisch**.
- **TypeScript strict** in allen Paketen; Vue-Komponenten als `<script setup lang="ts">`.
- Dateinamen: `kebab-case`. JS-Bezeichner: `camelCase`, Klassen/Komponenten: `PascalCase`.
- Checkpoint-IDs sind **stabil** und werden nie umnummeriert: `KB<NN>.<LEVEL>.<NN>` z. B. `KB03.K.02` (Kernbereich 3, Kontrolliert, Kontrollpunkt 2). Agile KP: `KB<NN>.AG.<Sicht><Nr>`; KI-Ergänzungen: `KB<NN>.<LEVEL>.AI<n>`. Herkunft zusätzlich im Attribut `tags` (`agile`, `AI`).

### 4.2 Inhalte strikt von Code trennen
- Fragen, Texte, Reifegrade, Empfehlungsbausteine liegen **ausschließlich** in `packages/catalog/catalog.v1.json` (Oberflächentexte in den i18n-Dateien) – **nie** hartkodiert im Code. Nach jeder Katalogänderung `python3 tools/catalog/validate.py` ausführen.
- Jede UI-Zeichenkette muss in **DE und EN** vorhanden sein. Ein fehlender Schlüssel ist ein Testfehler.

### 4.3 Tests
- Jede UI-Funktion hat mindestens **einen Positiv- und einen Negativtest** in Playwright.
- Testfall-IDs aus `docs/05_test/02_testfallkatalog.md` (z. B. `TC-ANS-003`) stehen im Testtitel.
- Selektoren nur über `data-testid` oder ARIA-Rollen, niemals über CSS-Klassen.
- Geräteprofile: Desktop (Chromium, Firefox, WebKit), Tablet (iPad), Mobil (iPhone, Samsung Galaxy).
- Anmeldung im Playwright-Setup-Projekt, `storageState` je Rolle; E-Mails über die Mailpit-API; KI-Anbieter immer gemockt.

### 4.4 Qualität
- Barrierefreiheit: WCAG 2.2 AA (Tastaturbedienung, Kontraste, ARIA).
- Keine personenbezogenen Daten an externe Dienste ohne explizite Zustimmung (siehe Datenschutz in `docs/01_anforderungen/02_nichtfunktionale-anforderungen.md`).
- **CSRF:** Zustandsändernde API-Aufrufe brauchen den Header `X-Requested-With: ai-tpi` (im Web über `apps/web/src/api/client.ts`).
- **Sicherheit:** Jede Validierung (Passwortregeln, Eingaben, Rollen) gilt **im Client und auf dem Server**; die Regeln stehen nur einmal in `packages/shared`. Keine Secrets im Repository; API-Schlüssel nur serverseitig und verschlüsselt.
- **Auth:** Neue Anmeldeverfahren nur über die `AuthProvider`-Schnittstelle anbinden (SSO-Vorbereitung).
- **Mandanten:** Jede Datenbankabfrage auf fachliche Daten **muss** nach `companyId` filtern; fremde IDs → 404. Jede neue Route braucht einen Negativtest für fremde Firmen. Admins verwalten nur ihre Firma; Nutzer-E-Mails müssen zu den Domains der Firma passen.
- **Rollen:** Genau eine Rolle je Nutzer: Admin / Assessor / Befragter / Leser (R-08, festgelegt). Admins lesen Ergebnisse **nur der eigenen Firma** (kein Schreibzugriff); fremde Firmen nur aggregierter Benchmark – serverseitig erzwingen (S-06, S-11). Firmenübergreifende Admin-Aktionen lösen immer eine Info-Mail an die Admins der Zielfirma aus. Berechtigungen zentral in `packages/shared/permissions.ts`.
- **Historie:** Jede fachliche Änderung schreibt einen `change_history`-Eintrag (append-only) – in derselben Transaktion.
- KI-Empfehlungen sind **immer** als solche gekennzeichnet und vom Nutzer übersteuerbar.

### 4.5 Arbeitsweise für Agenten
1. Vor jeder Änderung `docs/06_umsetzung/02_backlog.md` und relevante ADRs lesen.
2. Kleine, nachvollziehbare Schritte; nach jedem Schritt Tests ausführen (`npm test`).
3. Architekturentscheidungen nicht stillschweigend ändern – neuen ADR in `docs/07_entscheidungen/` anlegen.
4. Dateien in `docs/_quellen/` niemals verändern.
5. Neue Funktionen auch im Handbuch bzw. in der Referenz unter `apps/docs/src/content/docs/` beschreiben (API-Endpunkte, Fehlercodes, `.env`-Variablen).
6. Bei Unklarheiten: Frage in `docs/01_anforderungen/04_offene-fragen.md` ergänzen statt raten.

## 5. Befehle

| Zweck | Befehl |
|---|---|
| DB + Mailpit starten (lokal) | `docker compose up -d db mailpit` |
| Abhängigkeiten installieren | `npm install` |
| Migration erzeugen / ausführen | `npm run db:generate` / `npm run db:migrate` |
| Entwicklungsserver (Web + API) | `npm run dev` |
| Lokale Installation zurücksetzen (alle Daten weg, `/einrichtung` wieder frei) | siehe `apps/docs/src/content/docs/entwicklung/zuruecksetzen.md` |
| Typprüfung | `npm run typecheck` |
| Produktionsbuild | `npm run build` |
| Lint | `npm run lint` |
| Unit-, API- und DB-Tests | `npm run test:unit` (DB-Tests nur mit `TEST_DATABASE_URL`) |
| Playwright ohne Browser-Download (nur Chromium) | `PW_CHROMIUM_ONLY=1 npm run test:e2e` |
| Katalog prüfen | `npm run catalog:validate` |
| Dokumentation ansehen / bauen | `npm run docs:dev` / `npm run docs:build` |
| Platzhalter-Tests neu erzeugen (nach neuen echten Tests) | `npm run test:planned` |
| Playwright E2E | `npm run test:e2e` |
| Playwright UI-Modus | `npx playwright test --ui` |

## 6. Wichtige Dokumente

- Offene Fragen: [`docs/01_anforderungen/04_offene-fragen.md`](docs/01_anforderungen/04_offene-fragen.md)
- Quellenanalyse: [`docs/02_analyse/01_quellenanalyse.md`](docs/02_analyse/01_quellenanalyse.md)
- Agile Ergänzung: [`docs/03_fragenkatalog/04_agile-ergaenzung.md`](docs/03_fragenkatalog/04_agile-ergaenzung.md)
- Authentifizierung & Sicherheit: [`docs/04_architektur/06_authentifizierung-und-sicherheit.md`](docs/04_architektur/06_authentifizierung-und-sicherheit.md)
- Admin-Bereich: [`docs/04_architektur/07_admin-bereich.md`](docs/04_architektur/07_admin-bereich.md)
- Mandanten & Benchmark: [`docs/04_architektur/08_mandanten-und-benchmark.md`](docs/04_architektur/08_mandanten-und-benchmark.md)
- Zusammenführung & Historie: [`docs/02_analyse/03_zusammenfuehrung-und-historie.md`](docs/02_analyse/03_zusammenfuehrung-und-historie.md)
- KI-Erweiterung des Fragenkatalogs: [`docs/03_fragenkatalog/02_ki-erweiterung.md`](docs/03_fragenkatalog/02_ki-erweiterung.md)
- Roadmap: [`docs/06_umsetzung/01_roadmap.md`](docs/06_umsetzung/01_roadmap.md)
