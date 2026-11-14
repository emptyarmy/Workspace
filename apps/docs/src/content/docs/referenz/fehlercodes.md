---
title: Fehlercodes
description: Bedeutung aller Fehlercodes der REST-Schnittstelle und die zugehörige Meldung in der Oberfläche.
sidebar:
  order: 3
---

| Code | HTTP | Bedeutung |
|---|---|---|
| `csrf` | 403 | Header `X-Requested-With: ai-tpi` fehlt |
| `unauthenticated` | 401 | nicht angemeldet oder Sitzung abgelaufen |
| `forbidden` | 403 | Rolle reicht nicht aus |
| `not_found` | 404 | nicht vorhanden **oder** gehört zu einer anderen Firma |
| `invalid_input` | 400 | Eingaben ungültig; `fields` nennt die betroffenen Felder |
| `db_unavailable` | 503 | Datenbank nicht erreichbar |
| `internal_error` | 500 | unerwarteter Fehler (Details nur im Server-Protokoll) |
| `conflict` | 409 | allgemeiner Eindeutigkeitskonflikt in der Datenbank |

## Anmeldung und Passwort

| Code | HTTP | Bedeutung |
|---|---|---|
| `invalid_credentials` | 401 | E-Mail oder Passwort falsch (bewusst nicht unterschieden) |
| `locked` | 429 | nach 5 Fehlversuchen 15 Minuten gesperrt |
| `invalid_token` | 400 | Einmal-Link abgelaufen, verwendet oder manipuliert |
| `password_policy` | 400 | Regeln nicht erfüllt oder Stärke unter „mittel“; `rules` und `strength` in der Antwort |
| `password_mismatch` | 400 | Wiederholung stimmt nicht überein |
| `password_reused` | 400 | neues Passwort entspricht dem bisherigen |
| `domain_blocked` | 400 | Freemail-Domain bei der Ersteinrichtung |

## Benutzer und Firmen

| Code | HTTP | Bedeutung |
|---|---|---|
| `email_domain` | 400 | E-Mail-Domain gehört nicht zur Firma |
| `email_taken` | 409 | E-Mail-Adresse bereits vergeben |
| `self_protection` | 400 | eigenes Konto löschen, deaktivieren oder herabstufen |
| `last_admin` | 409 | letzter aktiver Admin einer Firma |
| `user_inactive` | 409 | Aktion bei inaktivem Konto nicht möglich |
| `slug_taken` | 409 | Firmenkürzel vergeben |
| `own_company` | 400 | Funktion ist für andere Firmen gedacht, Adresse/Firma ist die eigene |
| `reset_limit` | 429 | Tageslimit (3) für firmenübergreifende Resets erreicht |
| `domain_invalid` / `domain_blocked` / `domain_taken` | 400 / 400 / 409 | Domain ungültig / Freemail / einer anderen Firma zugeordnet |
| `domain_in_use` / `last_domain` | 409 | Domain hat noch Nutzer / letzte Domain der Firma |

## Konfiguration

| Code | HTTP | Bedeutung |
|---|---|---|
| `name_taken` | 409 | Abteilung bzw. KI-Modul mit diesem Namen existiert |
| `department_in_use` | 409 | Abteilung hat noch Nutzer |
| `default_required` | 409 | Standard-KI-Modul kann nicht abgewählt werden |
| `mail_failed` | 502 | Test-Mail konnte nicht versendet werden |
| `code_taken` | 409 | Branchencode vergeben |
| `name_de_taken` / `name_en_taken` | 409 | Branchenbezeichnung (DE/EN) vergeben |
| `industry_in_use` | 409 | Branche ist einer Firma zugeordnet |
| `standard_industry` | 409 | Standardbranche kann nicht gelöscht werden |

## Erfassung (Phase 5)

| Code | HTTP | Bedeutung |
|---|---|---|
| `forbidden` | 403 | eigene Firma, aber nicht im Team des Assessments – oder Rolle reicht nicht (z. B. Befragter in der Zusammenführung) |
| `invalid_transition` | 409 | Statuswechsel nicht erlaubt (nur Erfassung ⇄ Zusammenführung ⇄ Freigegeben) |
| `self` | 409 | Assessor will sich selbst aus dem Team entfernen |
| `version_conflict` | 409 | Antwort wurde inzwischen geändert; `current` enthält den aktuellen Stand |
| `not_assigned` | 403 | Kernbereich ist der eigenen Abteilung nicht zugewiesen |
| `submitted` | 409 | Abteilung hat bereits abgegeben |
| `not_collecting` | 409 | Assessment ist nicht im Status „Erfassung“ |
| `duplicate` | 409 | Quelle mit gleichem Namen und gleicher Rolle existiert |
| `in_use` | 409 | Quelle wird in Kommentaren verwendet – deaktivieren statt löschen |
| `rationale_required` | 400 | Begründung fehlt (Abweichung vom Vorschlag oder uneinige Abteilungen); `suggestion` in der Antwort |
| `invalid_format` | 400 | Importdatei ist keine AI_TPI-Exportdatei oder hat einen ungültigen Aufbau |
| `unsupported_version` | 400 | Importdatei hat eine unbekannte `schemaVersion` (steht in der Antwort) |
