---
title: Fehlerbehebung
description: Typische Probleme beim Starten, Einrichten und Testen von AI_TPI – mit Ursache und Lösung.
sidebar:
  order: 9
---

## Schnelldiagnose

```bash
docker compose ps                                   # laufen db und mailpit?
curl -s http://localhost:3000/api/health            # bzw. Ihr SERVER_PORT
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|5173|5432|5433) '
```

`/api/health` von AI_TPI antwortet kurz mit `{"status":"ok","db":"up","catalogVersion":"…"}`. Sieht die Antwort anders aus (z. B. mit `redis` oder `elasticsearch`), antwortet auf dem Port **eine andere Anwendung**.

## Start und Ersteinrichtung

### „Die Ersteinrichtung ist nicht verfügbar“, obwohl es noch keinen Nutzer gibt
**Ursache:** Auf Port 3000 läuft eine andere Anwendung; die Weboberfläche fragt diese statt AI_TPI.
**Lösung:** In `.env` `SERVER_PORT=3001` setzen und `npm run dev` neu starten. Weboberfläche und Server lesen den Port beide aus `.env`.

Ob es schon Nutzer gibt:
```bash
docker compose exec db psql -U ai_tpi -d ai_tpi -c "select email, role, status from app_user;"
```

### „Der Anwendungsserver ist nicht erreichbar“
Der API-Server läuft nicht. Im Terminal von `npm run dev` nach Fehlern mit `[server]` suchen. Häufig: Port belegt (`EADDRINUSE`, siehe oben) oder Datenbank nicht erreichbar.

### `DATABASE_URL ist nicht gesetzt`
Die Datei `.env` fehlt: `cp .env.example .env`.

### `connect ECONNREFUSED 127.0.0.1:5433` (oder 5432)
Die Datenbank läuft nicht. Docker Desktop starten, dann `docker compose up -d db mailpit`.

### `role "ai_tpi" does not exist`
Die Verbindung landet bei einem **anderen PostgreSQL** (z. B. Homebrew oder Postgres.app auf Port 5432), nicht im Docker-Container.
**Lösung:** Entweder das lokale PostgreSQL beenden (`brew services stop postgresql@16`) oder Docker auf Port 5433 legen:
1. In `docker-compose.yml`: `- "5433:5432"`
2. In `.env`: `DATABASE_URL=postgres://ai_tpi:ai_tpi@localhost:5433/ai_tpi`
3. `docker compose up -d db`

Sagt **schon** `docker compose exec db psql -U ai_tpi -c "select 1"` „role does not exist“, wurde das Docker-Volume früher mit anderen Zugangsdaten angelegt: `docker compose down -v && docker compose up -d db` (löscht die Daten im Container).

### `createdb: too many command-line arguments`
Die zsh behandelt `#` nicht als Kommentar. Befehle ohne angehängte Kommentare eingeben.

### Der Server startet in Produktion nicht: `SECRET_ENCRYPTION_KEY … ist in production Pflicht`
In `.env` einen Schlüssel mit mindestens 32 Zeichen setzen:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Wird der Schlüssel später geändert, müssen gespeicherte SMTP-Passwörter und API-Schlüssel neu eingegeben werden.

## Anmeldung und Mails

| Problem | Lösung |
|---|---|
| Einladung oder Einmal-Link kommt nicht an | Lokal landen alle Mails in **Mailpit**: `http://localhost:8025`. Bei eigenem SMTP-Server der Firma: Reiter *E-Mail* → **Test-Mail an mich senden**. |
| *Link abgelaufen oder bereits verwendet* | Einmal-Links gelten 30 Minuten und nur einmal; über „Passwort vergessen?“ einen neuen anfordern. |
| Konto gesperrt | Nach 5 Fehlversuchen 15 Minuten warten oder einen Admin das Passwort zurücksetzen lassen. |
| Passwort erfüllt alle Regeln, wird aber abgelehnt | Die Stärke ist „schwach“ (z. B. Wort + Jahreszahl). Ein längeres, weniger vorhersagbares Passwort wählen. |

## Empfehlungen und KI

| Problem | Lösung |
|---|---|
| *Keine Berechtigung …* beim Erzeugen oder Speichern | Nur Assessoren im Team des Assessments dürfen Empfehlungen erzeugen und bearbeiten; Admins, Befragte und Leser lesen nur. Details: [Empfehlungen – Meldungen](/handbuch/empfehlungen/#meldungen-keine-berechtigung). |
| *Der KI-Dienst hat nicht rechtzeitig geantwortet* | Timeout des KI-Moduls erhöhen (5–300 s). Es werden die regelbasierten Empfehlungen angezeigt. |
| *… hat die Anmeldung abgelehnt (HTTP 401)* | API-Schlüssel im Reiter *KI-Konfiguration* erneuern, dann **Verbindung testen**. |
| *Die Antwort … war unbrauchbar* | Das Modell lieferte kein gültiges JSON oder erfundene Kontrollpunkte. Anderes Modell wählen oder die Prompt-Vorlage vereinfachen. |
| Nach dem Update fehlt die Tabelle `recommendation` | `npm run db:migrate` ausführen (Migration `0005_recommendations`). |

## Tests

| Problem | Lösung |
|---|---|
| `sh: playwright: command not found` | `npm install`, danach einmalig `npx playwright install` |
| `Process from config.webServer was not able to start` | Meist ist die Testdatenbank nicht erreichbar oder existiert nicht: `docker compose exec db createdb -U ai_tpi ai_tpi_e2e`. Playwright leitet die Adresse aus `DATABASE_URL` in `.env` ab. |
| Firefox: `Could not find profile folder` (macOS) | Firefox darf den temporären Ordner von macOS nicht nutzen. Dauerhaft: `echo 'export TMPDIR="$HOME/pw-tmp"' >> ~/.zshrc`, `mkdir -p ~/pw-tmp`, neues Terminal. Übergangsweise: `PW_SKIP_FIREFOX=1 npm run test:e2e`. |
| `empfehlungen.spec.ts`: KI-Tests schlagen mit „nicht erreichbar“ fehl | Die Tests rufen den nachgebildeten KI-Dienst unter `http://127.0.0.1:<E2E_SERVER_PORT>/test-llm/…` auf. Der Testserver muss mit `TEST_ENDPOINTS=true` laufen (macht Playwright automatisch). |
| Ab einem bestimmten Test schlagen **alle** weiteren mit `net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5180` fehl (macOS) | Der Vite-Testserver hat sich beendet, weil macOS einem Prozess standardmäßig nur 256 offene Dateien/Verbindungen erlaubt (`ulimit -n`) und bei vielen parallelen Tests jede Seite eine Live-Verbindung hält. Die Playwright-Konfiguration hebt die Grenze für beide Testserver inzwischen selbst auf 10 240 an. Tritt es trotzdem auf: vor dem Lauf `ulimit -n 10240` im selben Terminal ausführen oder weniger Worker nutzen (`npx playwright test --workers=4`). |
| Ports 3100 oder 5180 belegt | Playwright nutzt eigene Ports; abweichend über `E2E_SERVER_PORT` und `E2E_WEB_PORT` setzen. |

## Hinweise ohne Handlungsbedarf

- `npm audit` meldet Schwachstellen mittlerer Schwere in Entwicklungswerkzeugen. Sie betreffen nicht die ausgelieferte Anwendung; `npm audit fix --force` **nicht** blind ausführen, weil es Hauptversionen wechselt.
- `npm warn install-scripts … esbuild, fsevents`: Hinweis neuerer npm-Versionen auf Installationsskripte. Die Pakete funktionieren dennoch.
