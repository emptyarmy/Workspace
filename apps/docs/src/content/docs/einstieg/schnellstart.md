---
title: Schnellstart
description: AI_TPI lokal auf macOS (oder Linux) installieren, starten und die Ersteinrichtung durchführen.
sidebar:
  order: 2
---

## Voraussetzungen

| Werkzeug | Version | Wofür |
|---|---|---|
| Node.js | ≥ 22 | Anwendung, Tests, Dokumentation |
| npm | mit Node.js | Pakete (Workspaces) |
| Docker Desktop | aktuell | PostgreSQL und Mailpit |
| Python 3 | optional | Prüfung des Fragenkatalogs |

## In fünf Schritten starten

```bash
# 1. Konfiguration anlegen (einmalig)
cp .env.example .env

# 2. Datenbank und Mail-Testserver starten
docker compose up -d db mailpit

# 3. Abhängigkeiten installieren
npm install

# 4. Tabellen und Stammdaten anlegen (Branchen, Freemail-Sperrliste)
npm run db:migrate

# 5. API und Weboberfläche starten
npm run dev
```

Danach:

| Adresse | Inhalt |
|---|---|
| `http://localhost:5173/einrichtung` | **Ersteinrichtung** – erster Admin und eigene Firma (siehe [Ersteinrichtung](/handbuch/ersteinrichtung/)) |
| `http://localhost:5173/login/<kürzel>` | Anmeldung für Ihre Firma |
| `http://localhost:8025` | **Mailpit** – hier landen Einladungen und Einmal-Links |
| `http://localhost:3000/api/health` | Zustand von Server und Datenbank |

:::tip[Läuft auf Port 5432 schon ein anderes PostgreSQL?]
Dann in `docker-compose.yml` `"5433:5432"` eintragen und in `.env` `DATABASE_URL=postgres://ai_tpi:ai_tpi@localhost:5433/ai_tpi` setzen. Die Tests übernehmen den Port automatisch. Mehr unter [Fehlerbehebung](/handbuch/fehlerbehebung/).
:::

## Tests ausführen

```bash
npx playwright install                                # einmalig: Browser für die Oberflächentests
docker compose exec db createdb -U ai_tpi ai_tpi_e2e  # einmalig: eigene Testdatenbank
npm run test:unit                                     # Unit- und API-Tests
npm run test:e2e                                      # Playwright auf 7 Geräteprofilen
```

Details unter [Tests](/entwicklung/tests/).

## Diese Dokumentation lokal ansehen

```bash
npm run docs:dev      # http://localhost:4321
```

Mit Suche und ohne Entwicklungsserver: `npm run docs:build` und danach `npm run docs:preview`. Details unter [Dokumentation pflegen](/entwicklung/dokumentation/#dokumentation-im-browser-lesen).
