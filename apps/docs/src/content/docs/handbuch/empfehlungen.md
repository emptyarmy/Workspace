---
title: Handlungsempfehlungen und Maßnahmenplan
description: Empfehlungen aus den nicht erfüllten Kontrollpunkten erzeugen – regelbasiert oder mit einem KI-Modul –, prüfen, annehmen und als Maßnahmenplan verfolgen.
sidebar:
  order: 3.7
---

## Empfehlungen öffnen

Im Assessment auf **Empfehlungen** klicken (`/assessments/<id>/empfehlungen`). Alle Team-Mitglieder und die Admins der Firma können die Empfehlungen lesen. **Erzeugen und bearbeiten** dürfen nur die Assessoren des Assessments; Admins haben – wie beim Bericht – nur Lesezugriff.

Wer nur lesen darf, sieht keine Schaltflächen zum Erzeugen oder Bearbeiten, sondern einen Hinweis; Admins werden zusätzlich auf die [KI-Konfiguration](/handbuch/e-mail-und-ki/#ki-module) verwiesen, wo sie das Standardmodul festlegen.

Grundlage sind die **konsolidierten Antworten** aus der [Zusammenführung](/handbuch/assessments-und-fragebogen/#zusammenführung). Kontrollpunkte, die dort noch offen sind, fließen nicht ein; die Seite weist darauf hin.

## Erzeugen

1. **KI-Modul** wählen. Vorbelegt ist das Standardmodul der Firma (festgelegt im Admin-Bereich unter [KI-Konfiguration](/handbuch/e-mail-und-ki/#ki-module)). **Nur Regeln (ohne KI)** sendet keine Daten nach außen.
2. **Empfehlungen erzeugen** klicken.
3. Bei einem KI-Modul erscheint zuerst der Dialog **„Daten an den KI-Dienst senden?“** mit Modul, Modell, Ziel-Adresse und einer **Vorschau genau der Daten**, die gesendet werden. Firmen- und Projektname sowie Personen werden nicht übertragen. Kommentare gehen nur mit, wenn das Modul es erlaubt; mit Pseudonymisierung werden Namen und E-Mail-Adressen durch `[Person]` und `[E-Mail]` ersetzt.
   - **Abbrechen – nichts senden**: Es findet kein Aufruf statt.
   - **Zustimmen und senden**: Der Server ruft den KI-Dienst auf.

Erneutes Erzeugen ersetzt nur die Empfehlungen im Status **Vorgeschlagen**. Angenommene, begonnene, erledigte und abgelehnte Empfehlungen bleiben erhalten und werden nicht doppelt vorgeschlagen.

### Wie die Regel-Engine priorisiert

| Schritt | Regel |
|---|---|
| Kandidaten | Kontrollpunkte mit **Nicht erfüllt** oder **Teilweise erfüllt** |
| 1 | Zuerst die **nächsthöhere, noch nicht erreichte Ebene** des Kernbereichs (Fundament vor Kür) |
| 2 | Niedriger **Cluster**-Buchstabe (Agile TPI, A vor B …) |
| 3 | Kontrollpunkte, von denen andere abhängen |
| 4 | Kernbereich mit dem größten Abstand zum **Branchen-Median** (wenn der Benchmark genug Firmen hat), sonst mit dem niedrigsten Erfüllungsgrad |
| 5 | Geringerer Aufwand zuerst (Quick Wins) |

| Aufwand des Kontrollpunkts | Horizont |
|---|---|
| S | **kurzfristig** (< 1 Monat) |
| M, L | **langfristig** (≥ 1 Monat) |
| M und „teilweise erfüllt“ | aufgeteilt: kurzfristig **Erster Schritt**, langfristig **Vollständige Umsetzung** |

Kontrollpunkte desselben Kernbereichs und derselben Ebene werden zu einer Empfehlung gebündelt. Es gibt höchstens **10 kurzfristige und 10 langfristige** Empfehlungen.

### Mit KI

Die KI erhält die priorisierten Kandidaten und formuliert daraus konkrete Empfehlungen mit **nächstem Schritt, Nutzen, Messgröße und verantwortlicher Rolle**. KI-Empfehlungen sind gekennzeichnet mit **„KI-generiert (Modul · Modell, Datum)“**; unter **Ursprünglicher Regeltext** steht der Textbaustein aus dem Katalog.

Der Server prüft jede KI-Antwort: Sie muss gültiges JSON im vorgegebenen Format sein und darf nur Kontrollpunkte aus der Kandidatenliste nennen. Andernfalls wird sie verworfen.

| Meldung | Bedeutung | Was tun? |
|---|---|---|
| *Der KI-Dienst hat nicht rechtzeitig geantwortet.* | Zeitlimit des Moduls überschritten | Timeout im Modul erhöhen oder später erneut versuchen |
| *Der KI-Dienst ist nicht erreichbar.* | Adresse falsch oder Dienst aus | Basis-URL und Dienst prüfen, **Verbindung testen** |
| *… hat die Anmeldung abgelehnt (HTTP 401).* | API-Schlüssel falsch oder abgelaufen | Schlüssel in der KI-Konfiguration erneuern |
| *… meldet einen Fehler (HTTP 500).* | Störung beim Anbieter | später erneut versuchen |
| *Die Antwort … war unbrauchbar …* | kein gültiges JSON oder unbekannte Kontrollpunkte | anderes Modell bzw. Prompt-Vorlage prüfen |

In all diesen Fällen zeigt die Seite **stattdessen die regelbasierten Empfehlungen**. Jeder KI-Aufruf steht im [Audit-Log](/handbuch/audit-log/).

### Keine Handlungsfelder

Sind alle bewerteten Kontrollpunkte erfüllt (oder nicht anwendbar), erscheint **„Keine Handlungsfelder“** mit Tipps, z. B. das Assessment regelmäßig zu wiederholen oder den Umfang zu erweitern.

## Maßnahmenplan

Jede Empfehlung hat (für Assessoren) diese Felder; Änderungen werden sofort gespeichert:

| Feld | Werte |
|---|---|
| **Status** | Vorgeschlagen, Angenommen, In Arbeit, Erledigt, Abgelehnt – oder die Schaltflächen **Annehmen** / **Ablehnen** |
| **Verantwortlich** | ein Mitglied des Assessment-Teams |
| **Termin** | Datum |
| **Bearbeiten** | Titel und Beschreibung anpassen; die Empfehlung wird als *bearbeitet* markiert, der Regeltext bleibt einsehbar |

Über **Anzeigen → Maßnahmenplan** sind nur angenommene, begonnene und erledigte Empfehlungen zu sehen. Derselbe Plan steht im [Bericht](/handbuch/bericht-und-benchmark/) im Abschnitt **Maßnahmenplan** (auch im Ausdruck).

Ändert jemand anderes dieselbe Empfehlung gleichzeitig, erscheint ein Hinweis und die aktuelle Fassung wird geladen. Annehmen, Ablehnen und alle Änderungen stehen in der [Änderungshistorie](/handbuch/assessments-und-fragebogen/).

## Meldungen „Keine Berechtigung“

Werden einem Nutzer die Rechte entzogen, während er die Seite offen hat (z. B. Rolle geändert oder aus dem Team entfernt), lehnt der Server das Erzeugen oder Speichern ab. Die Seite zeigt dann den Grund, lädt die Liste neu und blendet die Bearbeitungselemente aus. Nichts wird geändert.

| Meldung | Bedeutung | Was tun? |
|---|---|---|
| *Keine Berechtigung: Admins haben auf Empfehlungen nur Lesezugriff …* | Admins dürfen Ergebnisse der eigenen Firma nur lesen (S-11) | Einen Assessor des Assessments bitten; das Standard-KI-Modul im Admin-Bereich festlegen |
| *Keine Berechtigung: Mit der Rolle „Leser“ (bzw. „Befragter“) können Sie Empfehlungen nur lesen …* | Die Rolle erlaubt nur Lesen | Ein Admin kann die Rolle auf Assessor ändern |
| *Keine Berechtigung: Nur Assessoren, die zum Team dieses Assessments gehören …* | Kein Schreibrecht in diesem Assessment | Den Assessor bitten, Sie ins Team aufzunehmen |
| *Keine Verbindung zum Server …* | Server oder Netzwerk nicht erreichbar | Verbindung prüfen, erneut versuchen |
| *Die Empfehlung wurde inzwischen von jemand anderem geändert …* | Gleichzeitige Änderung | Die aktuelle Fassung ist geladen; Änderung erneut vornehmen |
