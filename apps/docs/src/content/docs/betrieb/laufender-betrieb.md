---
title: Laufender Betrieb
description: Überwachung, Protokolle, regelmäßige Aufgaben und Notfälle im Betrieb von AI_TPI.
sidebar:
  order: 4
---

## Überwachung

| Prüfung | Befehl / Adresse | Erwartung |
|---|---|---|
| Gesundheit | `GET /api/health` (über den Reverse Proxy oder `127.0.0.1:3000`) | `{"status":"ok","db":"up",…}`; bei Datenbankproblemen `{"status":"degraded","db":"down"}` – der Container-Healthcheck meldet dann `unhealthy`. Im Monitoring auf `"status":"ok"` prüfen, nicht nur auf HTTP 200 |
| Container-Status | `docker compose -f docker-compose.prod.yml ps` | `app` und `db` `healthy` |
| Zertifikat | Reverse Proxy | gültig, automatische Erneuerung aktiv |
| Sicherung | Protokoll von `tools/ops/backup.sh` | täglich „✓ … Tabellen“ |

Für ein externes Monitoring (z. B. Uptime Kuma, Zabbix, Prometheus Blackbox) genügt `/api/health` im Minutentakt. Die Adresse braucht keine Anmeldung und verrät keine Daten.

## Protokolle

Der Server schreibt JSON-Zeilen nach stdout (`docker compose … logs app`). Cookies, Passwörter, Tokens und API-Schlüssel sind geschwärzt. `LOG_LEVEL` steuert die Menge (`info` im Betrieb, `debug` zur Fehlersuche, danach zurückstellen).

Fachliche Ereignisse (Anmeldungen, Fehlversuche, Sperren, Änderungen an Benutzern, Firmen, E-Mail- und KI-Einstellungen) stehen im **Audit-Log** der Anwendung (*Admin-Bereich → Audit-Log*, CSV-Export) – je Firma getrennt.

Damit die Container-Protokolle die Platte nicht füllen, die Docker-Protokollrotation einschalten (`/etc/docker/daemon.json`):

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "5" } }
```

## Regelmäßige Aufgaben

| Wann | Aufgabe |
|---|---|
| täglich (automatisch) | Sicherung mit `tools/ops/backup.sh`, Kopie auf ein anderes System |
| wöchentlich | Protokoll der Sicherung und `logs app` auf Fehler durchsehen; freien Platz prüfen (`df -h`, `docker system df`) |
| monatlich | Basis-Images aktualisieren ([Update und Rollback](/betrieb/update-und-rollback/#sicherheitsupdates-der-basis-images)); Liste der Admins je Firma prüfen |
| vierteljährlich | [Wiederherstellung üben](/betrieb/backup-und-wiederherstellung/#wiederherstellung-üben); KI-API-Schlüssel und SMTP-Passwort nach Firmenregel erneuern |
| nach der Ersteinrichtung | `SETUP_ENABLED=false` setzen |

## Notfälle

| Lage | Vorgehen |
|---|---|
| Anwendung nicht erreichbar | `docker compose … ps` und `logs app`. Häufig: Datenbank nicht bereit, Platte voll, `.env.production` fehlerhaft (die Meldung nennt die Variable). [Fehlerbehebung](/handbuch/fehlerbehebung/) |
| Mails kommen nicht an | *Admin-Bereich → E-Mail → Test-Mail an mich senden*; die Meldung nennt die Ursache (Server, Port, Zugangsdaten). Danach können Betroffene über „Passwort vergessen?“ einen neuen Einmal-Link anfordern |
| Ein Nutzer ist gesperrt | Nach 5 Fehlversuchen 15 Minuten Sperre – abwarten oder „Passwort vergessen?“. Ein Admin kann das Passwort zurücksetzen |
| Einziger Admin einer Firma hat keinen Zugang mehr | „Passwort vergessen?“ (braucht funktionierende Mail). Sonst: ein Admin einer **anderen** Firma setzt das Passwort per E-Mail-Adresse zurück ([Andere Firmen](/handbuch/andere-firmen/#passwort-für-nutzer-einer-anderen-firma)). Vorbeugend je Firma zwei Admins |
| Verdacht auf kompromittiertes Konto | Konto im Admin-Bereich deaktivieren (beendet die Sitzungen), Audit-Log der Firma prüfen, Passwort zurücksetzen |
| `SECRET_ENCRYPTION_KEY` verloren oder kompromittiert | neuen Schlüssel setzen, `up -d`; danach SMTP-Passwort und alle KI-API-Schlüssel im Admin-Bereich neu eingeben (alte sind nicht mehr lesbar) |
| Daten versehentlich gelöscht | aktuellen Stand sichern, dann auf einem **Testsystem** die letzte Sicherung von davor einspielen und die Daten von dort übernehmen – oder, wenn wenig Arbeit dazwischen liegt, das Produktivsystem [wiederherstellen](/betrieb/backup-und-wiederherstellung/#wiederherstellen) |

## Grenzen von Release 1

- **Eine Instanz:** Rate-Limits und Live-Aktualisierung (Server-Sent Events) gelten je Prozess. Mehrere Instanzen hinter einem Lastverteiler sind nicht vorgesehen (ADR-008).
- **Keine automatische Löschfrist** für Audit-Log und Änderungshistorie; die Daten bleiben, bis die Firma oder das Assessment gelöscht wird.
