# Struktur des Fragenkatalogs

## 1. Hierarchie

```
Katalog (Version, Sprache-unabhängig)
└── Kernbereich (KB01 … KB19)
    ├── Beschreibung je Ebene (I, K, E, O)
    └── Kontrollpunkt (ID, Ebene, Texte DE/EN, Attribute)
```

## 2. Attribute je Kontrollpunkt

| Attribut | Pflicht | Beschreibung | Beispiel |
|---|---|---|---|
| `id` | ✔ | stabile ID: `KBnn.K\|E\|O.nn`, agil `KBnn.AG.<Sicht><Nr>`, KI `KBnn.<Ebene>.AIn` | `KB03.K.02`, `KB10.AG.11`, `KB15.E.AI2` |
| `keyArea` | ✔ | Kernbereich | `KB03` |
| `level` | ✔ | `controlled` / `efficient` / `optimizing` | `controlled` |
| `text.de` / `text.en` | ✔ | Kontrollpunkt-Text | „Die Teststrategie basiert auf einer Produktrisikoanalyse.“ |
| `hint.de` / `hint.en` | – | Erläuterung / Beispiel für Befragte | |
| `view` | – | Agile-TPI-Sicht `P` / `T` / `O` | `T` |
| `cluster` | – | Agile-TPI-Cluster `A`–`G` (Priorität) | `B` |
| `effort` | ✔ | Umsetzungsaufwand bei Nichterfüllung `S` / `M` / `L` | `S` |
| `tags` | – | z. B. `AI`, `agile` | `["AI"]` |
| `dependsOn` | – | Voraussetzungen (andere KP-IDs) | `["KB03.K.01"]` |
| `recommendation.de/en` | ✔ | Textbaustein für die Handlungsempfehlung | „Führen Sie eine dokumentierte Produktrisikoanalyse ein …“ |
| `source` | ✔ | Herkunft | `TPI_NEXT_DE`, `AGILE_TPI_EN`, `AI_EXT` |
| `agileRef` | – | Original-ID aus Agile TPI | `3.1.2` |

## 3. Ablage (umgesetzt am 09.11.2026)

- `packages/catalog/catalog.v1.json` – **eine** Datei mit Struktur, Attributen und allen Texten in DE und EN (`{"de": …, "en": …}` je Textfeld). Getrennte i18n-Dateien entfallen, damit Text und ID nie auseinanderlaufen; die Oberflächentexte der App liegen weiterhin in `apps/web/src/i18n`.
- `packages/catalog/catalog.schema.json` – JSON-Schema, geprüft durch `tools/catalog/validate.py` (später auch im Unit-Test).
- Lesbare Übersicht: `05_katalog-v1-uebersicht.md` (generiert).

## 4. Pflege

Der Katalog soll **ohne Programmierkenntnisse** erweiterbar sein. Optionen (F-12):
- a) direkte JSON-Pflege im Repository,
- b) Import aus einer Excel-Vorlage (eine Zeile je KP, Spalten DE/EN) per Build-Skript,
- c) Admin-Oberfläche in der App.

## 5. Arbeitspakete Katalog

| AP | Inhalt |
|---|---|
| ☑ AP-2.1 | Deutsche KP aus Word extrahieren, bereinigen, firmenspezifische Bewertungstexte abtrennen (→ Beispiel-Assessment) |
| ☑ AP-2.2 | Fehlenden KB2 „Grad der Beteiligung“ ergänzen |
| ☑ AP-2.3 | Englische Übersetzung erstellen, mit Agile-TPI-Formulierungen abgleichen |
| ☑ AP-2.4 | Sicht/Cluster aus Agile TPI zuordnen (soweit sinnvoll) |
| ☑ AP-2.5 | Aufwandsklasse und Empfehlungsbaustein je KP ergänzen |
| ☑ AP-2.6 | KI-Erweiterung finalisieren und übersetzen |
| ☐ AP-2.7 | Fachliches Review und Freigabe durch den Auftraggeber |
