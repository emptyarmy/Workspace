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
│   ├── shared/               Regeln für Browser und Server: Passwort, Stärke, Rollen, E-Mail-Domains
│   └── catalog/              Fragenkatalog catalog.v1.json + JSON-Schema + Tests
├── tests/e2e/                Playwright-Tests (7 Geräteprofile)
├── docs/                     Projektdokumentation (Anforderungen, Architektur, Tests, ADRs)
├── tools/catalog/            Python-Werkzeuge zum Prüfen des Katalogs
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
| `routes/` | Endpunkte je Bereich (siehe [API](/referenz/api/)) |
| `admin/helpers.ts` | gemeinsame Admin-Funktionen: Domain-Prüfung, Einladung, Reset, Hinweis-Mails |
| `mail/` | Versand (Standard oder SMTP der Firma) und Mail-Vorlagen DE/EN |
| `audit.ts` | Einträge im Audit-Log |
| `security/localhost.ts` | Prüfung „nur localhost“ für die Ersteinrichtung |

## Weboberfläche (`apps/web/src`)

| Ordner | Inhalt |
|---|---|
| `views/` | Seiten: Ersteinrichtung, Anmeldung, Passwort, Start, `admin/` mit einem Panel je Reiter |
| `components/` | wiederverwendbar: Bestätigungsdialog, Passwortfeld mit Regeln/Stärke, Firmenlogo, Meldungsleiste |
| `api/client.ts` | einziger Zugang zur API; setzt den CSRF-Header |
| `stores/auth.ts` | angemeldete Person (Pinia) |
| `router/index.ts` | Routen und Zugriffsschutz |
| `i18n/de.json`, `en.json` | **alle** Oberflächentexte; beide Dateien müssen dieselben Schlüssel haben |
| `styles/main.css` | Farben, Formulare, Schaltflächen, gemeinsame Bausteine |

## Dokumentation (`apps/docs`)

Siehe [Dokumentation pflegen](/entwicklung/dokumentation/).
