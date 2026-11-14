# Admin-Bereich (Version 2)

Grundlage: Antworten zu F-04, F-07, N-01, N-03, N-05, N-11, R-02.

> **Reichweite (R-02):** Jeder Admin verwaltet **nur seine eigene Firma**. Alle Funktionen unten beziehen sich auf die Firma des angemeldeten Admins. Ausnahmen: **„Admin für andere Firma anlegen“** (neue oder bestehende Firma) und die Verwaltung der **selbst angelegten Admins** (siehe `08_mandanten-und-benchmark.md`, Abschnitt 2).

## 1. Rollenmodell (festgelegt, N-02 / R-08)

Jedem Nutzer (E-Mail-Adresse) ist **genau eine** Rolle zugewiesen:

| Rolle | Rechte |
|---|---|
| **Admin** | **Verwaltung**: Admin-Bereich (Nutzer, Firma, Abteilungen, KI, Mail), Rollen vergeben, Passwörter zurücksetzen (auch firmenübergreifend), KI-Modell auswählen. **Eigene Firma:** darf die **Ergebnisse der Befragung lesen** (S-11). **Andere Firmen:** sieht **keine Ergebnisse**, nur aggregierte Benchmark-Daten (S-06). Erfasst und führt keine Antworten zusammen. |
| **Assessor** | Assessments anlegen und Mitglieder verwalten, Kernbereiche Abteilungen zuweisen, alle Antworten einsehen, **Antworten der Abteilungen zusammenführen**, **KI-Modell auswählen** und Empfehlungen erzeugen/freigeben, Assessment freigeben, Bericht |
| **Befragter** | Antworten **für die eigene Abteilung** in zugewiesenen Kernbereichen erfassen, abgeben und kommentieren; Bericht lesen |
| **Leser** | nur lesen: Bericht, Benchmark, Empfehlungen, Änderungshistorie |

Rechtematrix (Auszug):

| Aktion | Admin | Assessor | Befragter | Leser |
|---|:-:|:-:|:-:|:-:|
| Admin-Bereich (außer Historie) | ✔ | – | – | – |
| Passwort zurücksetzen – eigene Firma (alle Nutzer und Admins) | ✔ | – | – | – |
| Passwort zurücksetzen – andere Firmen (Nutzer und Admins) | ✔ (mit Benachrichtigung, S-10) | – | – | – |
| Admins löschen | ✔ (nur eigene Firma, S-13) | – | – | – |
| Änderungshistorie lesen | ✔ (eigene Firma; S-12) | ✔ | ✔ | ✔ |
| Assessment anlegen / Kernbereiche zuweisen | – | ✔ | – | – |
| Abteilungsantworten erfassen | – | ✔ | ✔ (eigene Abteilung) | – |
| Kommentieren | – | ✔ | ✔ | – |
| Zusammenführen / freigeben | – | ✔ | – | – |
| KI-Modell für Empfehlungen auswählen | ✔ | ✔ | – | – |
| Empfehlungen erzeugen und bearbeiten | – | ✔ | – | – |
| Bericht (Antworten, Matrix, Kommentare) und Empfehlungen lesen – **eigene Firma** | ✔ (S-11) | ✔ | ✔ | ✔ |
| Ergebnisse **anderer** Firmen | – | – | – | – |
| **Aggregierter Benchmark** (Firma vs. Branche vs. alle) | ✔ | ✔ | ✔ | ✔ |

Offen bleibt, ob Leser kommentieren dürfen. Vorschlag: nein (R-15).

**Hinweis S-06/S-11:** Admins haben **Lesezugriff** auf die Ergebnisse der **eigenen** Firma; Schreibzugriff auf Antworten, Zusammenführung und Empfehlungen haben sie nicht (403). Ergebnisse **anderer** Firmen sind für niemanden sichtbar (404); der Benchmark liefert nur aggregierte Werte.

## 2. Funktionen des Admin-Bereichs

| Reiter | Funktion | Sichtbar für |
|---|---|---|
| **Benutzer** | anlegen · Name und E-Mail ändern · Rolle (Admin / Assessor / Befragter / Leser) · Firma, Abteilung · aktiv/inaktiv · löschen (mit Bestätigungsdialog) · Einladung erneut senden · Konto entsperren · **Passwort zurücksetzen (Button)** | Admin |
| **Meine Firma** | Name, Kürzel (für Login-URL `/login/<kürzel>`), **zugelassene E-Mail-Domain(s)**, **Logo-URL** (Vorschau + Ladetest), **Branche** (Auswahlliste), Benchmark-Teilnahme | Admin |
| **Admins anderer Firmen** | (a) neue Firma (Name, Kürzel, Domain(s), Branche, optional Logo) + Admin anlegen, oder (b) für **bestehende** Firma weiteren Admin anlegen – E-Mail muss zur Domain der Firma gehören → Einladungs-Mail. Liste **„Von mir angelegte Admins“**: Rolle auf Assessor/Befragter/Leser umstellen, aktiv/inaktiv, Einladung erneut senden, **Passwort zurücksetzen** | Admin |
| **Abteilungen** | je Firma pflegen | Admin |
| **Branchen** | Branchenliste erweitern/umbenennen (Standardliste siehe `08_mandanten-und-benchmark.md`) | Admin |
| **KI-Konfiguration (je Firma)** | auswählbare KI-Module der eigenen Firma: Modus, Anbieter, Basis-URL, Modell, API-Schlüssel, Parameter, Datenschutz, Verbindungstest | Admin |
| **Passwortrichtlinie** | Mindestlänge, Zeichenklassen, Mindeststärke, Sperrparameter | Admin |
| **E-Mail (je Firma)** | Mailserver der eigenen Firma: **Betriebssystem-Standard (sendmail)** oder SMTP (Host, Port, TLS, Benutzer, Passwort, Absender); Test-Mail. Einladungen und Reset-Mails eines Nutzers laufen über den Mailserver **seiner** Firma | Admin |
| **Änderungshistorie** | alle Änderungen an Antworten, Zusammenführungen, Kommentaren, Assessments (wer, wann, was, alt → neu), filter- und exportierbar | **alle Rollen** (lesend, nur eigene Firma), N-03 |
| **Benchmark** | aggregierte Kennzahlen der eigenen Firma im Vergleich zur eigenen Branche und zu allen Branchen – **keine** Einzelantworten, Kommentare oder Empfehlungen (S-06) | alle Rollen |
| **Audit-Log** | sicherheitsrelevante Ereignisse (Login, Fehlanmeldung, Rollen- und Konfigurationsänderungen) | Admin |

Für Assessoren, Befragte und Leser zeigt der Admin-Bereich **nur** den Reiter „Änderungshistorie“. Alle anderen Reiter sind ausgeblendet und serverseitig gesperrt (HTTP 403).

## 3. Benutzerverwaltung im Detail

### 3.1 Anlegen
Pflichtfelder: Name, E-Mail (eindeutig, gültiges Format, **Domain muss zur eigenen Firma gehören**), Rolle; optional Abteilung. Die Firma ist automatisch die des Admins. Nach dem Speichern wird automatisch die **Einladungs-Mail** versendet (Ablauf siehe `06_authentifizierung-und-sicherheit.md`, Abschnitt 1). Der Status lautet „eingeladen“, bis das erste Passwort gesetzt ist.

### 3.2 Ändern
- Name und E-Mail sind änderbar. Wird die E-Mail geändert, erhält **die neue Adresse eine Bestätigungs-Mail** und die alte einen Hinweis (Schutz vor Kontoübernahme, Vorschlag R-09).
- Rollenwechsel wirkt sofort. Bestehende Sitzungen des Nutzers werden neu bewertet.
- **Aktiv/inaktiv:** Inaktive Nutzer können sich nicht anmelden; ihre Sitzungen werden sofort beendet. Ihre Antworten und Kommentare bleiben erhalten.

### 3.3 Löschen
- Klick auf „Löschen“ öffnet einen **modalen Bestätigungsdialog**: „Soll der Nutzer *Name (E-Mail)* wirklich gelöscht werden? Dieser Vorgang kann nicht rückgängig gemacht werden.“ mit den Schaltflächen **[Löschen bestätigen]** und **[Abbrechen]**.
- Schließen per Esc oder Klick außerhalb wirkt wie **Abbrechen**. Der Fokus liegt standardmäßig auf „Abbrechen“.
- Umgang mit Daten des gelöschten Nutzers (Vorschlag, R-10): Antworten, Kommentare und Historieneinträge bleiben erhalten, damit die Nachvollziehbarkeit gewahrt ist. Der Name wird durch „Gelöschter Nutzer #1234“ ersetzt (DSGVO-konforme Pseudonymisierung).

### 3.4 Passwort zurücksetzen durch Admin (S-01)
- **Eigene Firma:** Button **„Passwort zurücksetzen“** in der Nutzerliste für **alle Nutzer und Admins** (S-10).
- **Andere Firmen (S-10):** Der Admin kann Passwörter von **Nutzern und Admins anderer Firmen** zurücksetzen. Damit dabei keine fremden Nutzerverzeichnisse offengelegt werden, erfolgt das über die Funktion **„Passwort für Nutzer einer anderen Firma zurücksetzen“** mit Eingabe der **vollständigen E-Mail-Adresse** (keine Liste/Suche; S-14 festgelegt). Für unbekannte Adressen erscheint dieselbe neutrale Meldung.
- **Limit (S-15):** höchstens **3 firmenübergreifende Resets je Nutzer und Tag**; darüber hinaus wird der Reset abgewiesen und im Audit-Log vermerkt.
- Wird das Passwort eines Nutzers einer **anderen** Firma zurückgesetzt, erhalten die **Admins dieser Firma** eine Information per Mail (wer, wann, welcher Nutzer).
- Ein Bestätigungsdialog („Passwort von *Name* zurücksetzen? Der Nutzer erhält einen neuen Link per E-Mail.“) mit [Zurücksetzen] / [Abbrechen].
- Wirkung: Das alte Passwort wird **sofort ungültig**, alle Sitzungen des Nutzers werden beendet, der Nutzer erhält einen **neuen Einmal-Link** per Mail (über den Mailserver seiner Firma) und legt damit ein neues Passwort fest (Regeln + Stärkeanzeige).
- Der Admin sieht das Passwort zu keinem Zeitpunkt. Eintrag im Audit-Log.

### 3.5 Benachrichtigung von Admins (S-01)
Die Admins einer Firma erhalten eine **E-Mail**, wenn ein Admin **mit einer anderen Domain** (also aus einer anderen Firma):
- Änderungen an Nutzern ihrer Firma vornimmt (Rolle, Aktiv-Status, Passwort-Reset),
- weitere Admins für ihre Firma erstellt,
- Passwörter ihrer Nutzer oder Admins zurücksetzt (S-10).

Außerdem erhalten die **übrigen Admins einer Firma** eine Mail, wenn ein Admin ihrer Firma **gelöscht** wird. Löschen dürfen Admins nur **Admins der eigenen Firma** (S-13); Admins anderer Firmen können die von ihnen angelegten Admins nur herabstufen oder deaktivieren.

Die Mail nennt: wer (Name, E-Mail, Firma), was, wann, betroffener Nutzer. Zusätzlich gibt es einen Eintrag im Audit-Log beider Firmen.

### 3.6 Externe Berater (S-03, S-08)
- Externe erhalten eine Firmenadresse mit Präfix **`ext.`** (z. B. `ext.max.mustermann@heise.de`) und durchlaufen die normale Domain-Prüfung.
- Das System setzt automatisch `isExternal = true` und zeigt das Badge **„Extern“**; Filter „nur Externe“ in der Nutzerliste.
- Das Präfix wird case-insensitiv erkannt (`EXT.`, `Ext.`).
- **Keine manuelle Pflege in der Anwendung (S-08):** Ob jemand extern ist, ergibt sich **ausschließlich** aus der E-Mail-Adresse, die die **Mailserver-Administratoren** der Firma einrichten. In der Anwendung gibt es kein Feld „extern“.

### 3.7 Schutzregeln
- Ein Admin kann sich **nicht selbst** löschen, deaktivieren oder herabstufen.
- Der **letzte aktive Admin je Firma** kann weder gelöscht, deaktiviert noch herabgestuft werden – auch nicht durch einen Admin einer anderen Firma.
- Jede Änderung erscheint im Audit-Log.

## 4. KI-Konfiguration (je Firma, S-04, S-09)
Jede Firma hat eine **eigene** Konfiguration mit ggf. mehreren KI-Modulen. Welches Modul für eine Empfehlung genutzt wird, wählen **Assessor oder Admin** (Standardmodul vorbelegt); Empfehlungen einer Firma werden ausschließlich mit deren Einstellungen und API-Schlüssel erzeugt. Felder unverändert: Modus (regelbasiert / lokal / Cloud), Anbieter (Anthropic, OpenAI, Azure OpenAI, Ollama, LM Studio, OpenAI-kompatibel), Basis-URL, Modell, API-Schlüssel (verschlüsselt, nie wieder im Klartext angezeigt), Temperatur, max. Tokens, Timeout, Kommentare übertragen, Pseudonymisierung, Prompt-Vorlage, Verbindungstest. Alle KI-Aufrufe laufen über den Server.

## 5. Validierungen (Grundlage für Negativtests)
- E-Mail eindeutig (Groß-/Kleinschreibung ignoriert) und gültig; Name 2–100 Zeichen.
- E-Mail-Domain ∈ zugelassene Domains der Firma (auch bei E-Mail-Änderung); Subdomains nur, wenn ausdrücklich eingetragen.
- Domain: gültiges Format, nicht bereits einer anderen Firma zugeordnet, keine Freemail-Domain.
- Die letzte Domain einer Firma kann nicht entfernt werden, solange Nutzer mit dieser Domain existieren.
- Logo-URL: `https`, erreichbar, Bildtyp ≤ 1 MB; `javascript:`, `data:` und `ftp:` werden abgewiesen.
- Firmenkürzel: eindeutig, nur `a–z`, `0–9` und `-`, 2–30 Zeichen.
- Branche ist Pflicht für die Teilnahme am Benchmark.
- KI: Basis-URL Pflicht außer im Modus „regelbasiert“; Timeout 5–300 s; Temperatur 0–1.
- SMTP: Port 1–65535; Host Pflicht bei Transport „SMTP“.

## 6. Umsetzungsstand Phase 4b (09.11.2026)

Umgesetzt sind die Reiter **Benutzer**, **Abteilungen**, **Meine Firma** (inkl. Domains und Benchmark-Teilnahme), **Andere Firmen** (neue/bestehende Firma, „Von mir angelegte Admins“, Passwort-Reset per E-Mail-Adresse), **E-Mail**, **KI-Konfiguration** und **Audit-Log**. Der gewählte Reiter steht in der Adresse (`/admin?tab=ai`).

Festlegungen bei der Umsetzung:
- Selbst angelegte Admins anderer Firmen können nur auf **Assessor, Befragter oder Leser** umgestellt werden (M4); zurück zur Rolle Admin geht nur durch einen Admin der eigenen Firma.
- Das Tageslimit (S-15) gilt **je handelndem Admin**; auch Resets aus der Liste „Von mir angelegte Admins“ zählen.
- Abteilungen mit zugeordneten Nutzern werden nicht gelöscht, sondern können deaktiviert werden.
- Das KI-Modul „regelbasiert“ braucht keine Verbindung. Es gibt immer genau ein Standardmodul, sobald ein Modul existiert.
- Reiter **Branchen** (09.11.2026): Die Liste gilt für **alle** Firmen (Grundlage des Benchmarks), daher wirkt jede Änderung firmenübergreifend. Jeder Admin darf Branchen hinzufügen, umbenennen und (de)aktivieren. Der Code (2–5 Zeichen, A–Z/0–9) ist unveränderlich. Standardbranchen sind nicht löschbar; ergänzte nur, solange keine Firma sie nutzt. Eine verwendete Branche kann nicht deaktiviert werden. Welche oder wie viele Firmen eine Branche nutzen, wird nicht angezeigt (S-06). Deaktivierte Branchen sind in Ersteinrichtung, „Meine Firma“ und „Neue Firma“ nicht wählbar.
- Noch nicht umgesetzt: Reiter **Passwortrichtlinie** (siehe Backlog), Änderungshistorie der Antworten (folgt mit den Assessments).
