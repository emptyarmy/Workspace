#!/usr/bin/env python3
"""Prüft packages/catalog/catalog.v1.json gegen das Schema und auf fachliche Konsistenz.
Aufruf (im Projektordner):  python3 tools/catalog/validate.py
Voraussetzung:              pip install jsonschema
"""
import json, sys, collections, pathlib
import jsonschema
ROOT = pathlib.Path(__file__).resolve().parents[2] / 'packages' / 'catalog'
cat = json.loads((ROOT / 'catalog.v1.json').read_text(encoding='utf-8'))
schema = json.loads((ROOT / 'catalog.schema.json').read_text(encoding='utf-8'))
agile = json.loads((ROOT / 'sources' / 'agile-tpi-2.5.json').read_text(encoding='utf-8'))['checkpoints']
errors = [f"Schema: {list(e.path)}: {e.message}" for e in
          jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).iter_errors(cat)]
cps = [c for a in cat['keyAreas'] for c in a['checkpoints']]
for i, n in collections.Counter(c['id'] for c in cps).items():
    if n > 1: errors.append(f'Doppelte ID: {i}')
for a in cat['keyAreas']:
    for c in a['checkpoints']:
        if c['keyArea'] != a['id']: errors.append(f"{c['id']}: keyArea passt nicht zu {a['id']}")
used = collections.Counter(r for c in cps for r in c.get('agileRefs', []))
for x in agile:
    if used[x['id']] != 1: errors.append(f"Agile-Punkt {x['id']} ist {used[x['id']]}x zugeordnet (erwartet: 1x)")
if errors:
    print('\n'.join(errors)); print(f'FEHLER: {len(errors)}'); sys.exit(1)
print(f'OK – {len(cat["keyAreas"])} Kernbereiche, {len(cps)} Kontrollpunkte, alle {len(agile)} Agile-Punkte genau einmal zugeordnet.')
