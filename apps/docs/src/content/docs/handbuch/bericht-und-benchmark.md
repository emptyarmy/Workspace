---
title: Bericht und Benchmark
description: Auswertung eines Assessments – Kennzahlen, Reifegradmatrix, Diagramme, Konsenslücken, Druck/PDF – und der anonyme Vergleich mit anderen Firmen.
sidebar:
  order: 3.6
---

## Bericht öffnen

Im Assessment auf **Bericht** klicken. Den Bericht sehen alle Team-Mitglieder und die Admins der Firma. Grundlage sind **nur die konsolidierten Antworten** aus der [Zusammenführung](/handbuch/assessments-und-fragebogen/#zusammenführung). Solange noch keine festgelegt ist, erscheint „Noch keine Daten“. Vor der Freigabe ist der Bericht als **vorläufig** gekennzeichnet.

## Aufbau

| Abschnitt | Inhalt |
|---|---|
| **Deckblatt** | Firmenlogo, Firma, Branche, Projekt, Assessor, beteiligte Abteilungen, Zeitraum, Status, Vorgehensmodell, Katalogversion |
| **Management Summary** | Gesamtindex, KI-Index, niedrigste und mittlere erreichte Ebene, Fortschritt, Anzahl erfüllt / teilweise / nicht erfüllt / n. a., je drei Stärken und Handlungsfelder |
| **Reifegradmatrix** | Kernbereiche × Ebenen, ein farbiges Feld je Kontrollpunkt. **Antippen** zeigt Text, Antwort, Begründung und Kommentare. Rechts die erreichte Ebene. |
| **Erfüllungsgrad je Kernbereich** | Netzdiagramm, darunter als Tabelle aufklappbar |
| **Antworten nach Ebene und Sicht** | Balken gesamt, je Ebene und je Sicht Professional / Team / Organization – wie im Excel-Tool |
| **Erreichte Ebene je Kernbereich** | Treppe mit drei Stufen |
| **KI-Reifegrad** | KI-Index und Netz der KI-Kernbereiche KB17–KB19 |
| **Benchmark** | Vergleich mit Branche und allen Firmen (siehe unten) |
| **Konsenslücken** | Kontrollpunkte, bei denen die Abteilungen unterschiedlich geantwortet haben. Befragte sehen diesen Abschnitt nicht, weil er Antworten anderer Abteilungen zeigt. |
| **Maßnahmenplan** | Angenommene, begonnene und erledigte [Empfehlungen](/handbuch/empfehlungen/) mit Horizont, Kontrollpunkten, Status, Verantwortlichen und Termin |
| **Anhang** | Alle Kontrollpunkte mit Antwort, Begründung und Kommentaren sowie die Berechnungsregeln |

Farben: **Erfüllt** grün ✔, **Teilweise** gelb ◐, **Nicht erfüllt** rot ✖, **Nicht anwendbar** grau schraffiert –, **Offen** weiß mit gestricheltem Rahmen.

## Wie gerechnet wird

| Kennzahl | Regel |
|---|---|
| **Erreichte Ebene** je Kernbereich | Höchste Ebene, bis zu der **alle** anwendbaren Kontrollpunkte dieser und der darunter liegenden Ebenen erfüllt sind (TPI NEXT). „Teilweise“ und „offen“ zählen nicht als erfüllt, „nicht anwendbar“ zählt nicht mit. Sind alle Kontrollpunkte eines Kernbereichs n. a., steht dort „n. a.“. |
| **Erfüllungsgrad** | (erfüllt + 0,5 × teilweise) ÷ (Kontrollpunkte − nicht anwendbar) × 100. Ohne anwendbare Kontrollpunkte gibt es keinen Wert. |
| **Gesamtindex** | Mittelwert der Erfüllungsgrade aller Kernbereiche (gleich gewichtet). |
| **Niedrigste / mittlere erreichte Ebene** | Strengste bzw. mittlere Einstufung über alle Kernbereiche; bei gerader Anzahl die niedrigere der beiden mittleren. |
| **KI-Index** | Erfüllungsgrad über die KI-Kernbereiche und alle mit „KI“ markierten Kontrollpunkte. |
| **Fortschritt** | Anteil der Kontrollpunkte mit konsolidierter Antwort. |

Beim Vorgehensmodell „klassisch“ zählen die agilen Kontrollpunkte nicht mit, ohne KI die KI-Kontrollpunkte nicht.

## Drucken und PDF

**Drucken / PDF** öffnet den Druckdialog des Browsers; dort „Als PDF sichern“ wählen. Die Druckansicht ist für A4 quer eingerichtet, blendet Kopfzeile und Schaltflächen aus und beginnt jeden Abschnitt auf einer neuen Seite. Damit die Farben der Matrix erscheinen, im Druckdialog ggf. „Hintergrundgrafiken“ einschalten.

## Benchmark

Erreichbar über **Benchmark** in der Kopfzeile (alle Rollen) und als Abschnitt im Bericht.

| Element | Inhalt |
|---|---|
| **Branche / Alle Firmen** | Anzahl der Vergleichsfirmen, Lage der eigenen Firma („im oberen 25 %-Bereich der Branche“), Gesamtindex als Median mit Q1–Q3 |
| **Netzdiagramm** | Eigene Firma, Branchen-Median, Median aller Firmen je Kernbereich |
| **Tabelle** | Je Kernbereich: eigener Wert, Branchen-Median mit Q1–Q3, Abweichung ▲▼, Quartil, Median aller Firmen |
| **KI-Index im Vergleich** | eigene Firma · Branche · alle |

Regeln für Anonymität und Aussagekraft:

- In den Vergleich fließt je Firma nur das **jüngste freigegebene** Assessment ein. Bei der **Freigabe** werden die Kennzahlen festgehalten; wird die Freigabe zurückgenommen, fällt das Assessment wieder heraus.
- Eine Vergleichsgruppe wird erst ab **5 Firmen** gezeigt, sonst „Zu wenige Vergleichsdaten“. Das gilt auch je Kernbereich.
- Angezeigt werden nur **Median und Quartile** – keine Firmennamen, keine Einzelwerte, kein Minimum oder Maximum.
- **Opt-out:** Unter *Admin-Bereich → Meine Firma* lässt sich die Teilnahme abschalten. Die Firma fließt dann nicht in den Vergleich ein und sieht selbst keinen Benchmark.

Im Bericht vergleicht der Benchmark die Werte **dieses** Assessments, auch vor der Freigabe. Die Seite *Benchmark* zeigt das jüngste freigegebene Assessment der Firma.
