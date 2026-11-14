---
title: Projektstruktur
description: Aufbau des Monorepos mit Weboberfläche, API-Server, gemeinsamen Regeln, Fragenkatalog und Dokumentation.
sidebar:
  order: 1
---

AI_TPI ist ein **Monorepo mit npm-Workspaces**. Abhängigkeiten werden einmal im Projektordner installiert (`npm install`).

```text
AI_TPI/
├── apps/
│   ├── web/                  Weboberfläche: Vue 3, TypeScript, Vite, Pinia, vue-router, vue-i18n
│   ├── server/               API: Fastify 5, TypeScript (tsx), Drizzle ORM, PostgreSQL
│   └── docs/                 diese Dokumentation: Astro + Starlight
├── packages/
│   ├── shared/               Regeln für Browser und Server: Passwort, Stärke, Rollen, E-Mail-Domains,
│   │                         Assessment-Regeln, Bewertung (score.ts), Regel-Engine der Empfehlungen (recommend.ts)
│   └── catalog/              Fragenkatalog catalog.v1.json + JSON-Schema + Tests
├── tests/e2e/                Playwright-Tests (7 Geräteprofile)
├── docs/                     Projektdokumentation (Anforderungen, Architektur, Tests, ADRs)
├── tools/catalog/            Python-Werkzeuge zum Prüfen des Katalogs
├── tools/tests/              Erzeugt Platzhalter-Tests für noch nicht automatisierte Testfälle
├── docker-compose.yml        PostgreSQL 16 + Mailpit für die lokale Entwicklung
├── playwright.config.ts      Geräteprofile, Testserver, Testdatenbank
├── vitest.config.ts          Unit-, API- und Datenbanktests
├── AGENTS.md                 verbindliche Arbeitsregeln (auch für KI-Agenten)
└── AI_TPI.code-workspace     VS-Code-Arbeitsbereich mit Einstellungen und Erweiterungen
```

## API-Server (`apps/server/src`)

| Ordner / Datei | Inhalt |
|---|---|
| `index.ts`, `app.ts` | Start, Registrierung aller Routen, Sicherheits-Header, Fehlerbehandlung |
| `config.ts` | Einlesen und Prüfen der Umgebungsvariablen (siehe [Konfiguration](/referenz/konfiguration/)) |
| `db/schema.ts` | Tabellen (Drizzle); Migrationen in `apps/server/drizzle/` |
| `auth/` | Passwort-Hashing (Argon2id), Sitzungen, Einmal-Links, Verschlüsselung von Geheimnissen |
| `plugins/auth.ts` | CSRF-Prüfung, Sitzung → `req.user`, `requireAuth(roles)` |
| `routes/` | Endpunkte je Bereich (siehe [API](/referenz/api/)), u. a. `assessments.ts`, `answers.ts`, `live.ts`, `transfer.ts`, `report.ts` (Bericht, Benchmark), `recommendations.ts` (Empfehlungen, Maßnahmenplan) |
| `assessment/access.ts` | Rechte je Assessment (`loadAccess`), Umfang, Eintrag in die Änderungshistorie |
| `assessment/live.ts` | Live-Kanal (Server-Sent Events) und Präsenz |
| `assessment/transfer.ts` | JSON-Export/-Import, Duplizieren |
| `assessment/scoring.ts` | Kennzahlen und Benchmark-Schnappschüsse |
| `assessment/recommend.ts` | Empfehlungen erzeugen: Regeltexte, Daten für die KI (auch für die Datenschutz-Vorschau), Fallback, Speichern |
| `assessment/llm.ts` | KI-Aufruf je Anbieter (Anthropic, OpenAI, Azure OpenAI, Ollama, LM Studio, OpenAI-kompatibel), Zeitlimit, Prüfung der Antwort |
| `admin/ai-test.ts` | Verbindungstest der KI-Module |
| `admin/helpers.ts` | gemeinsame Admin-Funktionen: Domain-Prüfung, Einladung, Reset, Hinweis-Mails |
| `mail/` | Versand (Standard oder SMTP der Firma) und Mail-Vorlagen DE/EN |
| `audit.ts` | Einträge im Audit-Log |
| `security/localhost.ts` | Prüfung „nur localhost“ für die Ersteinrichtung |

## Weboberfläche (`apps/web/src`)

| Ordner | Inhalt |
|---|---|
| `views/` | Seiten: Ersteinrichtung, Anmeldung, Passwort, Start, Benchmark, `admin/` mit einem Panel je Reiter, `assessments/` (Liste, Anlage, Detail, Fragebogen, Zusammenführung, Bericht, Empfehlungen) |
| `components/` | wiederverwendbar: Bestätigungsdialog, Passwortfeld mit Regeln/Stärke, Firmenlogo, Meldungsleiste, Stammdaten-Formular, Kommentare, Benchmark, `charts/` (Netz- und Balkendiagramm) |
| `composables/` | `useLiveAssessment` (Live-Aktualisierung, Präsenz), `useNotice`, `useBranding` |
| `api/client.ts` | einziger Zugang zur API; setzt den CSRF-Header |
| `stores/auth.ts` | angemeldete Person (Pinia) |
| `router/index.ts` | Routen und Zugriffsschutz |
| `i18n/de.json`, `en.json` | **alle** Oberflächentexte; beide Dateien müssen dieselben Schlüssel haben |
| `styles/main.css` | Farben, Formulare, Schaltflächen, gemeinsame Bausteine |

## Dokumentation (`apps/docs`)

Siehe [Dokumentation pflegen](/entwicklung/dokumentation/).
