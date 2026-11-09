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
- **Test-Mail an mich senden** verschickt eine Nachricht an Sie über die *gespeicherte* Einstellung und meldet, über welchen Server sie ging. Schlägt der Versand fehl, erscheint eine Fehlermeldung.

## KI-Module

Admin-Bereich → Reiter **KI-Konfiguration** (`/admin?tab=ai`).

Jede Firma hat ihre eigenen Module. Empfehlungen einer Firma entstehen ausschließlich mit deren Einstellungen und API-Schlüsseln. Später wählt der Assessor oder Admin je Bericht ein Modul; das **Standardmodul** ist vorbelegt.

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
| **Verbindung testen** | Der Server ruft die Modell-Liste des Anbieters ab und meldet *erfolgreich (… ms)*, *nicht erreichbar*, *Zeitüberschreitung*, *Anmeldung abgelehnt* oder *unerwartete Antwort*. |
