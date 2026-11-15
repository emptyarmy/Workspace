---
title: Konventionen
description: Verbindliche Regeln für Code, Inhalte, Sicherheit, Mandantentrennung und Arbeitsweise.
sidebar:
  order: 5
---

Die vollständige, verbindliche Fassung steht in `AGENTS.md` im Projektordner. Bei Widersprüchen gilt: ADRs > `AGENTS.md` > übrige Dokumente.

## Sprache und Benennung

- Dokumentation **Deutsch**; Code, Bezeichner und Commit-Nachrichten **Englisch**.
- TypeScript im Modus `strict`; Vue-Komponenten mit `<script setup lang="ts">`.
- Dateinamen `kebab-case`, Bezeichner `camelCase`, Komponenten `PascalCase`.
- Kontrollpunkt-IDs sind stabil und werden nie umnummeriert: `KB03.K.02`, agil `KB<NN>.AG.<Sicht><Nr>`, KI `KB<NN>.<STUFE>.AI<n>`.

## Inhalte und Texte

- Fragen, Reifegrade, Empfehlungsbausteine, Sicht P/T/O und Voraussetzungen (`dependsOn`) nur in `packages/catalog/catalog.v1.json`; danach `npm run catalog:validate` und `python3 tools/catalog/build_overview.py` (erzeugt die [Katalog-Übersicht](/projekt/fragenkatalog/katalog-v1-uebersicht/)).
- Jeder Kontrollpunkt hat eine Sicht. Stammt sie nicht aus Agile TPI, steht `viewSource: "assigned"` daneben.
- `dependsOn` nennt Kontrollpunkte, die zuerst erfüllt sein sollten: nur bekannte IDs auf gleicher oder niedrigerer Ebene, keine Zyklen, keine Abhängigkeit von agilen bzw. KI-Kontrollpunkten, die je nach Umfang wegfallen. `catalog:validate` und `npm run test:unit` prüfen das.
- Jeder Oberflächentext in **DE und EN**, keine festen Texte in Komponenten.

## Sicherheit

- **CSRF:** Zustandsändernde Aufrufe senden `X-Requested-With: ai-tpi`; im Web übernimmt das `api/client.ts`.
- Validierung immer **im Browser und auf dem Server**; gemeinsame Regeln einmal in `packages/shared`.
- Keine Geheimnisse im Repository; API-Schlüssel und SMTP-Passwörter nur verschlüsselt in der Datenbank.
- Fehlerantworten verraten keine Interna: Fremde Datensätze ergeben 404, „Passwort vergessen“ antwortet immer gleich.

## Mandanten und Rollen

- Jede Abfrage auf fachliche Daten filtert nach `companyId`.
- Genau eine Rolle je Person. Admins lesen Ergebnisse nur der eigenen Firma; andere Firmen nur als aggregierter Benchmark.
- Firmenübergreifende Admin-Aktionen lösen immer eine Hinweis-Mail an die Admins der Zielfirma aus und stehen im Audit-Log beider Firmen.

## Arbeitsweise

1. Vor Änderungen den [Backlog](/projekt/umsetzung/backlog/) und betroffene ADRs lesen.
2. Kleine Schritte; vor jedem Commit `npm run typecheck && npm run lint && npm run test:unit`.
3. Architekturentscheidungen nicht stillschweigend ändern, sondern einen neuen ADR anlegen (Vorlage: [ADR-000](/projekt/entscheidungen/adr-000-vorlage/)).
4. Dateien in `docs/_quellen/` nie verändern.
5. Unklarheiten als Frage in den [offenen Fragen](/projekt/anforderungen/offene-fragen/) festhalten statt raten.
