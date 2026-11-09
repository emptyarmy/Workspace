---
title: Andere Firmen
description: Admins für neue oder bestehende Firmen anlegen, selbst angelegte Admins verwalten und Passwörter firmenübergreifend zurücksetzen.
sidebar:
  order: 6
---

Admin-Bereich → Reiter **Andere Firmen** (`/admin?tab=cross`).

Von anderen Firmen sehen Sie nur **Name und Kürzel**, keine Nutzerlisten und keine Ergebnisse.

## Admin für eine neue Firma anlegen

1. **Firma:** Name, Kürzel (wird vorgeschlagen), E-Mail-Domain(s) durch Komma getrennt, Branche, optional Logo-URL.
2. **Admin der neuen Firma:** Name und E-Mail-Adresse. Die Domain der Adresse wird als Firmen-Domain vorgeschlagen.
3. **Firma anlegen und Admin einladen.** Der neue Admin erhält eine Einladung mit der Anmeldeadresse seiner Firma und verwaltet sie danach selbst.

Abgewiesen werden: Freemail-Domains, Domains anderer Firmen, ein bereits vergebenes Kürzel und eine Admin-Adresse, die nicht zu den angegebenen Domains passt.

## Admin für eine bestehende Firma anlegen

Firma auswählen, Name und E-Mail-Adresse eintragen. Die Adresse muss zu einer Domain **dieser** Firma gehören. Die Admins der Firma erhalten eine **Hinweis-Mail**.

## Von mir angelegte Admins

Hier stehen alle Konten anderer Firmen, die **Sie** angelegt haben. Möglich ist:

| Aktion | Hinweis |
|---|---|
| Rolle ändern | nur auf **Assessor, Befragter oder Leser**. Zurück zur Rolle Admin geht nur durch einen Admin der eigenen Firma der Person. |
| Aktivieren / Deaktivieren | nicht beim letzten aktiven Admin der Firma |
| Einladung erneut senden | bei Status „eingeladen“ |
| Passwort zurücksetzen | zählt zum Tageslimit (siehe unten) |

**Nicht** möglich: Name oder E-Mail ändern und löschen. Admins löschen dürfen nur Admins derselben Firma.

Bei jeder Änderung werden die Admins der betroffenen Firma per Mail informiert: wer (Name, E-Mail, Firma), was, wann und wen es betrifft.

## Passwort für Nutzer einer anderen Firma

1. **Vollständige E-Mail-Adresse** eingeben. Eine Liste oder Suche gibt es aus Datenschutzgründen nicht.
2. Im Dialog bestätigen.
3. Es erscheint immer dieselbe Meldung, egal ob die Adresse existiert.

Gibt es die Adresse, wird das Passwort sofort ungültig, die Person erhält einen neuen Einmal-Link und die Admins ihrer Firma werden informiert.

| Regel | Wert |
|---|---|
| Tageslimit | **3 firmenübergreifende Zurücksetzungen je Admin und Kalendertag**; auch unbekannte Adressen zählen. Die Anzeige zeigt die verbleibende Anzahl. |
| Adressen der eigenen Firma | abgewiesen, dafür gibt es die Benutzerliste |
| Protokoll | jeder Versuch steht im Audit-Log beider Firmen |
