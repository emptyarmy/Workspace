---
title: Update und Rollback
description: Neue Version einspielen, prüfen und bei Problemen auf die vorige Version zurückgehen; Updates von Basis-Images und PostgreSQL.
sidebar:
  order: 3
---

Versionen sind Git-Tags (`v1.0.0`, `v1.1.0` …), die Änderungen stehen in `CHANGELOG.md`. Jedes Image trägt die Version im Namen (`APP_IMAGE=ai-tpi:v1.1.0` in `.env.production`). So bleibt das vorige Image für einen Rollback auf dem Server.

## Update

```bash
cd /srv/ai-tpi
tools/ops/backup.sh                                   # 1. Sicherung VOR dem Update
git fetch --tags && git checkout v1.1.0               # 2. neue Version
sed -i 's/^APP_IMAGE=.*/APP_IMAGE=ai-tpi:v1.1.0/' .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build   # 3. bauen und tauschen
docker compose -f docker-compose.prod.yml --env-file .env.production logs app | tail   # 4. prüfen
```

Beim Start führt der Container die neuen Migrationen aus („Migration und Stammdaten: OK“). Die Anwendung ist dabei für einige Sekunden nicht erreichbar; laufende Eingaben im Fragebogen zeigen kurz „Nicht gespeichert“ mit **Erneut versuchen**. Updates deshalb außerhalb der Erfassungszeiten einspielen und die Nutzer vorher informieren.

**Nach dem Update prüfen** (5 Minuten):

- `docker compose … ps` zeigt `app` als `healthy`
- Anmeldung als Admin; *Admin-Bereich → E-Mail* → Test-Mail
- ein Assessment öffnen: Fragebogen, Bericht, Empfehlungen
- Protokoll ohne Fehler (`logs app | grep -i error`)

## Rollback

Migrationen laufen nur vorwärts. Ein älteres Image passt deshalb nicht zwingend zur Datenbank einer neueren Version. Der sichere Rollback ist: **vorige Version + Sicherung von vor dem Update**.

```bash
git checkout v1.0.0
sed -i 's/^APP_IMAGE=.*/APP_IMAGE=ai-tpi:v1.0.0/' .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d      # vorhandenes Image, kein Build
tools/ops/restore.sh backups/ai-tpi-<vor-dem-update>.dump
```

Daten, die zwischen Update und Rollback erfasst wurden, gehen dabei verloren. Steht im `CHANGELOG.md` bei einer Version „ohne Datenbankänderung“, genügt der Wechsel des Images ohne Wiederherstellung.

## Sicherheitsupdates der Basis-Images

Node.js und PostgreSQL bekommen regelmäßig Sicherheitsupdates, ohne dass sich AI_TPI ändert. Monatlich neu bauen und dabei die Basis-Images aktualisieren:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build --pull app
docker compose -f docker-compose.prod.yml --env-file .env.production pull db
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Abhängigkeiten der Anwendung prüft die [CI-Pipeline](/entwicklung/ci-pipeline/) bei jedem Push mit `npm audit`.

## PostgreSQL-Hauptversion wechseln

Ein Wechsel der Hauptversion (z. B. 16 → 17) braucht ein neues Datenverzeichnis. Weg über Sicherung und Wiederherstellung:

1. `tools/ops/backup.sh`
2. `docker compose … down` (Volume bleibt erhalten – als Rückweg)
3. in `.env.production` `POSTGRES_IMAGE=postgres:17-alpine` setzen und in `docker-compose.prod.yml` das Volume umbenennen (z. B. `db-data-17`)
4. `docker compose … up -d`, dann `tools/ops/restore.sh backups/<eben erstellt>.dump`
5. Nach erfolgreicher Prüfung das alte Volume löschen (`docker volume rm ai-tpi_db-data`)

AI_TPI ist mit PostgreSQL 16 getestet (CI und lokale Entwicklung).
