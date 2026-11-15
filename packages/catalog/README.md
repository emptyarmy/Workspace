# packages/catalog – Fragenkatalog

| Datei | Inhalt |
|---|---|
| `catalog.v1.json` | **Maßgebliche Quelle** des Fragenkatalogs: 19 Kernbereiche, 223 Kontrollpunkte, alle Texte auf Deutsch und Englisch, Aufwand, Empfehlungsbaustein, Agile-Attribute (Sicht, Cluster, Verweise); Sicht bei allen KP, bei KP ohne Agile-Gegenstück zugeordnet (`viewSource: "assigned"`) |
| `catalog.schema.json` | JSON-Schema (Draft 2020-12) zur automatischen Prüfung |
| `sources/agile-tpi-2.5.json` | Originaltexte der 108 Agile-TPI-Kontrollpunkte (Referenz für die Zuordnung) |

## Prüfen und Übersicht erzeugen

```bash
python3 tools/catalog/validate.py          # Schema + Konsistenz (IDs, Agile-Zuordnung, Sicht, Voraussetzungen)
python3 tools/catalog/build_overview.py    # erzeugt docs/03_fragenkatalog/05_katalog-v1-uebersicht.md
```

Keine Python-Zusatzpakete nötig: Die Schema-Prüfung nutzt `jsonschema` (≥ 4.18), falls installiert, sonst Node mit `ajv` (`tools/catalog/validate-schema.mjs`, nach `npm install` vorhanden). Die Ausgabe nennt, womit geprüft wurde.

## Regeln
- IDs sind stabil und werden nie umnummeriert (`KBnn.K|E|O.nn`, agil `KBnn.AG.<Sicht><Nr>`, KI `KBnn.<Ebene>.AIn`).
- Änderungen nur im JSON; danach `validate.py` und `build_overview.py` ausführen.
- `dependsOn` (Voraussetzungen): nur bekannte IDs auf gleicher oder niedrigerer Ebene, keine Zyklen, keine Abhängigkeit von agilen bzw. KI-KP, die je nach Umfang wegfallen (prüfen `validate.py` und `npm run test:unit`).
- Status `draft` → `review` → `released`; bei Freigabe `catalogVersion` auf `1.0.0` setzen.
