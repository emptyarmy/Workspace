# ADR-005: Authentifizierung und Benutzerverwaltung

- **Status:** akzeptiert (08./09.11.2026)
- **Bezug:** F-07, N-01, N-02, N-07

## Entscheidung
- Anmeldung mit E-Mail und Passwort. **SSO** ist über die `AuthProvider`-Schnittstelle vorbereitet.
- **Erster registrierter Nutzer wird Admin**, **nur über localhost** (R-06); Prüfung der Socket-Adresse, nicht von Headern.
- Genau **eine Rolle** je Nutzer: **Admin, Assessor, Befragter, Leser** (R-08, festgelegt). Admins können jede Rolle vergeben, auch Admin.
- Der Admin legt Nutzer an. Das System verschickt automatisch eine **Einladungs-Mail** mit Link zur Login-Seite und einer Anleitung. Der Nutzer erzeugt sein erstes Passwort selbst über „Passwort vergessen“ und erhält dazu einen **Einmal-Link** (N-07).
- Passwortrichtlinie: ≥ 6 Zeichen, Zahl, Großbuchstabe, Sonderzeichen (konfigurierbar), live grün markiert. Stärkeanzeige in 3 Stufen mit Originalitätsprüfung.
- Löschen von Nutzern nur nach Bestätigung im Dialog (bestätigen oder abbrechen).

## Konsequenzen
- Für Einladung, Reset und E-Mail-Änderung gibt es ein gemeinsames Einmal-Token-Modul.
- Playwright testet den kompletten Weg von der Einladung bis zum ersten Login über die Mailpit-API.
