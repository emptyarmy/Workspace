# Agents for Number Adder Web Application

## Project Overview

"Zahlen-Addierer" is a small browser app (vanilla JS, no framework, no build step) that adds two numbers. Results can be assigned to invoices ("Rechnungen", called tapes in the API), and the app shows the sum and average across all invoices.

UI text, code identifiers, comments and test names are **German**; keep new code and user-facing text in German.

## Commands

```bash
npm install && npx playwright install chromium   # one-time setup
npm start                                        # serve on http://localhost:3000 (PORT env overrides)
npm test                                         # all Playwright tests (auto-starts the server)
npx playwright test -g "P05"                     # single test by ID in its title
cd tests/api-tests/Zahlenaddition && bru run --env Lokal   # Bruno API test suite (server must be running)
```

Playwright reuses a server that is already running on port 3000. Restart it after changing `server.js`, otherwise tests run against old code.

## Application Structure

- **Frontend** (`public/`: `index.html`, `app.js`, `style.css`): input validation, the addition itself (rounded to 1e-10, formatted with `de-DE`), and the invoice UI. Messages go into `#meldung` with class `hinweis` (info) or `fehler` (error).
- **Backend** (`server.js`): dependency-free `node:http` server that serves `public/` and provides the in-memory REST API for tapes and entries. Data is lost on restart. No authentication.
- **API spec**: `tests/api-tests/Zahlenaddition-openapi.yaml` (OpenAPI 3.0).

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/tapes` | create tape → `201 { id }` |
| GET | `/v1/tapes/{tapeId}` | tape with `entries`, `sum`, `count`, `average` |
| DELETE | `/v1/tapes/{tapeId}` | delete tape |
| GET | `/v1/tapes/{tapeId}/total` | `{ total }` only |
| POST | `/v1/tapes/{tapeId}/entries` | add one number or an array |
| DELETE | `/v1/tapes/{tapeId}/entries` | delete all entries |
| DELETE | `/v1/tapes/{tapeId}/entries/{entryId}` | delete one entry (by value) |

There is no endpoint that lists all tapes.

Entries:
- An entry is a JSON number or any string that JavaScript `Number()` reads as a number (so `"1e3"`, `" 7 "` and `""` = 0 are accepted). An empty array is accepted and changes nothing.
- Entries are stored verbatim as strings (`"12.50"` stays `"12.50"`); `sum`, `count` and `average` are computed numerically.
- `DELETE …/entries/{entryId}` matches the stored string exactly: `"12.50"` is found via `/entries/12.50`, not `/entries/12.5`.

Errors are JSON:

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "invalid_number", value }` | entry is not numeric (`"abc"`, `true`, object); a missing body counts as `{}` |
| 400 | `{ error: "Invalid request body" }` | body is not valid JSON |
| 404 | `{ error: "Tape not found" }` / `{ error: "Entry not found" }` | unknown tape or entry |
| 404 | `{ error: "Not found" }` | unknown sub-path, e.g. `/v1/tapes/1/xyz` |
| 405 | `{ error: "Method not allowed" }` | method not listed above for that path (e.g. `DELETE /v1/tapes/1/total`, `GET /v1/tapes`), or a non-numeric `tapeId` on `/v1/tapes/{tapeId}` and `/total` |

`handleApiRequest` in `server.js` routes by path length (`/v1/tapes`, `/v1/tapes/{id}`, `/v1/tapes/{id}/total`, `/v1/tapes/{id}/entries[/{entryId}]`). A new endpoint needs its own branch there, and the OpenAPI spec, `README.md` and this table must be updated with it.

## Invoice (Tape) Behaviour in the GUI

- Initially the invoice list shows "Auswahl" (no invoice selected).
- "Neue Rechnung erstellen" creates a tape and adds "Rechnung 1", "Rechnung 2", … to the list; the new invoice is selected.
- "Addiere" shows the result in "Ergebnis". If an invoice is selected, the result becomes **that invoice's value** (it replaces the previous value, it is not appended). This also applies when only one number was entered.
- "Summe aller Einträge" = sum of the values of all invoices; "Durchschnitt aller Einträge" = that sum divided by the number of invoices that have a value.
- "Rechnung löschen" removes the selected invoice from the list and recalculates sum and average; the list returns to "Auswahl".
- The invoice list lives only in the open page; after a reload numbering starts again at "Rechnung 1".

## Testing

### Test Files

- `tests/positiv.spec.js`: positive GUI cases (P01–P25), incl. invoices (P21–P25)
- `tests/negativ.spec.js`: negative GUI cases (N01–N21), incl. invoices (N18–N21)
- `tests/api.spec.js`: API cases (A01–A24)
- `tests/addierer.page.js`: Page Object (`AddiererSeite`), locates elements by accessible label/role
- `tests/api-tests/Zahlenaddition/`: Bruno collection (folders `Positiv` P01–P19, `Negativ` N01–N27; 10 test values `testwert01`–`testwert10` as collection variables, environment `Lokal`)
- `api-test.js`: manual script that prints the API responses

Continue the numbering for new cases and keep the ranges here and in `README.md` in sync. The Bruno collection has its own P/N numbering, independent of the Playwright IDs. Playwright runs tests in parallel against one in-memory server, so every test creates its own tapes and must not rely on tape IDs or on other tests' data. Tests assert on message text and the classes `hinweis`/`fehler`, and on the labels "Erste Zahl", "Zweite Zahl", "Ergebnis", "Rechnungen (Tapes)", "Summe aller Einträge", "Durchschnitt aller Einträge"; changing them breaks tests.

### Testing Scope

- Basic addition of positive and negative numbers, decimals with comma or dot
- Input validation and error handling (letters, special characters, empty fields)
- Very large numbers (at least 100 digits)
- API CRUD for tapes and entries, including numeric strings, error responses and routing of unknown paths/methods
- GUI invoice management (create, delete, switch) and updating of sum and average

## Key Requirements

- The application receives two numbers and displays their sum.
- The web interface is responsive and user-friendly.
- All Playwright tests and the Bruno suite pass.
- The application handles numbers with at least 100 digits.
- The API supports CRUD operations for tapes and entries.
- The GUI integrates invoices as described above, with sum and average updated immediately.

## Known Gaps

- **100-digit numbers are not exact.** `app.js` uses JavaScript `Number`, which is precise only to about 15–17 significant digits; e.g. 100 × "1" + 100 × "2" shows `3.333.333.333.333.332.700.000…`. Tests P19/P20 use 52-digit numbers and only check that a result is shown. Meeting the requirement would need `BigInt` or decimal string arithmetic.
