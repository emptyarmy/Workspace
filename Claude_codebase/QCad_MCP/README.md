# qcad-mcp

MCP-Server, mit dem ein KI-Assistent (Claude Code, Claude Desktop, …) 2D-Zeichnungen in
[QCAD](https://qcad.org) erstellt: Geometrie, Texte, Bemaßungen, Schraffuren und Layer.
Die Ergebnisse werden als DXF/DWG gespeichert, als PNG-Vorschau zurückgegeben oder direkt in QCAD geöffnet.

## Voraussetzungen

- Node.js ≥ 20
- QCAD 3.x. Die PNG-Vorschau (`dwg2bmp`) und der DWG-Export gibt es nur in **QCAD Professional**;
  mit der Community Edition funktionieren DXF-Speichern und das Öffnen in QCAD.

QCAD wird automatisch gefunden (macOS: `/Applications/QCAD-Pro.app`, `/Applications/QCAD.app`;
Linux: `~/opt/qcad*`, `/opt/qcad*`). Andernfalls setzt man `QCAD_DIR` auf das Verzeichnis mit dem
`qcad`-Starter (macOS: `…/QCAD-Pro.app/Contents/Resources`).

## Installation

```sh
npm install
npm run build
```

### In Claude Code

Die Datei `.mcp.json` in diesem Verzeichnis registriert den Server für dieses Projekt.
Für alle Projekte:

```sh
claude mcp add --scope user qcad -- node /Users/miku/Documents/Workspace/Claude_codebase/QCad_MCP/dist/index.js
```

### In Claude Desktop

In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qcad": {
      "command": "node",
      "args": ["/Users/miku/Documents/Workspace/Claude_codebase/QCad_MCP/dist/index.js"]
    }
  }
}
```

## Konfiguration

| Variable              | Bedeutung                                              | Standard      |
|-----------------------|--------------------------------------------------------|---------------|
| `QCAD_DIR`            | QCAD-Verzeichnis mit dem `qcad`-Starter               | automatisch   |
| `QCAD_MCP_OUTPUT_DIR` | Ziel für relative Dateipfade                           | `./drawings`  |

## Werkzeuge

| Tool              | Zweck |
|-------------------|-------|
| `new_drawing`     | Neue Zeichnung (Einheit, Bemaßungsgenauigkeit, optional auf Basis einer bestehenden DXF/DWG) |
| `add_layer`       | Layer mit Farbe, Linientyp und Linienstärke anlegen/ändern |
| `add_entities`    | Linie, Kreis, Bogen, Polylinie (mit Bögen), Rechteck, Ellipse, Punkt, Text, Bemaßungen (linear, ausgerichtet, Radius, Durchmesser, Winkel), Schraffur |
| `remove_entities` | Objekte über ihre ID entfernen |
| `get_drawing`     | Aktuellen Stand als JSON |
| `save_drawing`    | Als `.dxf` oder `.dwg` speichern |
| `preview_drawing` | PNG-Vorschau zur Kontrolle |
| `open_in_qcad`    | Zeichnung in der QCAD-Oberfläche öffnen |
| `run_qcad_script` | Beliebiges QCAD-ECMAScript ausführen (Blöcke, Transformationen, bestehende Dateien bearbeiten) |

Koordinaten sind in Zeichnungseinheiten (Standard mm), Y zeigt nach oben, Winkel in Grad gegen den Uhrzeigersinn.

## Beispiel

> Zeichne eine Platte 120 × 80 mm mit einer Bohrung Ø30 in der Mitte, Mittellinien,
> Außenbemaßung und Durchmesserbemaßung. Speichere sie als platte.dwg und öffne sie in QCAD.

## Entwicklung

```sh
npm run dev     # tsc --watch
npm test        # build + End-to-End-Tests (benötigen lokales QCAD)
```
