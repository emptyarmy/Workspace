# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Zahlen-Addierer": a small browser app (vanilla JS, no framework, no build step) that adds two numbers. The UI, code identifiers, comments, and test names are all in **German**; keep new code and user-facing text in German to match.

## Commands

```bash
npm install && npx playwright install chromium   # one-time setup
npm start                                        # serve on http://localhost:3000 (PORT env overrides)
npm test                                         # all Playwright tests (auto-starts the server)
npx playwright test tests/negativ.spec.js        # one spec file
npx playwright test -g "P05"                     # single test by ID in its title
npm run test:ui                                  # interactive Playwright UI
npm run test:report                              # open HTML report of last run
```

There is no linter or build step. Node is managed with mise (see global setup).

## Architecture

- `server.js` — dependency-free static file server (`node:http`) serving `public/`, with a path-traversal guard. Only `.html/.css/.js` get proper MIME types. ESM (`"type": "module"`).
- `public/` — the whole app. `app.js` holds all logic in `addiere()`, which checks cases in a fixed order: invalid characters → both fields empty → exactly one field filled (shows that number plus a "hinweis") → sum. Input is validated against `ZAHL_MUSTER` (optional minus, comma or dot decimals); results are rounded to 1e-10 to hide float errors and formatted with `de-DE` locale (comma decimal separator).
- Messages go into `#meldung` with CSS class `hinweis` (info) or `fehler` (error); invalid inputs also get class `fehler`. Tests assert on these classes and message text, so changing wording or class names breaks tests.
- `public/` can also be served by the VS Code Live Server extension (port 5500), so the frontend must not depend on `server.js`.

## Tests

- Playwright, Chromium only; `playwright.config.js` starts `npm start` via `webServer` and reuses an already running server.
- `tests/addierer.page.js` is a Page Object (`AddiererSeite`) locating elements by accessible label/role ("Erste Zahl", "Zweite Zahl", "Ergebnis", button "Addiere"). Keep those labels stable, or update the page object.
- Test IDs are numbered and prefixed in titles: `P01…` in `positiv.spec.js`, `N01…` in `negativ.spec.js`. Continue the numbering for new cases and keep the README's ranges (P01–P18, N01–N17) in sync.
