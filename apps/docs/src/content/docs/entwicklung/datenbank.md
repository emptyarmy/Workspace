---
title: Datenbank und Migrationen
description: Schema mit Drizzle ORM ändern, Migrationen erzeugen und ausführen, Stammdaten.
sidebar:
  order: 3
---

AI_TPI nutzt **PostgreSQL 16** und **Drizzle ORM** (Entscheidung: [ADR-007](/projekt/entscheidungen/adr-007-orm-drizzle/)).

## Schema ändern

1. Tabellen in `apps/server/src/db/schema.ts` anpassen.
2. Migration erzeugen: `npm run db:generate`. Es entsteht `apps/server/drizzle/NNNN_<name>.sql`; die SQL-Datei vor dem Einchecken lesen.
3. Ausführen: `npm run db:migrate`.

`db:migrate` führt alle offenen Migrationen aus und legt danach die **Stammdaten** an, ohne vorhandene zu überschreiben:

- Standard-Branchenliste (`apps/server/src/db/industries.ts`)
- Sperrliste der Freemail-Domains (`packages/shared/src/identity.ts`)
- Eintrag für den Zustand der Ersteinrichtung

## Tabellen (Stand Phase 4b)

| Tabelle | Zweck |
|---|---|
| `industry` | gemeinsame Branchenliste |
| `company`, `company_domain` | Firmen (Mandanten) und ihre E-Mail-Domains (je Domain genau eine Firma) |
| `blocked_domain` | gesperrte Freemail-Domains |
| `department` | Abteilungen je Firma |
| `app_user` | Personen; E-Mail eindeutig ohne Groß-/Kleinschreibung; `created_by_user_id` für „Von mir angelegte Admins“ |
| `auth_identity` | Vorbereitung für SSO |
| `one_time_token`, `session` | Einmal-Links und Sitzungen (nur SHA-256-Hashes gespeichert) |
| `company_mail_config`, `ai_module` | E-Mail- und KI-Einstellungen je Firma (Geheimnisse verschlüsselt) |
| `setup_state` | Ersteinrichtung abgeschlossen ja/nein |
| `audit_log` | sicherheitsrelevante Ereignisse |

Vollständiges Zielmodell inkl. Assessments und Antworten: [Datenmodell](/projekt/architektur/datenmodell/).

## Regeln

- Jede fachliche Abfrage filtert nach `companyId`. Fremde IDs ergeben 404.
- Gelöschte Personen werden pseudonymisiert, nicht entfernt (Historie bleibt nachvollziehbar).
- Geheimnisse (SMTP-Passwort, API-Schlüssel) nur über `SecretBox` (`apps/server/src/auth/secrets.ts`) speichern.
