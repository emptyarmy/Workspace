# Architektur (Version 3 – nach Klärung Runde 2: Vue + TypeScript, Mandanten, lokaler Betrieb)

Änderung gegenüber Version 1: Wegen **Anmeldung**, **Admin-Bereich** und **parallelem Arbeiten mehrerer Abteilungen** wird aus der reinen Browser-App eine **Client-Server-Anwendung** mit zentraler Datenbank.

## 1. Überblick

```mermaid
flowchart LR
  subgraph Client["Browser – Laptop / Tablet / Smartphone"]
    SPA["Vue-3-SPA (TypeScript)<br/>Views, Komponenten, i18n DE/EN"]
  end
  subgraph Server["Node.js-Server"]
    API["REST-API<br/>/api/*"]
    AUTH["Auth-Modul<br/>Local · später OIDC/SSO"]
    DOM["Domäne<br/>Scoring · Regel-Engine"]
    AI["KI-Proxy<br/>Adapter je Anbieter"]
    SSE["Live-Updates<br/>Server-Sent Events"]
    MAIL["Mail-Service"]
  end
  DB[("PostgreSQL")]
  SMTP["SMTP-Server"]
  LLM["LLM<br/>Claude · OpenAI · Azure<br/>Ollama · LM Studio"]
  SPA -- "HTTPS, Session-Cookie" --> API
  SPA <-. "Ereignisse" .- SSE
  API --> AUTH & DOM & AI
  API --> DB
  AUTH --> MAIL --> SMTP
  AI -- "KI-Konfiguration je Firma" --> LLM
```

## 2. Technologieauswahl (Vorschlag, ADR-002 bis ADR-005)

| Schicht | Vorschlag | Begründung | Alternative |
|---|---|---|---|
| Sprache | **TypeScript** (Frontend, Backend, Shared) | Typsicherheit bei Mehrbenutzer-, Rollen- und Mandantenlogik (N-10) | JavaScript |
| Frontend-Framework | **Vue 3 (Composition API) mit Vite** | freigegeben (N-10), schlanke Lernkurve, sehr gute Formularbindung | React |
| UI-Komponenten | **PrimeVue** (Unstyled + Tailwind-Preset) | Tabellen, Dialoge, Bestätigungs-Popups, responsive | Vuetify, Quasar |
| Routing / State / Datenabruf | Vue Router (mit Rollen-Guards), **Pinia**, TanStack Query (Vue) | Caching, Synchronisation mehrerer Nutzer | – |
| Formulare / Validierung | VeeValidate + **Zod** (Schemas teilen Client und Server) | gleiche Regeln auf beiden Seiten | – |
| i18n | **vue-i18n** | Standard, Pluralformen | – |
| Diagramme | Apache ECharts (`vue-echarts`) | Radar (inkl. Benchmark-Linien), Balken, Heatmap/Matrix, touchfähig | Chart.js |
| Passwortstärke | `@zxcvbn-ts/core` + Sprachpakete DE/EN | Originalitätsprüfung | – |
| Backend | **Node.js (LTS) + Fastify** | gleiche Sprache wie das Frontend, schnell, Schema-Validierung | Express, NestJS |
| Datenbank | **PostgreSQL** | parallele Zugriffe, Transaktionen | SQLite (nur für Einzelplatz) |
| ORM / Migrationen | **Drizzle ORM** (ADR-007) | Typsicherheit, SQL-Migrationen, keine Binär-Engines | Prisma |
| Auth | Session-basiert, Argon2id; Provider-Schnittstelle für OIDC | SSO später leicht ergänzbar | Keycloak vorschalten |
| Mail | Nodemailer: Standard **sendmail-Transport des Betriebssystems**, umschaltbar auf SMTP (N-05); in Entwicklung und Test **Mailpit** | Playwright liest Einladungs- und Reset-Mails über die Mailpit-API | – |
| Live-Updates | Server-Sent Events | einfacher als WebSockets, reicht für Benachrichtigungen | Socket.IO |
| PDF | Druck-Stylesheet; optional serverseitig mit Playwright/Chromium | identische Darstellung | – |
| Betrieb | **Phase 1: lokal** (`npm run dev`, PostgreSQL + Mailpit per Docker Compose); **Phase 2: CI/CD-Pipeline** baut, testet und stellt Container bereit (N-06) | schneller Start, später automatisiert | – |
| CI/CD | GitHub Actions oder GitLab CI (R-13): Lint → Typprüfung → Unit/API → Playwright (alle Geräteprofile) → Container-Build → Deployment | Qualitätstor vor jedem Deployment | Azure DevOps, Jenkins |
| Tests | Vitest (Unit), Supertest (API), **Playwright** (E2E) | – | – |

## 3. Projektstruktur (Monorepo, ab Phase 3)

```
AI_TPI/
├── apps/
│   ├── web/                 Vue-3-Frontend (TypeScript)
│   │   └── src/{router,stores,components,views,composables,i18n,styles}
│   └── server/              Fastify-Backend
│       └── src/{auth,users,companies,assessments,answers,consolidation,comments,history,reports,benchmark,recommendations,ai,admin,mail}
├── packages/
│   ├── shared/              Zod-Schemas, Passwortregeln, Scoring (von Client und Server genutzt)
│   └── catalog/             Fragenkatalog JSON + Schema
├── tests/
│   ├── e2e/                 Playwright-Specs + Page Objects
│   ├── api/                 API-Tests
│   └── fixtures/
├── docker-compose.yml
└── docs/
```

## 4. Paralleles Arbeiten (F-09)

| Aspekt | Lösung (Vorschlag) |
|---|---|
| Zuständigkeit | Kernbereiche werden Abteilungen bzw. Personen zugewiesen; Nutzer sehen „Meine Kernbereiche“ zuerst, können aber alle lesen (N-04) |
| Gleichzeitiges Bearbeiten | **Optimistisches Sperren**: Jede Antwort hat eine Versionsnummer. Bei einem Konflikt erscheint ein Hinweis „Wurde inzwischen von X geändert“ mit der Wahl „übernehmen“ oder „überschreiben“ |
| Sichtbarkeit | Live-Hinweis „X bearbeitet gerade KB03“; Antworten anderer erscheinen ohne Neuladen |
| Nachvollziehbarkeit | Antworthistorie (wer, wann, alt → neu) |
| Antwortmodell | **Entschieden (N-03):** Jede Abteilung antwortet separat; der Assessor führt zusammen; alles wird in der Änderungshistorie protokolliert – siehe `02_analyse/03_zusammenfuehrung-und-historie.md` |
| Mandanten | Mehrere Firmen mit eigenem Logo und eigener Branche; strikte Datentrennung; Benchmark nur aggregiert – siehe `08_mandanten-und-benchmark.md` |

## 5. Rollen (entschieden, N-01/N-02)

Genau **eine Rolle** je Nutzer: **Admin**, **Assessor**, **Befragter** oder **Leser** (festgelegt, R-08). Details und Rechtematrix: `07_admin-bereich.md`. Der erste registrierte Nutzer wird automatisch Admin (abgesichert, siehe `06_authentifizierung-und-sicherheit.md`).

## 6. Sicherheit
Siehe `06_authentifizierung-und-sicherheit.md`. Grundsätze: Prüfung aller Eingaben auf dem Server (Zod), rollenbasierte Prüfung bei jedem API-Aufruf, Secrets nur in Umgebungsvariablen bzw. verschlüsselt in der DB, CSP-Header, kein Ausgeben von Fehlerdetails an den Client.
