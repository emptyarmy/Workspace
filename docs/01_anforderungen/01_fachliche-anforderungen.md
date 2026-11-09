# Fachliche Anforderungen

Priorität: **M** = Muss, **S** = Soll, **K** = Kann. Mit ❓ markierte Punkte hängen von offenen Fragen ab.

## FA-1 Assessment verwalten
| ID | Anforderung | Prio |
|---|---|---|
| FA-1.1 | Ein Assessment anlegen mit Stammdaten analog Excel-Blatt „Information“ (Projekt, Assessor, Domäne, Firma, Abteilung, Hauptstakeholder, Kontakt, Art, Start-/Enddatum, Anzahl Interviews, Scope). | M |
| FA-1.2 | Mehrere Assessments speichern, öffnen, duplizieren, löschen. | M |
| FA-1.3 | Assessment als Datei exportieren und importieren (JSON, z. B. zur Archivierung). | S |
| FA-1.4 | Zwei Assessments vergleichen (z. B. Vorjahr). | S ❓F-08 |
| FA-1.5 | Auswahl, welche Kernbereiche im Scope sind, und Vorgehensmodell (klassisch / agil / beides). | S ❓N-14 |
| FA-1.6 | Mitglieder eines Assessments festlegen und Kernbereiche Abteilungen/Personen zuweisen. | M ❓N-04 |

## FA-2 Fragebogen beantworten
| ID | Anforderung | Prio |
|---|---|---|
| FA-2.1 | Navigation gegliedert nach Kernbereichen; innerhalb eines KB nach Ebenen K → E → O. | M |
| FA-2.2 | Je Kontrollpunkt Antwort auswählen (Skala siehe `02_analyse/02_…`). | M |
| FA-2.3 | Fortschrittsanzeige je KB und gesamt. | M |
| FA-2.4 | Automatisches Speichern jeder Änderung auf dem Server; kein Datenverlust bei Neuladen. | M |
| FA-2.8 | Antworten anderer Nutzer erscheinen ohne Neuladen; Bearbeitungskonflikte werden erkannt und angezeigt. | M |
| FA-2.9 | Antworthistorie je Kontrollpunkt (wer, wann, alt → neu). | S |
| FA-2.10 | Filter „Meine Kernbereiche“ und „agile“ bzw. „KI“-Kontrollpunkte. | S |
| FA-2.5 | Filter: nur offene / nur nicht erfüllte / nur KI-Kontrollpunkte. | S |
| FA-2.6 | Erläuterungstext (Hint) je KP einblendbar. | S |
| FA-2.7 | Kennzeichnung neuer KI-Kontrollpunkte (Badge). | M |

## FA-3 Kommentare mit Quelle/Autor
| ID | Anforderung | Prio |
|---|---|---|
| FA-3.1 | Zu jedem KP beliebig viele Kommentare erfassen. | M |
| FA-3.2 | Je Kommentar wird der **Verfasser automatisch** (angemeldeter Nutzer) gespeichert; zusätzlich ist eine **Quelle aus einer Auswahlliste** wählbar. Gespeichert werden Verfasser, Quelle, Quelltyp und Zeitstempel. | M ❓N-12 |
| FA-3.3 | Auswahlliste der Autoren/Quellen pflegen (anlegen, umbenennen, deaktivieren). | M ❓F-07 |
| FA-3.4 | Quelltyp unterscheiden: Interview, Dokument, Workshop, Beobachtung, Tool-Auswertung. | S ❓F-07 |
| FA-3.5 | Eigene Kommentare bearbeiten/löschen (mit Bestätigung); Assessoren dürfen alle Kommentare moderieren. | M |
| FA-3.6 | Optional Verweis/Link auf Beleg (URL, Dokumentname). | K |

## FA-4 Auswertung und Bericht
| ID | Anforderung | Prio |
|---|---|---|
| FA-4.1 | **Reifegradmatrix**: KB × Ebene, KP-Zellen farbcodiert; Klick/Tap zeigt Text + Kommentare (wie Excel). | M |
| FA-4.2 | **Netzdiagramm** Erfüllungsgrad (%) je KB. | M |
| FA-4.3 | **Balkendiagramm** absolut: gesamt und je Ebene (bzw. je Sicht P/T/O). | M |
| FA-4.4 | Erreichte Ebene je KB als Ampel/Stufenanzeige; Gesamtreifegrad. | M |
| FA-4.5 | Separater **KI-Reifeindex**. | M |
| FA-4.6 | Management-Zusammenfassung (Stärken, Schwächen, Top-Risiken). | S |
| FA-4.7 | Export: PDF (Druckansicht), JSON; optional Excel/CSV, PowerPoint. | M/K ❓F-13 |

## FA-5 KI-gestützte Handlungsempfehlungen
| ID | Anforderung | Prio |
|---|---|---|
| FA-5.1 | Empfehlungen werden aus nicht erfüllten / teilweise erfüllten KP abgeleitet. | M |
| FA-5.2 | Einteilung in **kurzfristig (< 1 Monat)** und **langfristig (≥ 1 Monat)**. | M |
| FA-5.3 | Priorisierung nach Ebenenlogik (erst nächste Ebene), Cluster, Abhängigkeiten, Aufwand/Nutzen. | M |
| FA-5.4 | KI formuliert kontextbezogene Empfehlungen unter Einbeziehung der Kommentare; Anbieter und Modell werden im Admin-Bereich konfiguriert. | M |
| FA-5.5 | Nutzer kann Empfehlungen annehmen, ablehnen, bearbeiten, priorisieren und Verantwortliche/Termine eintragen (Maßnahmenplan). | S |
| FA-5.6 | Empfehlungen funktionieren auch **ohne** KI-Verbindung (regelbasiert, Fallback). | M |
| FA-5.7 | Kennzeichnung KI-generierter Texte. | M |

## FA-6 Sprache und Hilfe
| ID | Anforderung | Prio |
|---|---|---|
| FA-6.1 | Umschaltung DE/EN für UI, Fragen, Bericht. | M |
| FA-6.2 | Hilfe-/Einführungsseite (ersetzt Blatt „Guidelines“). | S |

## FA-7 Anmeldung und Passwort (F-07)
| ID | Anforderung | Prio |
|---|---|---|
| FA-7.1 | Anmeldung mit E-Mail-Adresse und Passwort; ohne Anmeldung ist nur die Login-Seite (inkl. „Passwort vergessen“) erreichbar. | M |
| FA-7.2 | Login-Seite `/login/<firmenkürzel>` zeigt das Logo der jeweiligen **Firma**; `/login` zeigt ein neutrales App-Logo; bei Ladefehler Platzhalter-Logo (R-01). | M |
| FA-7.3 | Link **„Passwort vergessen“** in der Anmeldemaske; Versand einer E-Mail mit **Einmal-Link** (30 min, einmalig) zum Festlegen des Passworts; Meldung ist unabhängig davon, ob die Adresse existiert. | M |
| FA-7.13 | **Ersteinrichtung:** Der erste Nutzer, der sich am Server registriert, wird automatisch Admin (**nur über localhost**, R-06). | M |
| FA-7.14 | **Einladungs-Mail** nach Anlage durch den Admin: Link zur (firmenspezifischen) Login-Seite und Anleitung, wie das Initialpasswort über „Passwort vergessen“ selbst erstellt wird. | M |
| FA-7.4 | Das Initialpasswort muss vom Nutzer selbst gesetzt bzw. geändert werden; bis dahin ist keine andere Seite erreichbar (Umsetzung über Einmal-Link, ❓R-07). | M |
| FA-7.5 | Passwortrichtlinie: ≥ 6 Zeichen, ≥ 1 Zahl, ≥ 1 Großbuchstabe, ≥ 1 Sonderzeichen (Werte konfigurierbar). | M |
| FA-7.6 | Alle Regeln werden **dauerhaft unter dem Passwortfeld** angezeigt und bei Erfüllung **live grün** markiert. | M |
| FA-7.7 | Das Passwort wird erst akzeptiert (Button aktiv, Server akzeptiert), wenn **alle** Regeln erfüllt sind und beide Eingaben übereinstimmen. | M |
| FA-7.8 | **Stärkeanzeige in 3 Stufen** (schwach / mittel / stark) unter Berücksichtigung der **Originalität** (Wörterbuch, Muster, Bezug zu E-Mail/Name). | M ❓N-09 |
| FA-7.9 | Abmelden; automatische Abmeldung nach Inaktivität. | M |
| FA-7.10 | Sperre nach wiederholten Fehlversuchen. | M ❓N-08 |
| FA-7.11 | Architektur ermöglicht späteres **SSO** (OpenID Connect) ohne Umbau des Benutzermodells. | M |
| FA-7.12 | Angemeldete Nutzer können ihr Passwort jederzeit ändern (gleiche Regeln). | M |

## FA-8 Admin-Bereich
| ID | Anforderung | Prio |
|---|---|---|
| FA-8.1 | Nur für die Rolle Administrator zugänglich (UI und Server). | M |
| FA-8.2 | Benutzerverwaltung: anlegen (mit Einladungs-Mail), **Name und E-Mail ändern**, **aktiv/inaktiv** setzen, Rolle (**Admin / Assessor / Befragter / Leser**, genau eine) und Abteilung ändern, Einladung erneut senden, entsperren. | M |
| FA-8.2a | **Löschen** eines Nutzers nur nach **Bestätigungsdialog** (Pop-up) mit „Löschen bestätigen“ oder „Abbrechen“; Abbrechen (auch Esc) lässt alles unverändert. | M |
| FA-8.2b | Admin kann anderen Nutzern die Rolle Admin zuweisen; Schutz des letzten Admins und vor Selbst-Herabstufung. | M |
| FA-8.3 | Abteilungsverwaltung. | M |
| FA-8.4 | **Meine Firma:** Name, Kürzel, **E-Mail-Domain(s)**, **Logo-URL** (Vorschau, Erreichbarkeitsprüfung) und **Branche** (Auswahlliste) der eigenen Firma konfigurieren. | M |
| FA-8.11 | Jeder Admin verwaltet **nur seine eigene Firma** (R-02). | M |
| FA-8.12 | Nutzer-E-Mail-Adressen müssen zur Domain der Firma gehören; Abweisung fremder Domains mit Meldung. | M |
| FA-8.13 | Admin kann eine **neue Firma** anlegen **oder** für eine **bestehende Firma** weitere Admins anlegen – jeweils mit E-Mail-Adresse der Firma (Einladungs-Mail) (S-01). | M |
| FA-8.14 | Admin behält Zugriff auf die **von ihm angelegten Admins** anderer Firmen: Rolle auf Nicht-Admin umstellen, aktiv/inaktiv, Einladung erneut senden, Passwort zurücksetzen (S-01). | M |
| FA-8.17 | **Passwort zurücksetzen** für alle Nutzer und Admins der **eigenen** Firma (Button) und für Nutzer und Admins **anderer** Firmen (Eingabe der E-Mail-Adresse); Betroffene erhalten einen neuen Einmal-Link per Mail; bei fremden Firmen werden deren Admins per Mail informiert (S-01, S-10). | M |
| FA-8.18 | **E-Mail-Benachrichtigung der Admins**, wenn Admins außerhalb ihrer Domain Nutzer ändern, Admins erstellen oder Admins der Firma gelöscht werden (S-01). | M |
| FA-8.19 | Admins sehen die **Ergebnisse der eigenen Firma** (nur lesend); von **anderen** Firmen nur aggregierte Benchmark-Daten (S-06, S-11). | M |
| FA-8.21 | Admins dürfen nur Admins der **eigenen** Firma löschen; die übrigen Admins werden informiert (S-13). | M |
| FA-8.22 | Die Änderungshistorie zeigt Admins die Ereignisse ihrer eigenen Firma; firmenübergreifende Admin-Aktionen erscheinen als Verwaltungsereignisse (S-12). | S |
| FA-8.20 | **Assessor und Admin** wählen das KI-Modul für die Empfehlungen (S-09). | M |
| FA-8.15 | **Externe Berater** mit Präfix `ext.` in der Firmen-E-Mail werden automatisch als „Extern“ gekennzeichnet; keine manuelle Pflege (S-03, S-08). | M |
| FA-8.16 | **KI-Module** und **Mailserver** werden **je Firma** konfiguriert (S-04). | M |
| FA-8.5 | **KI-Konfiguration (je Firma):** Modus, Anbieter, Basis-URL, Modell, API-Schlüssel, Parameter, Datenschutzoptionen, Verbindungstest. | M |
| FA-8.6 | Passwortrichtlinie und Sperrparameter konfigurieren. | S |
| FA-8.7 | Mail-Konfiguration (je Firma): Standard **Mailversand des Betriebssystems**, umschaltbar auf SMTP; Test-Mail. | M |
| FA-8.8 | Audit-Log einsehen (Admin). | S |
| FA-8.9 | **Änderungshistorie** im Admin-Bereich für **alle Rollen** lesbar (eigene Firma): wer, wann, was, alt → neu; filterbar, CSV-Export. | M |
| FA-8.10 | Branchenliste pflegen. | S |

## FA-9 Zusammenführung der Abteilungsantworten (N-03)
| ID | Anforderung | Prio |
|---|---|---|
| FA-9.1 | Jede zugewiesene Abteilung erfasst **eigene Antworten** je Kontrollpunkt und gibt sie ab. | M |
| FA-9.2 | Vergleichsansicht für den Assessor: alle Abteilungsantworten + Kommentare je KP nebeneinander. | M |
| FA-9.3 | Systemvorschlag für die konsolidierte Antwort; Assessor legt sie fest; Begründung bei Abweichung Pflicht (❓R-11). | M |
| FA-9.4 | Bericht basiert ausschließlich auf konsolidierten Antworten; „Konsenslücken“ werden ausgewiesen. | M |
| FA-9.5 | Alle Änderungen (Abteilungsantwort, Zusammenführung, Kommentar, Status) werden unveränderbar in der Änderungshistorie protokolliert. | M |

## FA-10 Mandanten und Benchmark (N-11)
| ID | Anforderung | Prio |
|---|---|---|
| FA-10.1 | Mehrere Firmen in einer Installation; strikte Datentrennung. | M |
| FA-10.2 | Je Firma eigenes Logo (Login, Kopfzeile, Bericht) und Branche. | M |
| FA-10.3 | Bericht enthält **Benchmark**: eigene Firma vs. **Branche** vs. **alle Firmen** (Radar, Tabelle, Quartil). | M |
| FA-10.4 | Benchmark anonym: nur aggregierte Werte, Mindestanzahl Firmen (❓R-03), Opt-out (❓R-04). | M |
| FA-10.5 | Benchmark-Abweichungen fließen in die Priorisierung der Empfehlungen ein. | S |
