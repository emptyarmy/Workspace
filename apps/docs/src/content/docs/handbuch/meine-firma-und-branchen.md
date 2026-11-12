---
title: Meine Firma und Branchen
description: Firmendaten, Logo, E-Mail-Domains, Benchmark-Teilnahme und die gemeinsame Branchenliste pflegen.
sidebar:
  order: 5
---

## Meine Firma

Admin-Bereich → Reiter **Meine Firma** (`/admin?tab=company`).

| Feld | Hinweis |
|---|---|
| Firmenkürzel / Anmeldeadresse | nur Anzeige; die Anmeldeadresse `/login/<kürzel>` geben Sie an Ihre Nutzer weiter |
| Firmenname | 2–120 Zeichen |
| Branche | Grundlage des Branchenvergleichs im Benchmark |
| Logo-URL | **nur `https://`**; `http:`, `ftp:`, `data:` und `javascript:` werden abgewiesen. Die Vorschau zeigt das Logo sofort; ist es nicht erreichbar, erscheint ein neutrales Ersatzlogo. |
| Alternativtext | für Screenreader |
| Benchmark-Teilnahme | Ergebnisse fließen nur anonym und aggregiert in Branchenvergleiche ein; abschaltbar |

Das Logo erscheint auf der Anmeldeseite Ihrer Firma und nach der Anmeldung in der Kopfzeile.

### E-Mail-Domains

Alle Personen der Firma brauchen eine Adresse mit einer dieser Domains. Subdomains (`mail.firma.de`) gelten nur, wenn sie ausdrücklich eingetragen sind.

| Aktion | Regel |
|---|---|
| Hinzufügen | gültiges Format; keine Freemail-Domain; nicht bereits einer anderen Firma zugeordnet. Großbuchstaben werden klein gespeichert. |
| Entfernen | nicht, solange Personen eine Adresse mit dieser Domain haben; die **letzte** Domain bleibt immer |

## Branchen

Admin-Bereich → Reiter **Branchen** (`/admin?tab=industries`).

:::caution[Gilt für alle Firmen]
Die Branchenliste ist **gemeinsam** für alle Firmen, weil der Benchmark Firmen derselben Branche vergleicht. Jede Änderung wirkt deshalb für alle. Welche oder wie viele Firmen eine Branche nutzen, wird bewusst nicht angezeigt.
:::

Die Standardliste umfasst 25 Branchen in Anlehnung an WZ 2008 / NACE Rev. 2 (siehe [Mandanten und Benchmark](/projekt/architektur/mandanten-und-benchmark/#4-branchenliste-vorschlag)).

| Aktion | Regel |
|---|---|
| Hinzufügen | **Code** 2–5 Zeichen, Großbuchstaben und Ziffern, beginnt mit einem Buchstaben (z. B. `GAM`); **Bezeichnung** Deutsch und Englisch je 2–80 Zeichen und je Sprache eindeutig; NACE-Bezug optional |
| Suchen | nach Code, Bezeichnung oder NACE |
| Bearbeiten | Bezeichnungen und NACE-Bezug, auch bei Standardbranchen; der Code bleibt unveränderlich |
| Deaktivieren | nicht, solange eine Firma die Branche nutzt; deaktivierte Branchen erscheinen in keiner Auswahl mehr |
| Löschen | nur selbst ergänzte Branchen, die keine Firma nutzt; Standardbranchen nur deaktivieren |

Kennzeichen in der Liste: **Standard**, **Ergänzt**, **inaktiv** und **Ihre Firma**.
