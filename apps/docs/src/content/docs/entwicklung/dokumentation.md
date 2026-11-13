---
title: Dokumentation pflegen
description: Aufbau dieser Astro/Starlight-Seite, Übernahme der Projektdokumentation und Regeln für neue Seiten.
sidebar:
  order: 6
---

Diese Seite ist mit **[Astro](https://astro.build)** und dem Dokumentations-Theme **[Starlight](https://starlight.astro.build)** gebaut und liegt in `apps/docs`.

## Dokumentation im Browser lesen

Die Dokumentation läuft unabhängig von der Anwendung. Am besten in einem **zweiten Terminal** im Projektordner starten, damit `npm run dev` im ersten weiterläuft.

### Variante A: Entwicklungsserver (zum Schreiben)

```bash
npm run docs:dev
```

Dann **http://localhost:4321** öffnen. Änderungen an `.md`-Dateien erscheinen sofort, auch Änderungen in `docs/`. Die Volltextsuche funktioniert hier nicht.

### Variante B: gebaute Fassung (zum Lesen, mit Suche)

```bash
npm run docs:build     # statische Seite nach apps/docs/dist bauen
npm run docs:preview   # gebaute Seite ausliefern: http://localhost:4321
```

`docs:build` erzeugt alle Seiten und den Suchindex einmalig. `docs:preview` startet nur einen schlanken Server, der diese fertigen Dateien ausliefert; es wird nichts neu übersetzt. Nach Änderungen an den Inhalten `docs:build` erneut ausführen.

:::caution[Nicht per Doppelklick öffnen]
`apps/docs/dist/index.html` direkt im Browser (`file://…`) zu öffnen funktioniert nicht richtig: Links, Styles und Suche verwenden absolute Pfade wie `/handbuch/…` und brauchen einen Webserver. Statt `docs:preview` geht auch jeder andere statische Server, z. B. `npx serve apps/docs/dist`.
:::

### Anderen Port verwenden

Ist Port 4321 belegt, den Port beim Start mitgeben. `DOCS_PORT` wird aus der Umgebung gelesen, **nicht** aus der `.env`:

```bash
DOCS_PORT=4322 npm run docs:dev
DOCS_PORT=4322 npm run docs:preview
```

### Beenden

Im Terminal `Ctrl+C`.

### „Another astro preview server is already running“

Ein früher gestarteter `docs:preview` läuft noch, z. B. in einem anderen oder geschlossenen Terminal. Die Meldung nennt URL und PID.

| Ziel | Befehl |
|---|---|
| Laufenden Server einfach nutzen | URL aus der Meldung öffnen. Er liefert den Stand von `apps/docs/dist` aus, nach `docs:build` also automatisch den neuen Stand. |
| Laufenden Server beenden | `npm exec -w @ai-tpi/docs -- astro preview stop` |
| Ersetzen und neu starten | `npm run preview -w @ai-tpi/docs -- --force` |

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

Die Volltextsuche (Pagefind) wird beim Bauen erzeugt und funktioniert nur in der gebauten Fassung (Variante B oben).
