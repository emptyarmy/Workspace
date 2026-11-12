---
title: REST-Schnittstelle
description: Alle Endpunkte des API-Servers mit Berechtigung, Zweck und wichtigen Antwortcodes.
sidebar:
  order: 2
---

Basis: `http://<server>:<SERVER_PORT>`. Daten werden als JSON gesendet und empfangen.

## Grundregeln

| Thema | Regel |
|---|---|
| Anmeldung | Sitzungs-Cookie `ai_tpi_session` (HttpOnly, SameSite=Lax), gesetzt durch Login bzw. Ersteinrichtung |
| CSRF | `POST`, `PUT`, `PATCH`, `DELETE` auf `/api/*` brauchen den Header `X-Requested-With: ai-tpi`, sonst **403** `csrf` |
| Nicht angemeldet | **401** `unauthenticated` |
| Falsche Rolle | **403** `forbidden` |
| Fremde oder unbekannte IDs | **404** `not_found`; die Existenz wird nicht verraten |
| Ungültige Eingaben | **400** `invalid_input` mit `fields: [...]` |
| Konflikte | **409** mit einem Fehlercode (siehe [Fehlercodes](/referenz/fehlercodes/)) |

Fehlerantworten haben immer die Form `{ "error": "<code>" }`, ggf. mit weiteren Feldern.

## Öffentlich

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/health` | Zustand: `{ status, db, catalogVersion }` |
| GET | `/api/catalog` | gesamter Fragenkatalog |
| GET | `/api/catalog/key-areas/:id` | ein Kernbereich |
| GET | `/public/branding`, `/public/branding/:slug` | Logo und Name für die Anmeldeseite (unbekanntes Kürzel → neutral) |

## Ersteinrichtung

Nur über localhost, nur ohne Nutzer, nur mit `SETUP_ENABLED=true`; sonst **404**.

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/setup/status` | verfügbar? + Branchenliste |
| POST | `/api/setup` | Firma + ersten Admin anlegen, anmelden (**201**). Fehler: `domain_blocked`, `password_policy`, `password_mismatch` |

## Anmeldung

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → **200**; **401** `invalid_credentials`; **429** `locked` |
| POST | `/api/auth/logout` | Sitzung beenden (**204**) |
| GET | `/api/auth/me` | angemeldete Person mit Rolle und Firma |
| POST | `/api/auth/password-reset` | Einmal-Link anfordern; **immer 202** |
| POST | `/api/auth/password` | `{ token, password, passwordRepeat }`; Fehler `invalid_token`, `password_policy`, `password_reused` |
| GET | `/api/industries` | aktive Branchen (angemeldet) |

## Admin: eigene Firma

Alle Endpunkte unter `/api/admin/*` nur für die Rolle **Admin**.

| Methode | Pfad | Zweck |
|---|---|---|
| GET / POST | `/api/admin/users` | Nutzer auflisten / anlegen + Einladung (`email_domain`, `email_taken`) |
| PATCH | `/api/admin/users/:id` | Name, E-Mail, Rolle, Abteilung, aktiv (`self_protection`, `last_admin`) |
| DELETE | `/api/admin/users/:id` | pseudonymisieren; bei Admins Hinweis an die übrigen Admins |
| POST | `/api/admin/users/:id/password-reset` | Passwort zurücksetzen, neuer Link (**202**) |
| POST | `/api/admin/users/:id/invitation` | Einladung erneut senden |
| GET / PATCH | `/api/admin/company` | Firmendaten, Logo, Branche, Benchmark-Teilnahme |
| POST / DELETE | `/api/admin/company/domains[/:domain]` | Domains (`domain_invalid`, `domain_blocked`, `domain_taken`, `domain_in_use`, `last_domain`) |
| GET / POST / PATCH / DELETE | `/api/admin/departments[/:id]` | Abteilungen (`name_taken`, `department_in_use`) |
| GET / PUT | `/api/admin/mail-config` | Mailserver; Passwort nur als `hasPassword` |
| POST | `/api/admin/mail-config/test` | Test-Mail an mich (**502** `mail_failed`) |
| GET / POST / PATCH / DELETE | `/api/admin/ai-modules[/:id]` | KI-Module; Schlüssel nur maskiert (`name_taken`, `default_required`) |
| POST | `/api/admin/ai-modules/:id/test` | Verbindungstest → `{ ok, ms, status?, error? }` |
| GET / POST / PATCH / DELETE | `/api/admin/industries[/:code]` | gemeinsame Branchenliste (`code_taken`, `name_de_taken`, `name_en_taken`, `industry_in_use`, `standard_industry`) |
| GET | `/api/admin/audit` | Audit-Log; Parameter `action`, `from`, `to` (JJJJ-MM-TT), `limit` (≤ 200), `offset` |
| GET | `/api/admin/audit.csv` | dasselbe als CSV (≤ 5000 Zeilen) |

## Admin: andere Firmen

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/admin/companies` | andere Firmen, nur `id`, `name`, `slug` |
| POST | `/api/admin/companies` | neue Firma + ersten Admin (`slug_taken`, `domain_*`, `email_domain`, `email_taken`) |
| POST | `/api/admin/companies/:id/admins` | weiterer Admin für bestehende Firma (`own_company`); Hinweis an deren Admins |
| GET | `/api/admin/created-admins` | „Von mir angelegte Admins“ |
| PATCH | `/api/admin/created-admins/:id` | `role` (nur Nicht-Admin-Rollen), `active` (`last_admin`) |
| POST | `/api/admin/created-admins/:id/invitation` | Einladung erneut senden |
| POST | `/api/admin/created-admins/:id/password-reset` | Reset, zählt zum Tageslimit (**429** `reset_limit`) |
| GET | `/api/admin/cross-password-reset` | Tageskontingent `{ limit, used, remaining }` |
| POST | `/api/admin/cross-password-reset` | `{ email }`; **immer 202** bei bekannter/unbekannter Adresse; `own_company`, **429** `reset_limit` |

## Nur für Tests

Aktiv nur mit `NODE_ENV=test` **und** `TEST_ENDPOINTS=true`:

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/test/outbox?to=` | versendete Mails (`MAIL_TRANSPORT=memory`), inkl. `via` (genutzter Mailserver) |
| POST | `/api/test/expire-sessions` | `{ email }` – Sitzungen als 61 Minuten unbenutzt markieren |
| POST | `/api/test/expire-tokens` | `{ email }` – Einmal-Links ablaufen lassen |
| GET | `/api/test/fake-ollama/api/tags` | nachgebildeter Ollama-Endpunkt für den KI-Verbindungstest |

## Beispiel

```bash
# Anmelden und Cookie speichern
curl -c jar.txt -H 'X-Requested-With: ai-tpi' -H 'Content-Type: application/json' \
  -d '{"email":"anna@firma.de","password":"…"}' http://localhost:3000/api/auth/login

# Abteilung anlegen
curl -b jar.txt -H 'X-Requested-With: ai-tpi' -H 'Content-Type: application/json' \
  -d '{"name":"Qualitätssicherung"}' http://localhost:3000/api/admin/departments
```
