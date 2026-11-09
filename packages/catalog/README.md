# packages/catalog – Fragenkatalog

| Datei | Inhalt |
|---|---|
| `catalog.v1.json` | **Maßgebliche Quelle** des Fragenkatalogs: 19 Kernbereiche, 223 Kontrollpunkte, alle Texte auf Deutsch und Englisch, Aufwand, Empfehlungsbaustein, Agile-Attribute (Sicht, Cluster, Verweise) |
| `catalog.schema.json` | JSON-Schema (Draft 2020-12) zur automatischen Prüfung |
| `sources/agile-tpi-2.5.json` | Originaltexte der 108 Agile-TPI-Kontrollpunkte (Referenz für die Zuordnung) |

## Prüfen und Übersicht erzeugen

```bash
pip install jsonschema
python3 tools/catalog/validate.py          # Schema + Konsistenz (IDs, Agile-Zuordnung)
python3 tools/catalog/build_overview.py    # erzeugt docs/03_fragenkatalog/05_katalog-v1-uebersicht.md
```

## Regeln
- IDs sind stabil und werden nie umnummeriert (`KBnn.K|E|O.nn`, agil `KBnn.AG.<Sicht><Nr>`, KI `KBnn.<Ebene>.AIn`).
- Änderungen nur im JSON; danach `validate.py` und `build_overview.py` ausführen.
- Status `draft` → `review` → `released`; bei Freigabe `catalogVersion` auf `1.0.0` setzen.
