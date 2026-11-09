---
title: Ersteinrichtung
description: Wie der allererste Admin sich und seine Firma anlegt – ohne Einladung.
sidebar:
  order: 2
---

Der allererste Admin kann keine Einladung erhalten, denn es gibt noch niemanden, der ihn einladen könnte. Er legt sich deshalb bei der **Ersteinrichtung** selbst an und vergibt dabei direkt sein Passwort.

## Ablauf

1. Anwendung starten (`npm run dev`, siehe [Schnellstart](/einstieg/schnellstart/)).
2. **Auf demselben Rechner** im Browser `http://localhost:5173/einrichtung` öffnen.
3. Formular ausfüllen:
   - **Firma:** Firmenname, Firmenkürzel und Branche. Das Kürzel wird aus dem Namen vorgeschlagen (ä→ae, ö→oe, ü→ue, ß→ss) und bildet die Anmeldeadresse `/login/<kürzel>`.
   - **Ihr Konto:** Name, **Firmen-E-Mail-Adresse**, Passwort und Wiederholung.
4. **Einrichtung abschließen.** Sie sind danach Admin und sofort angemeldet.

Die Domain Ihrer E-Mail-Adresse (z. B. `firma.de`) wird automatisch zur zugelassenen Domain der Firma.

## Regeln

| Regel | Grund |
|---|---|
| Nur solange **noch kein Nutzer** existiert | Danach ist `/einrichtung` dauerhaft gesperrt; sonst könnte sich jeder zum Admin machen. |
| Nur über **localhost** | Die Einrichtung soll nur am Server selbst möglich sein, nicht aus dem Netz. Geprüft wird die tatsächliche Verbindungsadresse, nicht fälschbare Header. |
| Keine Freemail-Adresse | `gmail.com`, `web.de`, `gmx.de` usw. sind als Firmen-Domain gesperrt. |
| Passwortregeln | mind. 6 Zeichen, eine Ziffer, ein Großbuchstabe, ein Sonderzeichen, Stärke mindestens „mittel“ (siehe [Anmeldung und Passwort](/handbuch/anmeldung-und-passwort/#passwortregeln)) |
| Abschaltbar | `SETUP_ENABLED=false` in `.env` deaktiviert die Ersteinrichtung ganz, z. B. auf einem öffentlich erreichbaren Server nach der Einrichtung. |

## Meldungen

| Meldung | Bedeutung | Was tun? |
|---|---|---|
| *Die Ersteinrichtung ist nicht verfügbar …* | Es gibt schon einen Nutzer, der Aufruf kam nicht über localhost, oder `SETUP_ENABLED=false`. | Über `/login/<kürzel>` anmelden. |
| *Der Anwendungsserver ist nicht erreichbar.* | Der API-Server läuft nicht. | Terminal von `npm run dev` prüfen; siehe [Fehlerbehebung](/handbuch/fehlerbehebung/). |
| *… meldet einen Fehler (HTTP 503)* | Der Server erreicht die Datenbank nicht. | `docker compose up -d db`, dann neu laden. |

:::caution[Port 3000 belegt?]
Läuft auf Ihrem Rechner bereits eine andere Anwendung auf Port 3000, landen die Anfragen dort und die Seite meldet „nicht verfügbar“. Setzen Sie in `.env` z. B. `SERVER_PORT=3001` und starten Sie `npm run dev` neu.
:::

## Wie geht es weiter?

- Weitere Personen anlegen: [Benutzer und Abteilungen](/handbuch/benutzer-und-abteilungen/)
- Logo, Branche und Domains: [Meine Firma und Branchen](/handbuch/meine-firma-und-branchen/)
