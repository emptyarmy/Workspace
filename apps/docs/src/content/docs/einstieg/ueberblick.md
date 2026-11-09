---
title: Überblick
description: Ziel, Funktionsumfang und Aufbau der Anwendung AI_TPI.
sidebar:
  order: 1
---

**AI_TPI** ist eine Webanwendung für die **kontinuierliche Verbesserung des Testprozesses**. Fachbereiche mehrerer Firmen und Abteilungen bewerten ihren Testprozess anhand eines Fragenkatalogs, die Ergebnisse werden zusammengeführt, grafisch ausgewertet und durch **KI-gestützte Handlungsempfehlungen** ergänzt.

## Fachliche Grundlage

- **TPI NEXT®** ist das führende Modell: 16 Kernbereiche mit den Reifegraden *Initial*, *Kontrolliert*, *Effizient* und *Optimierend*.
- Ergänzungen aus **Agile TPI** sind in die Kernbereiche eingearbeitet.
- **Drei zusätzliche KI-Kernbereiche** bewerten den Einsatz künstlicher Intelligenz in Qualitätssicherung, Anforderungsprüfung, Testautomatisierung, Entwicklung und Dokumentation.
- Insgesamt: **19 Kernbereiche, 223 Kontrollpunkte**, zweisprachig (Deutsch/Englisch). Details: [Katalog v1 – Übersicht](/projekt/fragenkatalog/katalog-v1-uebersicht/).

## Funktionsumfang

| Bereich | Inhalt | Stand |
|---|---|---|
| Anmeldung | E-Mail + Passwort, Einladung per Mail, Einmal-Link, Sperre nach Fehlversuchen, SSO-fähig vorbereitet | umgesetzt |
| Admin-Bereich | Benutzer, Abteilungen, Firma und Domains, Branchen, andere Firmen, E-Mail, KI-Module, Audit-Log | umgesetzt |
| Mandanten | Mehrere Firmen mit eigener Domain, eigenem Logo und eigener Konfiguration; strikte Datentrennung | umgesetzt |
| Fragebogen | Antworten je Abteilung, Kommentare mit Autor/Quelle | geplant (Phase 5) |
| Zusammenführung | Assessor führt Abteilungsantworten zusammen; Änderungshistorie | geplant |
| Bericht | Grafischer Bericht nach Vorbild des Excel-Werkzeugs, Benchmark mit Branche und allen Firmen | geplant |
| Empfehlungen | KI-gestützt, kurzfristig (< 1 Monat) und langfristig (≥ 1 Monat) | geplant |

## Technischer Aufbau

```mermaid
flowchart LR
  B[Browser<br/>Vue 3 + TypeScript] -- "/api (JSON, Cookie-Sitzung)" --> S[API-Server<br/>Fastify + TypeScript]
  S --> DB[(PostgreSQL 16)]
  S --> M[Mailserver<br/>je Firma oder Standard]
  S --> K[KI-Module<br/>je Firma: regelbasiert, lokal, Cloud]
  C[packages/catalog<br/>Fragenkatalog JSON] --> S
  SH[packages/shared<br/>Regeln für Client und Server] --> B
  SH --> S
```

- **Monorepo** mit npm-Workspaces: `apps/web`, `apps/server`, `apps/docs` (diese Seite), `packages/shared`, `packages/catalog`.
- Alle Regeln (Passwort, E-Mail-Domain, Rollen) stehen einmal in `packages/shared` und gelten in Browser **und** Server.
- Details: [Architektur](/projekt/architektur/architektur/) und [Projektstruktur](/entwicklung/projektstruktur/).

## Rollen

Jede Person hat **genau eine** Rolle: **Admin**, **Assessor**, **Befragter** oder **Leser**. Was jede Rolle darf, steht unter [Rollen und Rechte](/handbuch/rollen-und-rechte/).
