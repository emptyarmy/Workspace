# Zahlen-Addierer

Browser-Applikation in JavaScript, die zwei Zahlen addiert.

## Starten

```bash
npm start
```

Danach im Browser öffnen: <http://localhost:3000>

Alternativ mit der VS-Code-Erweiterung **Live Server** (Port 5500, Root `public/`).

## Funktionen

- Willkommensseite mit zwei Eingabefeldern und dem Button „Addiere“
- Ergebnis in einem schreibgeschützten Feld
- Nur eine Zahl eingegeben → diese Zahl wird als Ergebnis angezeigt, mit Hinweis
- Buchstaben oder Sonderzeichen → Fehlermeldung mit Aufforderung zur Korrektur
- Dezimalzahlen mit Komma oder Punkt sowie negative Zahlen sind erlaubt
- API zur Verwaltung von Rechnungen (Tapes) mit Posten

## Tests (Playwright)

Einmalig einrichten:

```bash
npm install
npx playwright install chromium
```

Tests ausführen (der Server wird dabei automatisch gestartet):

```bash
npm test             # alle Tests im Terminal
npm run test:ui      # interaktive Oberfläche
npm run test:report  # HTML-Bericht des letzten Laufs öffnen
```

- `tests/positiv.spec.js`: positive Testfälle (P01–P25)
- `tests/negativ.spec.js`: negative Testfälle (N01–N21)
- `tests/api.spec.js`: API-Testfälle (A01–A24)
- `tests/addierer.page.js`: Page Object mit den Seitenelementen

## API Endpunkte

Die Anwendung bietet eine RESTful API für die Verwaltung von Rechnungen (Tapes):

### Tapes (Rechnungen)
- `POST   /v1/tapes`                      neue Rolle anlegen
- `GET    /v1/tapes/{tapeId}`             Rolle mit Posten, Summe, Anzahl, Durchschnitt
- `DELETE /v1/tapes/{tapeId}`             Rolle löschen

### Posten (Entries)
- `POST   /v1/tapes/{tapeId}/entries`     Posten hinzufügen (eine Zahl oder eine Liste)
- `DELETE /v1/tapes/{tapeId}/entries/{entryId}`   einzelnen Posten entfernen
- `DELETE /v1/tapes/{tapeId}/entries`     alle Posten leeren („Alles löschen“)

### Zusätzliche Funktionen
- `GET    /v1/tapes/{tapeId}/total`       nur die Summe, wenn man die Posten nicht braucht

### Konventionen
- Ressourcen stehen im Plural und als Nomen (`tapes`, `entries`), und die HTTP-Methode gibt die Aktion an.
- Eine Version im Pfad (`/v1/`) lässt dir später Raum für Änderungen.
- Zahlen schickst du als JSON-Zahl oder bei Geldbeträgen als String (`"12.50"`). Das vermeidet Rundungsfehler, und das deutsche Komma bleibt ein Thema der Oberfläche, nicht der API.
- Fehler gibst du einheitlich zurück, zum Beispiel `400` mit `{ "error": "invalid_number", "value": "abc" }`.
