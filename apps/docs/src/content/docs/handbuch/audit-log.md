---
title: Audit-Log
description: Sicherheitsrelevante Ereignisse der eigenen Firma filtern und als CSV exportieren.
sidebar:
  order: 8
---

Admin-Bereich → Reiter **Audit-Log** (`/admin?tab=audit`).

Das Audit-Log zeigt sicherheitsrelevante Ereignisse **Ihrer Firma**, neueste zuerst: Anmeldungen und Fehlversuche, Sperren, Einmal-Links, Änderungen an Benutzern, Abteilungen, Domains, Branchen, E-Mail- und KI-Einstellungen.

**Aktionen von Admins anderer Firmen**, die Ihre Firma betreffen (z. B. ein neuer Admin für Ihre Firma oder ein Passwort-Reset), erscheinen ebenfalls. Sie sind mit **Andere Firma** gekennzeichnet und nennen die handelnde Person mit ihrer Firma.

## Filtern

| Filter | Beispiel |
|---|---|
| Aktion enthält | `password`, `user`, `department`, `industry`, `cross` |
| Von / Bis | Zeitraum; ein Startdatum nach dem Enddatum wird abgewiesen |

Die Liste zeigt 25 Einträge je Seite (**Zurück** / **Weiter**).

## CSV-Export

**Als CSV exportieren** lädt die gefilterten Einträge (bis 5000) als `audit-log-JJJJ-MM-TT.csv` herunter:

- Trennzeichen `;` und UTF-8 mit BOM, öffnet direkt korrekt in Excel
- Spalten: Zeitpunkt (UTC), Aktion, handelnde Person, E-Mail, Firma, Objekt, Objekt-ID, Details, IP
- Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden entschärft, damit Excel sie nicht als Formel ausführt

:::note
Die fachliche **Änderungshistorie** (Antworten, Zusammenführungen, Kommentare) folgt mit den Assessments und wird dann für alle Rollen lesbar.
:::
