---
title: Anwendung zurücksetzen
description: HowTo – die lokale Installation auf den Auslieferungszustand bringen, damit die Ersteinrichtung unter /einrichtung wieder möglich ist.
sidebar:
  order: 7
---

Diese Anleitung löscht **alle Daten** der lokalen Entwicklungsdatenbank: Nutzer, Firmen, Abteilungen, Assessments, Kommentare, Audit-Log und Einstellungen. Danach ist kein Nutzer mehr registriert, und die [Ersteinrichtung](/handbuch/ersteinrichtung/) unter `/einrichtung` ist wieder freigeschaltet.

:::danger[Nicht rückgängig zu machen]
Die Daten sind danach endgültig weg. Nur für die lokale Entwicklungsumgebung gedacht, niemals für eine Produktivdatenbank.
:::

## Kurzfassung

```bash
cd ~/Documents/Workspace/Claude_codebase/AI_TPI
# laufendes npm run dev mit Ctrl+C beenden
docker compose up -d db mailpit
docker compose exec db psql -U ai_tpi -d ai_tpi -c "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;"
npm install
npm run db:migrate
npm run dev
# Browser: http://localhost:5173/einrichtung
```

Die einzelnen Schritte mit Prüfungen folgen unten.

## Voraussetzungen

- Docker Desktop läuft.
- Im Projektordner liegt eine `.env` (Vorlage: `.env.example`).
- Der Projektordner ist der aktuelle Stand aus Git: `git log --oneline -1` zeigt den neuesten Commit. Ein aus einem alten ZIP-Backup wiederhergestellter Ordner hat ältere Abhängigkeiten, und `npm install` scheitert dann z. B. mit `ERESOLVE`.

## Schritte

Alle Befehle im Terminal im Projektordner ausführen.

```bash
cd ~/Documents/Workspace/Claude_codebase/AI_TPI
```

### 1. Laufende App beenden

Läuft `npm run dev` noch, im betreffenden Terminal mit `Ctrl+C` beenden. Auch an andere Terminal- oder VS-Code-Fenster denken: Eine dort weiterlaufende Instanz belegt die Ports und führt später zu `Port 5173 is already in use` oder `EADDRINUSE`.

Prüfen, dass nichts mehr auf den App-Ports lauscht:

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|3001|5173) '
```

Zeigt die Liste noch einen `node`-Prozess von AI_TPI, diesen beenden, z. B. `kill $(lsof -tiTCP:5173 -sTCP:LISTEN)`. Gehört ein Port einer **anderen** App (z. B. TestplanIt auf 3000), nicht beenden, sondern in Schritt 2 einen freien Port wählen.

### 2. `.env` prüfen

```bash
grep -nE '^(SERVER_PORT|WEB_PORT|DATABASE_URL|SETUP_ENABLED)=' .env
```

| Eintrag | Soll | Warum |
|---|---|---|
| `DATABASE_URL` | `postgres://ai_tpi:ai_tpi@localhost:5433/ai_tpi` | Port 5433 ist der Docker-Container. Auf 5432 läuft oft ein anderes, lokales PostgreSQL. |
| `SERVER_PORT` | ein freier Port, z. B. `3001` (Wert der Vorlage) | 3000 ist häufig von einer anderen App belegt. Ist der Port belegt, startet der AI_TPI-Server nicht, und `/einrichtung` kann nicht funktionieren. |
| `WEB_PORT` | `5173` oder ein anderer freier Port | Adresse der Weboberfläche. |
| `SETUP_ENABLED` | `true` (oder nicht gesetzt) | Bei `false` bleibt `/einrichtung` immer gesperrt. |

:::caution[`.env` nicht überschreiben]
Wer die `.env` neu aus `.env.example` kopiert oder komplett ersetzt, verliert angepasste Werte wie `SERVER_PORT=3001`. Einzelne Zeilen gezielt ändern und vorher eine Sicherung anlegen: `cp .env .env.bak-$(date +%Y%m%d-%H%M)`.
:::

### 3. Datenbank und Mailserver starten

```bash
docker compose up -d db mailpit
```

Beide Container sollten danach `Running` bzw. `Started` melden.

### 4. Datenbank leeren

```bash
docker compose exec db psql -U ai_tpi -d ai_tpi -c "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;"
```

Das entfernt alle Tabellen und die Migrationshistorie. Erwartete Ausgabe: `DROP SCHEMA`, `DROP SCHEMA`, `CREATE SCHEMA`. Hinweise wie `drop cascades to …` sind normal.

:::note
`npm run db:migrate` allein löscht **keine** Daten. Ohne diesen Schritt bleiben vorhandene Nutzer erhalten, und `/einrichtung` bleibt gesperrt.
:::

### 5. Pakete installieren (falls nötig)

```bash
npm install
```

Nur nötig nach einem frischen Checkout, nach einer Wiederherstellung oder bei geänderten Abhängigkeiten.

### 6. Tabellen und Stammdaten neu anlegen

```bash
npm run db:migrate
```

Erwartete Ausgabe: `Migration und Stammdaten: OK`. Legt alle Tabellen neu an und befüllt die Stammdaten (Branchenliste, Freemail-Sperrliste).

Kontrolle, dass kein Nutzer existiert:

```bash
docker compose exec db psql -U ai_tpi -d ai_tpi -c "select count(*) from app_user;"
```

Erwartet: `0`.

### 7. App starten

```bash
npm run dev
```

Warten, bis beide Teile gestartet sind:

```text
[web]   ➜  Local:   http://127.0.0.1:5173/
[server] … "msg":"Server listening at http://127.0.0.1:3001"
```

Der Port in der Server-Zeile muss `SERVER_PORT` aus der `.env` entsprechen. Fehlt die Server-Zeile und steht stattdessen `Port … ist bereits belegt` oder `EADDRINUSE` da, läuft der AI_TPI-Server **nicht**, obwohl die Weboberfläche erreichbar ist → `SERVER_PORT` in der `.env` ändern (Schritt 2) und neu starten.

:::caution[Nach jeder Änderung an der `.env` neu starten]
Server und Weboberfläche lesen die `.env` **nur beim Start**. Die Weboberfläche leitet `/api` an `SERVER_PORT` weiter. Läuft sie noch mit einem alten Wert, landen die Anfragen bei einer anderen App, und `/einrichtung` meldet „nicht verfügbar“. Ein Neuladen im Browser reicht nicht: `Ctrl+C` und erneut `npm run dev`.
:::

### 8. Prüfen, ob die Ersteinrichtung freigeschaltet ist

Optional, aber hilfreich bei Problemen (Port ggf. anpassen):

```bash
curl -s http://127.0.0.1:3001/api/setup/status | head -c 120; echo
curl -s http://localhost:5173/api/setup/status | head -c 120; echo
```

Beide Zeilen sollten mit `{"available":true` beginnen. Im Server-Log erscheint `"url":"/api/setup/status"` mit `"statusCode":200`.

### 9. Ersteinrichtung durchführen

Im Browser **auf demselben Rechner** öffnen (bei geändertem `WEB_PORT` den Port anpassen):

```text
http://localhost:5173/einrichtung
```

Steht noch die alte Meldung da, die Seite einmal neu laden. Das erste dort angelegte Konto wird Admin. Danach ist `/einrichtung` gesperrt, und die Anmeldung läuft über `/login/<kürzel>`. Details unter [Ersteinrichtung](/handbuch/ersteinrichtung/).

## Optional

### Alte E-Mails löschen

Mailpit (`http://localhost:8025`) öffnen und **Delete all** wählen. Sonst bleiben Einladungs- und Reset-Mails aus der Zeit vor dem Zurücksetzen sichtbar; ihre Links sind ungültig.

### Docker-Volume komplett neu anlegen

Statt Schritt 4 lässt sich auch das ganze Datenbank-Volume verwerfen. Das ist gründlicher, z. B. wenn die Datenbank beschädigt ist oder Rolle und Passwort nicht mehr stimmen:

```bash
docker compose down -v
docker compose up -d db mailpit
```

`-v` löscht die Volumes dieses Projekts (`db-data`). Danach mit Schritt 5 weitermachen.

## Was nicht zurückgesetzt wird

| Bereich | Verhalten |
|---|---|
| Testdatenbank `ai_tpi_e2e` | Unberührt; die Playwright-Tests setzen sie bei jedem Lauf selbst zurück (`npm run db:reset:e2e -w @ai-tpi/server`). |
| `.env` | Bleibt erhalten, inklusive `SECRET_ENCRYPTION_KEY`. |
| Fragenkatalog (`packages/catalog`) | Liegt als Datei im Projekt, nicht in der Datenbank. |
| Browser-Cookies | Ein altes Sitzungs-Cookie ist danach ungültig; die App leitet zur Anmeldung um. |

## Häufige Fehler

| Meldung | Ursache und Lösung |
|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop starten, dann Schritt 3 wiederholen. |
| `service "db" is not running` | Schritt 3 ausführen. |
| `ERESOLVE could not resolve` bei `npm install` | Veralteter Projektstand (z. B. aus einem ZIP-Backup). Mit `git log --oneline -1` prüfen und den aktuellen Stand verwenden. |
| `role "ai_tpi" does not exist` bei `db:migrate` | `DATABASE_URL` zeigt auf ein anderes PostgreSQL (meist Port 5432). Auf den Docker-Port (5433) umstellen. |
| `connect ECONNREFUSED …:5433` | Datenbank-Container läuft nicht → Schritt 3. |
| `Port 5173 is already in use` | Eine alte `npm run dev`-Instanz läuft noch → Schritt 1. Gehört der Port einer anderen App, in der `.env` `WEB_PORT=5174` setzen. |
| `Port 3000 ist bereits belegt` bzw. `listen EADDRINUSE … :3000` | Port 3000 ist belegt, oft von einer anderen App. In der `.env` `SERVER_PORT=3001` setzen und neu starten. |
| `/einrichtung` meldet „Unter /api antwortet nicht der AI_TPI-Server …“ | Der AI_TPI-Server läuft nicht, weil sein Port belegt ist; die Anfragen landen bei der anderen App. Lösung wie in der Zeile darüber. |
| `/einrichtung` meldet „nicht verfügbar“ | Prüfen mit Schritt 6 (Nutzerzahl) und Schritt 8 (`curl`). Mögliche Ursachen: Es existiert noch ein Nutzer (Schritt 4 fehlt), die Weboberfläche läuft noch mit altem `SERVER_PORT` (neu starten), die Seite wurde nicht über `localhost` aufgerufen, oder in der `.env` steht `SETUP_ENABLED=false`. |
| `401` bei `/api/auth/me` im Server-Log | Normal, solange niemand angemeldet ist. |

Weitere Hilfe unter [Fehlerbehebung](/handbuch/fehlerbehebung/).
