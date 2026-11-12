---
title: Benutzer und Abteilungen
description: Personen der eigenen Firma anlegen, einladen, ändern, sperren und löschen; Abteilungen pflegen.
sidebar:
  order: 4
---

Admin-Bereich → Reiter **Benutzer** (`/admin?tab=users`) und **Abteilungen** (`/admin?tab=departments`).

## Benutzer anlegen

1. **Name**, **E-Mail-Adresse**, **Rolle** und optional **Abteilung** eintragen.
2. **Anlegen und einladen** klicken.
3. Die Person steht mit dem Status **eingeladen** in der Liste und erhält die Einladungs-Mail (Ablauf siehe [Anmeldung und Passwort](/handbuch/anmeldung-und-passwort/#erstes-passwort-einladung)).

Prüfungen beim Anlegen:

| Prüfung | Meldung bei Verstoß |
|---|---|
| Domain der Adresse gehört zur Firma (Anzeige „Erlaubte Domain(s)“) | *Die E-Mail-Adresse gehört nicht zu einer Domain Ihrer Firma.* |
| Adresse noch nicht vergeben (Groß-/Kleinschreibung egal) | *Diese E-Mail-Adresse ist bereits vergeben.* |
| Name 2–100 Zeichen, gültiges E-Mail-Format | Feldfehler direkt am Eingabefeld |

## Benutzer verwalten

| Aktion | Wirkung |
|---|---|
| **Bearbeiten** | Name und E-Mail-Adresse ändern; die neue Adresse muss zur Firma gehören und frei sein. Bei geänderter Adresse werden laufende Sitzungen beendet, die Anmeldung erfolgt mit der neuen Adresse und dem bisherigen Passwort. |
| **Rolle** ändern | wirkt sofort |
| **Abteilung** ändern | wirkt sofort; nur aktive Abteilungen werden angeboten |
| **Deaktivieren** | Anmeldung nicht mehr möglich, laufende Sitzungen werden beendet; Daten bleiben erhalten |
| **Aktivieren** | Anmeldung wieder möglich (oder Status „eingeladen“, falls noch kein Passwort gesetzt wurde) |
| **Einladung erneut senden** | nur bei Status „eingeladen“ |
| **Anmeldelink kopieren** | Notfallweg, wenn die Einladungs-Mail nicht ankommt: kopiert die Anmeldeadresse der Firma und zeigt sie an. Mit „Passwort vergessen?“ legt die Person dort ihr erstes Passwort fest. |
| **Passwort zurücksetzen** | nach Bestätigung: altes Passwort sofort ungültig, neuer Einmal-Link |
| **Löschen** | nach Bestätigung im Dialog (Fokus liegt auf „Abbrechen“, Esc bricht ab) |

**Löschen bedeutet Pseudonymisieren:** Der Name wird zu „Gelöschter Nutzer #…“, die E-Mail-Adresse wird entfernt, die Anmeldung ist nicht mehr möglich. Antworten, Kommentare und Historie bleiben nachvollziehbar erhalten.

Wird ein **Admin** gelöscht, erhalten die übrigen Admins der Firma eine Hinweis-Mail.

:::note[Schutzregeln]
Die eigene Zeile hat keine Lösch- und Deaktivieren-Schaltfläche. Den **letzten aktiven Admin** der Firma kann niemand löschen, deaktivieren oder herabstufen.
:::

## Externe Berater

Adressen mit dem Präfix `ext.` (auch `EXT.`, `Ext.`) werden automatisch als **Extern** gekennzeichnet. Sie müssen ebenfalls zu einer Domain der Firma gehören.

## Abteilungen

Abteilungen beantworten die Fragen später getrennt; der Assessor führt die Antworten zusammen.

| Aktion | Regel |
|---|---|
| Anlegen | Name 2–80 Zeichen, je Firma eindeutig (Groß-/Kleinschreibung egal) |
| Umbenennen | jederzeit |
| Deaktivieren | wird für neue Zuordnungen nicht mehr angeboten; bestehende Zuordnungen bleiben |
| Löschen | nur, wenn **keine** Person mehr zugeordnet ist, sonst zuerst umhängen oder deaktivieren |

Die Liste zeigt je Abteilung die Zahl der zugeordneten Personen.
