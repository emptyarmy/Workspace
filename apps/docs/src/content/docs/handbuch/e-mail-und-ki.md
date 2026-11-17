---
title: E-Mail und KI-Module
description: Mailserver der Firma einstellen und testen; KI-Module für Empfehlungen anlegen, testen und als Standard festlegen.
sidebar:
  order: 7
---

## E-Mail

Admin-Bereich → Reiter **E-Mail** (`/admin?tab=mail`).

Einladungen, Einmal-Links und Hinweise an Personen Ihrer Firma laufen über den hier eingestellten Mailserver.

| Einstellung | Bedeutung |
|---|---|
| **Standard der Installation** | Versand über `sendmail` des Betriebssystems oder den SMTP-Server aus `.env` (lokal: Mailpit) |
| **Eigener SMTP-Server** | Server (Pflicht), Port 1–65535 (Pflicht), TLS von Beginn an (meist Port 465), Benutzername und Passwort (optional) |
| Absender | optional, `qs@firma.de` oder `QS-Team <qs@firma.de>` |

- Das **Passwort** wird verschlüsselt gespeichert und nie wieder angezeigt. Ein leeres Feld behält das gespeicherte Passwort, **Gespeichertes Passwort löschen** entfernt es.
- **Test-Mail an mich senden** verschickt eine Nachricht an Sie über die *gespeicherte* Einstellung und meldet, über welchen Server sie ging. Erst **Speichern**, dann testen – ungespeicherte Änderungen im Formular gelten für den Test noch nicht.

### Wenn die Test-Mail fehlschlägt

Die Meldung nennt den Grund. Die technische Rohmeldung des Mailservers steht nur im Protokoll des Servers (Zeile `test mail failed`).

| Grund in der Meldung | Häufige Ursache | Abhilfe |
|---|---|---|
| Mailserver nicht erreichbar | Servername falsch, Mailserver läuft nicht (lokal: Mailpit nicht gestartet) | Servername und Port prüfen; lokal `docker compose up -d mailpit` |
| Zeitüberschreitung | Port falsch oder von einer Firewall gesperrt | Port beim Anbieter nachsehen (meist 587 oder 465) |
| Anmeldung abgelehnt | Benutzername oder Passwort falsch; Anbieter verlangt ein App-Passwort oder die Freischaltung für externe Programme | Zugangsdaten prüfen, ggf. im Postfach des Anbieters den Zugriff (SMTP/IMAP) erlauben |
| Verschlüsselte Verbindung kam nicht zustande | „TLS von Beginn an“ passt nicht zum Port | **Port 587 ohne**, **Port 465 mit** „TLS von Beginn an“ |
| Nachricht abgelehnt | Absenderadresse gehört nicht zum Postfach | Absender = Adresse des Postfachs, mit dem Sie sich anmelden |

Beim **Standard der Installation** ergänzt die Meldung: Dieser Weg verbindet sich ohne Anmeldung und ohne Verschlüsselung mit dem Server aus `SMTP_HOST`/`SMTP_PORT` (lokal Mailpit). Für einen echten Mailserver mit Zugangsdaten wählen Sie **Eigener SMTP-Server**.

**Beispiel Freemail-Postfach** (z. B. web.de): Server `smtp.web.de`, Port `587`, „TLS von Beginn an“ **aus**, Benutzername = vollständige E-Mail-Adresse, Absender = dieselbe Adresse. Die Angaben anderer Anbieter stehen in deren Hilfe zu „E-Mail-Programm einrichten“.

## KI-Module

Admin-Bereich → Reiter **KI-Konfiguration** (`/admin?tab=ai`).

Jede Firma hat ihre eigenen Module. Empfehlungen einer Firma entstehen ausschließlich mit deren Einstellungen und API-Schlüsseln. Beim Erzeugen der [Handlungsempfehlungen](/handbuch/empfehlungen/) wählt der Assessor ein Modul; das **Standardmodul**, das der Admin hier festlegt, ist vorbelegt. Die **Prompt-Vorlage** ersetzt die Standard-Anweisung an die KI; das geforderte JSON-Antwortformat hängt der Server immer an.

| Modus | Anbieter | Basis-URL (Vorschlag) |
|---|---|---|
| Regelbasiert | – (ohne KI) | – |
| Lokales Modell | Ollama | `http://localhost:11434` |
| | LM Studio | `http://localhost:1234/v1` |
| | OpenAI-kompatibel | eigene Adresse |
| Cloud-Dienst | Anthropic | `https://api.anthropic.com` |
| | OpenAI | `https://api.openai.com/v1` |
| | Azure OpenAI | Adresse Ihrer Azure-Ressource |

Weitere Felder: Modell, API-Schlüssel, Temperatur (0–1), Timeout (5–300 s), max. Tokens, Pseudonymisierung (Standard: an), Kommentare übertragen (Standard: aus), Prompt-Vorlage.

| Regel | Hinweis |
|---|---|
| API-Schlüssel | verschlüsselt gespeichert, danach nur noch als `••••1234` sichtbar; leer lassen = beibehalten |
| Basis-URL | Pflicht außer bei „regelbasiert“; nur `http://` oder `https://` |
| Bezeichnung | je Firma eindeutig |
| Standard | Das erste Modul wird automatisch Standard. Es gibt immer genau eines; wird es gelöscht, rückt ein anderes nach. |
| **Verbindung testen** | Der Server ruft die Modell-Liste des Anbieters ab und meldet *erfolgreich (… ms)*, *nicht erreichbar*, *Zeitüberschreitung*, *Anmeldung abgelehnt*, *unerwartete Antwort* oder *Adresse gesperrt* (link-lokale Adressen und Cloud-Metadaten-Dienste wie `169.254.169.254` sind als Ziel nicht erlaubt; `localhost` und interne Netze schon). |
