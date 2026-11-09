# User Stories (Epics und Stories)

## EP-1 Assessment
- **US-1.1** Als Assessor möchte ich ein neues Assessment mit Projektstammdaten anlegen, damit Ergebnisse eindeutig zugeordnet sind.
  - AK: Pflichtfelder Projekt, Assessor, Startdatum; Enddatum ≥ Startdatum; Fehlermeldung bei Verstoß.
- **US-1.2** Als Assessor möchte ich Kernbereiche den Abteilungen zuweisen, damit mehrere Abteilungen parallel antworten können.
- **US-1.3** Als Assessor möchte ich ein Assessment als JSON exportieren, um es zu archivieren.
  - AK: Ungültige/fremde Dateien werden beim Import mit verständlicher Meldung abgewiesen.

## EP-2 Befragung
- **US-2.1** Als Fachbereichsnutzer möchte ich die Kontrollpunkte nach Kernbereichen gegliedert beantworten, damit ich mich auf ein Thema konzentrieren kann.
- **US-2.2** Als Nutzer möchte ich sehen, wie viel ich bereits beantwortet habe.
- **US-2.3** Als Nutzer möchte ich die Sprache wechseln, ohne meine Antworten zu verlieren.
- **US-2.4** Als Nutzer auf dem Smartphone möchte ich mit dem Daumen schnell antworten können.

## EP-3 Kommentare
- **US-2.5** Als Befragter möchte ich sehen, wenn ein Kollege gerade denselben Kernbereich bearbeitet, und bei Konflikten gewarnt werden.
- **US-3.1** Als Nutzer möchte ich zu einem Kontrollpunkt einen Kommentar erfassen, wobei ich automatisch als Verfasser gespeichert werde und optional die Quelle der Information auswähle, damit die Bewertung belegbar ist.
  - AK: Verfasser wird automatisch gesetzt; leere Kommentare nicht möglich; max. Länge (z. B. 2000 Zeichen).
- **US-3.2** Als Assessor möchte ich die Liste der Autoren/Quellen pflegen.

## EP-4 Bericht
- **US-4.1** Als Projektleitung möchte ich eine grafische Übersicht (Matrix, Netzdiagramm, Balken) sehen, damit ich Stärken/Schwächen schnell erkenne.
- **US-4.2** Als Projektleitung möchte ich den Bericht als PDF erhalten.
- **US-4.3** Als Testmanager möchte ich die Ergebnisse mit dem Vorjahr vergleichen.

## EP-5 Handlungsempfehlungen
- **US-5.1** Als Testmanager möchte ich priorisierte Empfehlungen erhalten, getrennt nach kurzfristig und langfristig, damit ich einen Maßnahmenplan aufsetzen kann.
- **US-5.2** Als Testmanager möchte ich KI-formulierte Empfehlungen prüfen, anpassen und übernehmen.
- **US-5.3** Als Nutzer ohne KI-Zugang möchte ich trotzdem regelbasierte Empfehlungen erhalten.

## EP-6 Anmeldung
- **US-6.1** Als neuer Nutzer möchte ich mir über „Passwort vergessen“ mein Initialpasswort zusenden lassen, damit ich mich ohne Admin-Hilfe anmelden kann.
  - AK: gleiche Meldung für bekannte und unbekannte Adressen; Link/Passwort 30 min gültig.
- **US-6.2** Als Nutzer muss ich nach der ersten Anmeldung mein Passwort ändern.
  - AK: Ohne Änderung ist keine andere Seite erreichbar (auch nicht über direkte URL).
- **US-6.3** Als Nutzer möchte ich beim Eingeben sehen, welche Passwortregeln schon erfüllt sind (grün) und wie stark mein Passwort ist (schwach/mittel/stark).
  - AK: Regeln immer sichtbar; Speichern erst bei vollständiger Erfüllung; Stärke berücksichtigt Originalität.
- **US-6.4** Als Nutzer sehe ich auf der Login-Seite das Logo meiner Firma.

## EP-7 Administration
- **US-7.1** Als Administrator möchte ich Benutzer und Abteilungen verwalten.
- **US-7.2** Als Administrator möchte ich die Logo-URL hinterlegen und vor dem Speichern eine Vorschau sehen.
  - AK: Ungültige oder nicht erreichbare URL wird mit Meldung abgewiesen.
- **US-7.3** Als Administrator möchte ich KI-Anbieter, Modell und Zugangsdaten festlegen und die Verbindung testen.
  - AK: API-Schlüssel wird nach dem Speichern nie wieder im Klartext angezeigt.

## EP-8 Benutzerverwaltung (Runde 2)
- **US-8.1** Als erster Nutzer einer neuen Installation werde ich automatisch Admin.
- **US-8.2** Als Admin lege ich einen Nutzer an; er erhält automatisch eine Einladungs-Mail mit Link zur Login-Seite und einer Anleitung zum Erstellen seines Passworts.
- **US-8.3** Als Admin möchte ich einen Nutzer löschen und vorher gefragt werden, ob ich das wirklich will.
  - AK: Dialog mit „Löschen bestätigen“ / „Abbrechen“; Abbrechen ändert nichts.
- **US-8.4** Als Admin setze ich Nutzer aktiv/inaktiv und ändere Name, E-Mail und Rolle (Admin / Assessor / Befragter / Leser).

## EP-9 Zusammenführung und Historie
- **US-9.1** Als Befragter erfasse ich die Antworten meiner Abteilung, ohne die Antworten anderer Abteilungen zu überschreiben.
- **US-9.2** Als Assessor sehe ich je Kontrollpunkt alle Abteilungsantworten und lege die konsolidierte Antwort mit Begründung fest.
- **US-9.3** Als Assessor, Befragter oder Leser sehe ich in der Änderungshistorie, wer wann was geändert hat.

## EP-10 Benchmark
- **US-10.1** Als Geschäftsführung möchte ich sehen, wie unser Testprozess im Vergleich zu unserer Branche und zu allen bewerteten Firmen abschneidet.
- **US-10.2** Als Admin wähle ich für jede Firma die Branche und hinterlege das Logo.
