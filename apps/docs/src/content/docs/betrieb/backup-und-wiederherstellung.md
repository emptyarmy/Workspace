---
title: Backup und Wiederherstellung
description: Datenbank sichern, Sicherungen rotieren, prüfen und im Notfall wiederherstellen – mit tools/ops/backup.sh und restore.sh.
sidebar:
  order: 2
---

Alle Daten von AI_TPI liegen in **einer** PostgreSQL-Datenbank: Firmen, Nutzer, Assessments, Antworten, Kommentare, Empfehlungen, Audit-Log und Änderungshistorie. Der App-Container selbst hat keine Daten (schreibgeschützt). Für eine vollständige Sicherung braucht es deshalb genau zwei Dinge:

| Was | Wo | Wie sichern |
|---|---|---|
| **Datenbank** | Volume `ai-tpi_db-data` | `tools/ops/backup.sh` (täglich, automatisch) |
| **`.env.production`** mit `SECRET_ENCRYPTION_KEY` | Projektordner auf dem Server | **einmalig** und nach jeder Änderung, getrennt von den Datenbank-Sicherungen (z. B. Passwort-Tresor) |

:::danger[Ohne SECRET_ENCRYPTION_KEY]
SMTP-Passwort und KI-API-Schlüssel stehen verschlüsselt in der Datenbank. Eine Sicherung ohne den passenden Schlüssel lässt sich zwar einspielen, diese Geheimnisse sind dann aber unlesbar und müssen im Admin-Bereich neu eingegeben werden. Alle übrigen Daten bleiben erhalten.
:::

## Sichern

```bash
cd /srv/ai-tpi                       # Projektordner mit docker-compose.prod.yml
tools/ops/backup.sh
```

Das Skript

1. erzeugt mit `pg_dump -Fc` eine komprimierte Sicherung `backups/ai-tpi-JJJJMMTT-HHMMSS.dump` (nur für den Eigentümer lesbar),
2. prüft sie mit `pg_restore --list` (bricht ab, wenn sie leer ist oder keine Tabellen enthält),
3. behält die neuesten **14** Sicherungen und löscht ältere.

| Variable | Standard | Bedeutung |
|---|---|---|
| `BACKUP_DIR` | `./backups` | Zielordner |
| `KEEP` | `14` | Anzahl aufbewahrter Sicherungen |
| `COMPOSE_FILE` / `ENV_FILE` | `docker-compose.prod.yml` / `.env.production` | abweichende Dateien |

Die Sicherung läuft im laufenden Betrieb; PostgreSQL liefert einen in sich stimmigen Stand.

### Automatisch (cron)

```bash
# crontab -e  (Nutzer mit Docker-Rechten)
17 2 * * * cd /srv/ai-tpi && BACKUP_DIR=/srv/backup/ai-tpi KEEP=30 tools/ops/backup.sh >> /var/log/ai-tpi-backup.log 2>&1
```

Den Sicherungsordner zusätzlich auf ein **anderes System** kopieren (Bandsicherung, Objektspeicher, zweiter Server). Eine Sicherung auf derselben Platte schützt nicht vor dem Ausfall des Servers.

## Wiederherstellen

```bash
tools/ops/restore.sh backups/ai-tpi-20261115-021700.dump
```

Nach der Rückfrage (Eingabe `WIEDERHERSTELLEN`):

1. Sicherung prüfen
2. Anwendung anhalten (`docker compose stop app`)
3. Datenbank löschen, neu anlegen und die Sicherung einspielen
4. Anwendung starten – stammt die Sicherung von einer älteren Version, bringen die Migrationen sie beim Start automatisch auf den Stand des Images
5. warten, bis `/api/health` antwortet

:::caution
Die Wiederherstellung **ersetzt** die gesamte Datenbank. Alles, was seit der Sicherung erfasst wurde, ist danach weg. Vorher im Zweifel mit `tools/ops/backup.sh` den aktuellen Stand sichern.
:::

Angemeldete Nutzer bleiben angemeldet, wenn ihre Sitzung in der Sicherung schon bestand; sonst melden sie sich neu an.

### Auf einem neuen Server

1. Projekt auschecken, `.env.production` aus dem Tresor zurücklegen (gleicher `SECRET_ENCRYPTION_KEY`).
2. `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` – legt eine leere Datenbank an.
3. Sicherung kopieren und `tools/ops/restore.sh <datei>` ausführen. Die Ersteinrichtung entfällt; Firmen und Nutzer kommen aus der Sicherung.

## Wiederherstellung üben

Eine Sicherung ist erst etwas wert, wenn die Wiederherstellung einmal geklappt hat. Empfehlung: **vierteljährlich** auf einem Testsystem. Auf demselben Server geht das mit eigenem Compose-Projektnamen und einer eigenen `.env.test` (anderer `APP_PORT`, gleicher `SECRET_ENCRYPTION_KEY`):

```bash
export COMPOSE_PROJECT_NAME=ai-tpi-test ENV_FILE=.env.test
docker compose -f docker-compose.prod.yml --env-file .env.test up -d
RESTORE_CONFIRM=ja tools/ops/restore.sh backups/<neueste>.dump
# … prüfen, danach Testsystem samt Daten entfernen:
docker compose -f docker-compose.prod.yml --env-file .env.test down -v
```

Danach anmelden und Stichproben prüfen: Anzahl Assessments, ein Bericht, Audit-Log der letzten Tage. Ergebnis mit Datum dokumentieren (z. B. in der [Abnahme-Checkliste](/projekt/test/abnahme-checkliste/) bzw. im Betriebshandbuch der Firma).

### Selbsttest der Skripte

`tools/ops/selftest.sh [image]` prüft den ganzen Ablauf in einem eigenen Compose-Projekt (`ai-tpi-selftest`, eigener Port, eigene Datenbank – das Produktivsystem bleibt unberührt): Start, Ersteinrichtung, Sicherung, Rotation, Abweisen einer ungültigen Sicherung, Wiederherstellung, Anmeldung. Die [CI-Pipeline](/entwicklung/ci-pipeline/) führt ihn bei jedem Push aus; auf dem Server ist er nach der Installation ein schneller Nachweis, dass Sicherung und Wiederherstellung dort funktionieren.

## Ohne Docker

Läuft PostgreSQL direkt auf dem Server, gelten dieselben Befehle ohne `docker compose exec`:

```bash
pg_dump -Fc -d "$DATABASE_URL" > ai-tpi-$(date +%Y%m%d-%H%M%S).dump
pg_restore --list ai-tpi-….dump > /dev/null                 # prüfen
# Wiederherstellen: Anwendung stoppen, Datenbank neu anlegen, dann
pg_restore --no-owner --exit-on-error -d "$DATABASE_URL" ai-tpi-….dump
```
