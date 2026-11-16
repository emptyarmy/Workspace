#!/usr/bin/env python3
"""Prüft packages/catalog/catalog.v1.json gegen das Schema und auf fachliche Konsistenz.
Aufruf (im Projektordner):  python3 tools/catalog/validate.py   bzw.   npm run catalog:validate
Keine Zusatzpakete nötig: Ist das Python-Paket „jsonschema“ (≥ 4.18) installiert, prüft es das Schema;
sonst übernimmt das Node mit ajv (tools/catalog/validate-schema.mjs, nach `npm install` vorhanden).
"""
import json, sys, collections, pathlib, shutil, subprocess
try:
    import jsonschema
    HAS_SCHEMA = hasattr(jsonschema, 'Draft202012Validator')
except ImportError:
    jsonschema = None
    HAS_SCHEMA = False
ROOT = pathlib.Path(__file__).resolve().parents[2] / 'packages' / 'catalog'
cat = json.loads((ROOT / 'catalog.v1.json').read_text(encoding='utf-8'))
schema = json.loads((ROOT / 'catalog.schema.json').read_text(encoding='utf-8'))
# Die Originalquelle (packages/catalog/sources/) wird nicht eingecheckt. Fehlt sie (CI, frischer Checkout),
# entfällt nur der Abgleich „jeder Agile-Punkt der Quelle ist zugeordnet“; alle übrigen Prüfungen laufen.
_src = ROOT / 'sources' / 'agile-tpi-2.5.json'
agile = json.loads(_src.read_text(encoding='utf-8'))['checkpoints'] if _src.exists() else None
def schema_errors_node():
    """Schema-Prüfung über Node/ajv; None, wenn Node oder ajv nicht verfügbar sind."""
    node = shutil.which('node')
    script = pathlib.Path(__file__).with_name('validate-schema.mjs')
    if not node:
        return None
    r = subprocess.run([node, str(script)], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout or '[]')

if HAS_SCHEMA:
    errors = [f"Schema: {list(e.path)}: {e.message}" for e in
              jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).iter_errors(cat)]
    schema_by = 'jsonschema'
else:
    node_errors = schema_errors_node()
    if node_errors is None:
        errors = []
        schema_by = None
        print('Hinweis: Schema-Prüfung übersprungen – weder das Python-Paket „jsonschema“ (≥ 4.18) noch Node mit ajv '
              'gefunden (zuerst `npm install` ausführen). Alle fachlichen Prüfungen laufen trotzdem.')
    else:
        errors = node_errors
        schema_by = 'ajv'
cps = [c for a in cat['keyAreas'] for c in a['checkpoints']]
for i, n in collections.Counter(c['id'] for c in cps).items():
    if n > 1: errors.append(f'Doppelte ID: {i}')
for a in cat['keyAreas']:
    for c in a['checkpoints']:
        if c['keyArea'] != a['id']: errors.append(f"{c['id']}: keyArea passt nicht zu {a['id']}")
used = collections.Counter(r for c in cps for r in c.get('agileRefs', []))
for x in agile or []:
    if used[x['id']] != 1: errors.append(f"Agile-Punkt {x['id']} ist {used[x['id']]}x zugeordnet (erwartet: 1x)")
for r, n in used.items():
    if n > 1 and agile is None: errors.append(f"Agile-Punkt {r} ist {n}x zugeordnet (erwartet: 1x)")
# Sicht P/T/O: jeder KP hat eine Sicht; 'assigned' genau dann, wenn es kein Agile-Gegenstück gibt (Analyse, Empfehlung 2).
for c in cps:
    if 'view' not in c: errors.append(f"{c['id']}: Sicht (view) fehlt")
    elif bool(c.get('agileRefs')) == (c.get('viewSource') == 'assigned'):
        errors.append(f"{c['id']}: viewSource passt nicht zu agileRefs")
# Abhängigkeiten (dependsOn = Voraussetzungen): bekannte IDs, nicht auf sich selbst, Voraussetzung auf gleicher oder
# niedrigerer Ebene, keine Zyklen; ein KP darf nicht von einem KP abhängen, der je nach Umfang wegfallen kann
# (agil im klassischen Modell, KI bei „KI aus“), wenn er selbst nicht ebenso wegfällt.
LEVEL = {'controlled': 1, 'efficient': 2, 'optimizing': 3}
by_id = {c['id']: c for c in cps}
area_ai = {a['id']: a['isAiArea'] for a in cat['keyAreas']}
is_ai = lambda c: area_ai[c['keyArea']] or 'AI' in c['tags']
for c in cps:
    for d in c.get('dependsOn', []):
        p = by_id.get(d)
        if p is None: errors.append(f"{c['id']}: dependsOn {d} unbekannt"); continue
        if d == c['id']: errors.append(f"{c['id']}: hängt von sich selbst ab")
        if LEVEL[p['level']] > LEVEL[c['level']]: errors.append(f"{c['id']}: Voraussetzung {d} liegt auf höherer Ebene")
        if 'agile' in p['tags'] and 'agile' not in c['tags']: errors.append(f"{c['id']}: hängt von agilem KP {d} ab")
        if is_ai(p) and not is_ai(c): errors.append(f"{c['id']}: hängt von KI-KP {d} ab")
state = {}
def visit(i, path):
    if state.get(i) == 1: errors.append('Zyklus: ' + ' → '.join(path + [i])); return
    if state.get(i) == 2: return
    state[i] = 1
    for d in by_id[i].get('dependsOn', []):
        if d in by_id: visit(d, path + [i])
    state[i] = 2
for c in cps: visit(c['id'], [])
if errors:
    print('\n'.join(errors)); print(f'FEHLER: {len(errors)}'); sys.exit(1)
agile_info = (f'alle {len(agile)} Agile-Punkte genau einmal zugeordnet' if agile is not None else
              f'{len(used)} Agile-Punkte je einmal zugeordnet (Abgleich mit der Originalquelle übersprungen: nicht vorhanden)')
print(f'OK – {len(cat["keyAreas"])} Kernbereiche, {len(cps)} Kontrollpunkte, {agile_info}, Sicht P/T/O vollständig '
      f'({sum(1 for c in cps if c.get("viewSource") == "assigned")} davon zugeordnet ohne Agile-Gegenstück), '
      f'{sum(len(c.get("dependsOn", [])) for c in cps)} Abhängigkeiten ohne Zyklen'
      f'{f", Schema geprüft mit {schema_by}" if schema_by else ""}.')
