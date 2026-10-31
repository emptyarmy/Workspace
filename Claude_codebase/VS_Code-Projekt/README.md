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

- `tests/positiv.spec.js`: positive Testfälle (P01–P18)
- `tests/negativ.spec.js`: negative Testfälle (N01–N17)
- `tests/addierer.page.js`: Page Object mit den Seitenelementen
