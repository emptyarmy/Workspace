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

## Voraussetzungen

- Docker Desktop läuft.
- Im Projektordner liegt eine `.env` (Vorlage: `.env.example`).
- `DATABASE_URL` in der `.env` zeigt auf die Docker-Datenbank, z. B. `postgres://ai_tpi:ai_tpi@localhost:5433/ai_tpi`.

## Schritte

Alle Befehle im Terminal im Projektordner ausführen.

```bash
cd ~/Documents/Workspace/Claude_codebase/AI_TPI
```

### 1. Laufende App beenden

Läuft `npm run dev` noch, im betreffenden Terminal mit `Ctrl+C` beenden. Sonst hält der Server offene Verbindungen und Sitzungen.

### 2. Datenbank und Mailserver starten

```bash
docker compose up -d db mailpit
```

### 3. Datenbank leeren

```bash
docker compose exec db psql -U ai_tpi -d ai_tpi -c "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;"
```

Das entfernt alle Tabellen und die Migrationshistorie. Erwartete Ausgabe: `DROP SCHEMA`, `DROP SCHEMA`, `CREATE SCHEMA`. Hinweise wie `drop cascades to …` sind normal.

### 4. Pakete installieren (falls nötig)

```bash
npm install
```

Nur nötig nach einem frischen Checkout oder geänderten Abhängigkeiten.

### 5. Tabellen und Stammdaten neu anlegen

```bash
npm run db:migrate
```

Legt alle Tabellen neu an und befüllt die Stammdaten (Branchenliste, Freemail-Sperrliste).

### 6. App starten

```bash
npm run dev
```

### 7. Ersteinrichtung durchführen

Im Browser **auf demselben Rechner** öffnen:

```text
http://localhost:5173/einrichtung
```

Das erste dort angelegte Konto wird Admin. Details unter [Ersteinrichtung](/handbuch/ersteinrichtung/).

## Optional

### Alte E-Mails löschen

Mailpit (`http://localhost:8025`) öffnen und **Delete all** wählen. Sonst bleiben Einladungs- und Reset-Mails aus der Zeit vor dem Zurücksetzen sichtbar; ihre Links sind ungültig.

### Docker-Volume komplett neu anlegen

Statt Schritt 3 lässt sich auch das ganze Datenbank-Volume verwerfen. Das ist gründlicher, z. B. wenn die Datenbank beschädigt ist oder Rolle und Passwort nicht mehr stimmen:

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
| `Cannot connect to the Docker daemon` | Docker Desktop starten, dann Schritt 2 wiederholen. |
| `service "db" is not running` | Schritt 2 ausführen. |
| `role "ai_tpi" does not exist` bei `db:migrate` | `DATABASE_URL` zeigt auf ein anderes PostgreSQL (meist Port 5432). Auf den Docker-Port (5433) umstellen. |
| `connect ECONNREFUSED …:5433` | Datenbank-Container läuft nicht → Schritt 2. |
| `/einrichtung` meldet „nicht verfügbar“ | Es existiert noch ein Nutzer (Schritt 3 prüfen) oder die Seite wurde nicht über `localhost` aufgerufen. |
| `EADDRINUSE` beim Start | Port belegt, z. B. durch eine andere App auf 3000. In der `.env` `SERVER_PORT=3001` setzen. |

Weitere Hilfe unter [Fehlerbehebung](/handbuch/fehlerbehebung/).
