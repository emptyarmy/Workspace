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

## Assessments (Phase 5)

Alle Endpunkte brauchen eine Anmeldung. Fremde Firma oder unbekannte ID → **404**; eigene Firma, aber nicht im Team → **403** `forbidden` (Admins haben Lesezugriff auf alle Assessments der Firma, aber keinen Schreibzugriff).

| Methode | Pfad | Wer | Zweck |
|---|---|---|---|
| GET | `/api/assessments` | alle | sichtbare Assessments (Admin: alle der Firma, sonst nur als Team-Mitglied) |
| POST | `/api/assessments` | Assessor | anlegen; Stammdaten wie FA-1.1, `methodModel` (`agile`/`classic`), `includeAi`; Anlegender wird Mitglied |
| GET | `/api/assessments/:id` | Team, Admin | Stammdaten, Team, Zuweisungen, Abteilungen, Abgaben, Quellen, eigene Rechte (`me`) |
| PATCH | `/api/assessments/:id` | Assessor | Stammdaten ändern (vollständiger Datensatz) |
| POST | `/api/assessments/:id/status` | Assessor | `{ status }`: `collecting` ⇄ `consolidating` ⇄ `released`; sonst **409** `invalid_transition` |
| DELETE | `/api/assessments/:id` | Assessor | löschen (Historie bleibt) |
| GET | `/api/assessments/:id/candidates` | Assessor | Personen, die ins Team können (keine Admins) |
| POST | `/api/assessments/:id/members` | Assessor | `{ userId }` aufnehmen |
| DELETE | `/api/assessments/:id/members/:userId` | Assessor | entfernen; sich selbst nicht (**409** `self`) |
| PUT | `/api/assessments/:id/assignments/:keyAreaId` | Assessor | `{ departmentIds: [] }` – Abteilungen eines Kernbereichs ersetzen |
| GET | `/api/assessments/:id/answers?departmentId=` | Team, Admin | Abteilungsantworten; Befragte erhalten nur die eigene Abteilung |
| PUT | `/api/assessments/:id/answers/:checkpointId` | Befragter, Assessor mit Abteilung | `{ value, version }`; `open` nimmt die Antwort zurück. Version veraltet → **409** `version_conflict` mit `current`; nicht zugewiesen → **403** `not_assigned`; abgegeben → **409** `submitted`; Status ≠ Erfassung → **409** `not_collecting`; nicht im Umfang → **404** |
| POST | `/api/assessments/:id/submission` | Befragter, Assessor mit Abteilung | eigene Abteilung abgeben |
| DELETE | `/api/assessments/:id/submissions/:departmentId` | Assessor | Abgabe wieder öffnen |
| GET | `/api/assessments/:id/comments` | Team, Admin | Kommentare mit Verfasser, Abteilung, Quelle |
| POST | `/api/assessments/:id/comments` | Assessor; Befragte in Kernbereichen ihrer Abteilung | `{ checkpointId, text (1–2000), sourceId? }`; deaktivierte Quelle → **400** |
| PATCH | `/api/assessments/:id/comments/:commentId` | Verfasser | `{ text?, sourceId? }` |
| DELETE | `/api/assessments/:id/comments/:commentId` | Verfasser, Assessor | löschen |
| GET | `/api/assessments/:id/sources` | Team, Admin | Quellen |
| POST | `/api/assessments/:id/sources` | Assessor | `{ name, role?, unit?, type? }`; gleicher Name + Rolle → **409** `duplicate` |
| PATCH | `/api/assessments/:id/sources/:sourceId` | Assessor | ändern, `active` |
| DELETE | `/api/assessments/:id/sources/:sourceId` | Assessor | nur unbenutzte; sonst **409** `in_use` |
| GET | `/api/assessments/:id/consolidation` | Assessor, Leser, Admin | je Kontrollpunkt: Abteilungsantworten, `suggestion`, `disagree`, `consolidated`; Befragte **403** |
| PUT | `/api/assessments/:id/consolidation/:checkpointId` | Assessor | `{ value, version, rationale? }`; Begründung fehlt bei Abweichung/Uneinigkeit → **400** `rationale_required` |

### Live-Aktualisierung, Duplizieren, Export/Import (Phase 5b)

| Methode | Pfad | Wer | Zweck |
|---|---|---|---|
| GET | `/api/assessments/:id/events?keyAreaId=&view=` | Team, Admin | Ereignisstrom (`text/event-stream`): `hello` (`connectionId`), `presence` (`users`), `answer`, `comment`, `consolidated`, `submission`, `assessment`. Befragte erhalten keine Antworten anderer Abteilungen und keine Zusammenführung |
| POST | `/api/assessments/:id/presence` | Team, Admin | `{ connectionId, keyAreaId, view }` – eigenen Kernbereich melden; fremde Verbindung → **404** |
| POST | `/api/assessments/:id/duplicate` | Assessor | `{ project }` – Kopie anlegen; Antwort wie beim Import |
| GET | `/api/assessments/:id/export` | Team, Admin | Exportdatei (`format: "ai-tpi-assessment"`, `schemaVersion: 1`) als Download |
| POST | `/api/assessments/import` | Assessor | Exportdatei (bis 20 MB) → **201** `{ id, project, imported, ignored }`; **400** `invalid_format`, `unsupported_version` (mit `schemaVersion`), `invalid_input` (Stammdaten) |

Die Live-Ereignisse laufen über einen Serverprozess im Speicher. Für mehrere Serverinstanzen müsste ein gemeinsamer Kanal (z. B. PostgreSQL `LISTEN/NOTIFY`) ergänzt werden.

## Auswertung (Phase 6)

| Methode | Pfad | Wer | Zweck |
|---|---|---|---|
| GET | `/api/assessments/:id/report` | Team, Admin | Stammdaten, Firma (Logo, Branche), beteiligte Abteilungen, `scores` (je Kernbereich Zählwerte, `fulfillment`, `level`, `byLevel`; gesamt `index`, `minLevel`, `medianLevel`, `progress`; `byLevel`, `byView` P/T/O, `ai`, `hasData`), konsolidierte Antworten, Kommentare, `consensusGaps` (für Befragte `null`) |
| GET | `/api/benchmark?assessmentId=` | alle | `optedOut`; `own` (gewähltes oder jüngstes freigegebenes Assessment); `groups.industry` und `groups.all` mit `n`, `enough`, `overall`/`ai`/`areas` als `{ q1, median, q3 }`, `position` (Quartil, Abweichung je Kernbereich), `overallQuartile`. Ab 5 Firmen, sonst `enough: false` ohne Werte |

Die Berechnung steckt in `packages/shared/src/score.ts` (Client und Server gleich). Bei der Freigabe legt der Server einen Schnappschuss in `assessment_score` an (Migration `0004_scores`); beim Zurücknehmen der Freigabe wird er gelöscht, bei Änderungen der konsolidierten Antworten nach der Freigabe erneuert.

## Empfehlungen (Phase 7)

| Methode | Pfad | Wer | Zweck |
|---|---|---|---|
| GET | `/api/assessments/:id/recommendations` | Team, Admin | `{ items, canEdit, members }` – Empfehlungen sortiert nach Horizont, Status (abgelehnte zuletzt) und Priorität; `members` (für Verantwortliche) nur für Assessoren |
| GET | `/api/assessments/:id/ai-modules` | Assessor | KI-Module der Firma zur Auswahl (Standard zuerst), ohne Schlüssel und Basis-URL; sonst **403** mit Grund (siehe unten) |
| POST | `/api/assessments/:id/recommendations/preview` | Assessor | `{ moduleId, lang }` – Datenschutz-Vorschau: `messages.system`/`messages.user` genau wie beim Senden, Ziel-Host, Modul; **kein** Aufruf des KI-Dienstes |
| POST | `/api/assessments/:id/recommendations/generate` | Assessor | `{ moduleId \| null, consent, lang }` – erzeugt Empfehlungen; KI-Modul ohne `consent: true` → **400** `consent_required`. Antwort `{ origin, notice, noticeDetail?, status?, created, openCount, items, canEdit, members }` |
| PATCH | `/api/assessments/:id/recommendations/:recId` | Assessor | `{ version, status?, title?, text?, nextStep?, benefit?, metric?, ownerRole?, ownerUserId?, dueDate? }`; veraltete `version` → **409** mit `current`; Verantwortliche nur aus dem Team (**400** `invalid_owner`) |

`notice`: `nothing_to_do` (keine nicht/teilweise erfüllten Kontrollpunkte) oder bei KI-Fehlern `ai_timeout`, `ai_unreachable`, `ai_auth_failed`, `ai_http_error` (mit `status`), `ai_invalid_response` (`noticeDetail`: `invalid_json`, `schema`, `unknown_checkpoint`, `empty`). In allen KI-Fehlerfällen liefert der Server die regelbasierten Empfehlungen (`origin: "rule"`).

Ohne Schreibrecht antworten `ai-modules`, `preview`, `generate` und `PATCH` mit **403** und nennen den Grund, damit die Oberfläche eine verständliche Meldung zeigen kann:

```json
{ "error": "forbidden", "reason": "role_read_only", "role": "reader" }
```

| `reason` | Wer |
|---|---|
| `admin_read_only` | Admin der Firma (Lesezugriff, S-11) |
| `role_read_only` | Befragte und Leser |
| `not_assessor` | alle anderen, z. B. Assessor ohne Schreibrecht im Assessment |

Nutzer, die nicht zum Team gehören, erhalten wie bei allen Assessment-Endpunkten **403** `forbidden` ohne `reason`.

Erwartete KI-Antwort (JSON, Code-Fences werden toleriert):

```json
{ "recommendations": [ { "horizon": "short", "checkpointIds": ["KB01.K.01"], "title": "…", "text": "…",
  "nextStep": "…", "benefit": "…", "metric": "…", "ownerRole": "…" } ] }
```

Jeder KI-Aufruf erzeugt einen Audit-Eintrag (`ai.recommendations` bzw. `ai.recommendations_failed`), Erzeugen und Änderungen einen Eintrag in der Änderungshistorie.

## Änderungshistorie

Append-only: Es gibt keine Endpunkte zum Ändern oder Löschen; ein Datenbank-Trigger weist `UPDATE`/`DELETE` ab.

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/history` | Filter `assessmentId`, `keyAreaId`, `checkpointId`, `userId`, `departmentId`, `from`, `to` (JJJJ-MM-TT), `limit` (≤ 200), `offset`; Antwort `{ total, items }` |
| GET | `/api/history/facets` | Personen und Abteilungen, die in der sichtbaren Historie vorkommen |
| GET | `/api/history.csv` | CSV (Semikolon, UTF-8 mit BOM), gleiche Filter, max. 10 000 Zeilen |

Sichtbar ist nur die eigene Firma; Nicht-Admins sehen nur Assessments, in deren Team sie sind.

## Nur für Tests

`POST /api/test/benchmark-fixture` `{ industryCode, values: number[], optIn? }` legt je Wert eine anonyme Firma der (ggf. neuen) Branche mit freigegebenem Ergebnis an (alle Kernbereiche = Wert).


Aktiv nur mit `NODE_ENV=test` **und** `TEST_ENDPOINTS=true`:

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/test/outbox?to=` | versendete Mails (`MAIL_TRANSPORT=memory`), inkl. `via` (genutzter Mailserver) |
| POST | `/api/test/expire-sessions` | `{ email }` – Sitzungen als 61 Minuten unbenutzt markieren |
| POST | `/api/test/expire-tokens` | `{ email }` – Einmal-Links ablaufen lassen |
| GET | `/api/test/fake-ollama/api/tags` | nachgebildeter Ollama-Endpunkt für den KI-Verbindungstest |
| POST | `/test-llm/:token/:szenario/chat/completions` | nachgebildeter OpenAI-kompatibler KI-Dienst (außerhalb von `/api`, da der Server ohne CSRF-Header aufruft). Szenarien `ok`, `alt`, `timeout`, `invalid_json`, `unknown_id`, `http_401`, `http_500` |
| GET | `/api/test/llm-calls/:token` | Anzahl der Aufrufe und letzte Anfrage an den nachgebildeten KI-Dienst (TC-REC-007) |

## Beispiel

```bash
# Anmelden und Cookie speichern
curl -c jar.txt -H 'X-Requested-With: ai-tpi' -H 'Content-Type: application/json' \
  -d '{"email":"anna@firma.de","password":"…"}' http://localhost:3000/api/auth/login

# Abteilung anlegen
curl -b jar.txt -H 'X-Requested-With: ai-tpi' -H 'Content-Type: application/json' \
  -d '{"name":"Qualitätssicherung"}' http://localhost:3000/api/admin/departments
```
