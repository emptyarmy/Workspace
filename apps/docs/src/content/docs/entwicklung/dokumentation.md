---
title: Dokumentation pflegen
description: Aufbau dieser Astro/Starlight-Seite, Übernahme der Projektdokumentation und Regeln für neue Seiten.
sidebar:
  order: 6
---

Diese Seite ist mit **[Astro](https://astro.build)** und dem Dokumentations-Theme **[Starlight](https://starlight.astro.build)** gebaut und liegt in `apps/docs`.

```bash
npm run docs:dev       # Entwicklungsserver mit Neuladen: http://localhost:4321
npm run docs:build     # statische Seite nach apps/docs/dist
npm run docs:preview   # gebaute Seite ansehen
```

## Aufbau

```text
apps/docs/
├── astro.config.mjs              Titel, Sprache, Seitenleiste, Erweiterungen
├── scripts/sync-docs.mjs         übernimmt docs/ → src/content/docs/projekt
├── src/
│   ├── content.config.ts         Inhaltssammlung von Starlight
│   ├── content/docs/
│   │   ├── index.mdx             Startseite
│   │   ├── einstieg/             Überblick, Schnellstart
│   │   ├── handbuch/             Bedienung für Admins und Fachanwender
│   │   ├── entwicklung/          Entwicklerdokumentation
│   │   ├── referenz/             Konfiguration, API, Fehlercodes, Skripte
│   │   ├── 404.md                Seite „nicht gefunden“
│   │   └── projekt/              ERZEUGT aus docs/ – nicht bearbeiten, nicht einchecken
│   ├── content/i18n/de.json      eigene Oberflächentexte von Starlight
│   ├── components/Head.astro     lädt Mermaid für Diagramme
│   ├── plugins/remark-mermaid.mjs  ```mermaid → Diagramm
│   └── styles/custom.css         Farben passend zur Anwendung
└── package.json
```

## Zwei Arten von Inhalten

| Art | Ort | Pflege |
|---|---|---|
| Handbuch, Entwicklung, Referenz | `apps/docs/src/content/docs/` | direkt hier als `.md`/`.mdx` |
| Projektdokumentation (Anforderungen, Architektur, Tests, ADRs) | `docs/` im Projektordner | **dort** bearbeiten; `npm run docs:dev` und `docs:build` übernehmen sie automatisch |

`scripts/sync-docs.mjs` macht bei der Übernahme Folgendes:

- Es entfernt Nummernpräfixe (`04_architektur/07_admin-bereich.md` → `/projekt/architektur/admin-bereich/`); die Nummer bestimmt die Reihenfolge.
- Es übernimmt die erste Überschrift als Titel und den ersten Absatz als Beschreibung.
- Es macht Verweise wie `` `07_admin-bereich.md` `` zu Links.
- Es lässt `docs/_quellen/` aus.

## Neue Seite anlegen

1. Datei anlegen, z. B. `src/content/docs/handbuch/fragebogen.md`.
2. Frontmatter mit `title`, `description` und der Position in der Seitenleiste:
   ```md
   ---
   title: Fragebogen ausfüllen
   description: Antworten je Abteilung erfassen und kommentieren.
   sidebar:
     order: 10
   ---
   ```
3. Inhalt in Markdown. Die Seitenleiste ergänzt sich je Ordner automatisch.

## Gestaltungsmittel

- **Hinweisboxen:** `:::note`, `:::tip`, `:::caution`, `:::danger`, optional mit Titel `:::tip[Titel]`
- **Diagramme:** Codeblöcke mit der Sprache `mermaid` werden als Diagramm gezeichnet, passend zum Hell- oder Dunkelmodus.
- **Komponenten** (nur in `.mdx`): `Card`, `CardGrid`, `LinkCard`, `Tabs`, `Steps` aus `@astrojs/starlight/components`
- **Interne Links** als absolute Pfade ohne Dateiendung, z. B. `/handbuch/ersteinrichtung/`

Die Volltextsuche (Pagefind) wird beim Bauen erzeugt und funktioniert in `docs:build` / `docs:preview`.
