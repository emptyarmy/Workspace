---
title: Rollen und Rechte
description: Die vier Rollen Admin, Assessor, Befragter und Leser und was sie jeweils dürfen.
sidebar:
  order: 1
---

Jede Person (E-Mail-Adresse) hat **genau eine** Rolle. Die Rolle vergibt ein Admin der eigenen Firma, ein Wechsel wirkt sofort.

| Rolle | Aufgabe |
|---|---|
| **Admin** | Verwaltet die eigene Firma: Benutzer, Abteilungen, Domains, Logo, Branche, E-Mail- und KI-Einstellungen. Kann Admins für andere Firmen anlegen und Passwörter zurücksetzen. Liest die Ergebnisse der eigenen Firma, erfasst aber selbst keine Antworten. |
| **Assessor** | Legt Assessments an, weist Kernbereiche Abteilungen zu, führt die Antworten der Abteilungen zusammen, wählt das KI-Modul und gibt Empfehlungen und Bericht frei. *(ab Phase 5)* |
| **Befragter** | Beantwortet die Fragen für die **eigene Abteilung** und kommentiert. *(ab Phase 5)* |
| **Leser** | Liest Bericht, Benchmark, Empfehlungen und Änderungshistorie. |

## Rechte im Detail

| Aktion | Admin | Assessor | Befragter | Leser |
|---|:-:|:-:|:-:|:-:|
| Admin-Bereich | ✔ | – | – | – |
| Passwort zurücksetzen (eigene Firma) | ✔ | – | – | – |
| Passwort zurücksetzen (andere Firma, nur per E-Mail-Adresse, max. 3/Tag) | ✔ | – | – | – |
| Admins für andere Firmen anlegen | ✔ | – | – | – |
| Admins löschen (nur eigene Firma) | ✔ | – | – | – |
| KI-Modul für Empfehlungen wählen | ✔ | ✔ | – | – |
| Antworten der eigenen Abteilung erfassen | – | ✔ | ✔ | – |
| Antworten zusammenführen, freigeben | – | ✔ | – | – |
| Bericht und Empfehlungen der **eigenen** Firma lesen | ✔ | ✔ | ✔ | ✔ |
| Ergebnisse **anderer** Firmen | – | – | – | – |
| Aggregierter Benchmark (Firma vs. Branche vs. alle) | ✔ | ✔ | ✔ | ✔ |

## Grundregeln, die überall gelten

- **Firmentrennung:** Daten anderer Firmen sind für niemanden sichtbar. Wer eine fremde ID aufruft, bekommt „nicht gefunden“ (404), nicht „verboten“. So wird nicht einmal verraten, ob es den Datensatz gibt.
- **E-Mail-Domain:** Alle Personen einer Firma brauchen eine Adresse mit einer der [zugelassenen Domains](/handbuch/meine-firma-und-branchen/#e-mail-domains) der Firma.
- **Externe Berater** erhalten von ihrer Firma eine interne Adresse mit dem Präfix `ext.` (z. B. `ext.max.mustermann@firma.de`). AI_TPI erkennt das Präfix und zeigt das Kennzeichen **„Extern“**. Eine manuelle Einstellung dafür gibt es nicht.
- **Schutz vor Aussperren:** Niemand kann sich selbst löschen, deaktivieren oder herabstufen. Der **letzte aktive Admin** einer Firma bleibt immer erhalten.

Fachliche Grundlage: [Admin-Bereich (Konzept)](/projekt/architektur/admin-bereich/).
