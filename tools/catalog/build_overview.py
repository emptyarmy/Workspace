#!/usr/bin/env python3
"""Erzeugt docs/03_fragenkatalog/05_katalog-v1-uebersicht.md aus dem Katalog-JSON.
Aufruf (im Projektordner):  python3 tools/catalog/build_overview.py
"""
import json, collections, sys
import pathlib
R=pathlib.Path(__file__).resolve().parents[2]
c=json.load(open(R/'packages/catalog/catalog.v1.json',encoding='utf-8')); agile={a['id']:(a['cluster'],a['text']) for a in json.load(open(R/'packages/catalog/sources/agile-tpi-2.5.json',encoding='utf-8'))['checkpoints']}
LVN={'controlled':'KONTROLLIERT','efficient':'EFFIZIENT','optimizing':'OPTIMIEREND'}
SRC={'TPI_NEXT_DE':'TPI NEXT','TPI_NEXT_RECON':'TPI NEXT (rekonstruiert)','AGILE_TPI_EN':'Agile TPI (neu)','AI_EXT':'KI-Erweiterung'}
cps=[x for a in c['keyAreas'] for x in a['checkpoints']]
n=collections.Counter(x['source'] for x in cps); eff=collections.Counter(x['effort'] for x in cps)
L=[]
L.append('# Fragenkatalog v1.0 (Entwurf) – Übersicht zur fachlichen Prüfung\n')
L.append('> Erzeugt aus `packages/catalog/catalog.v1.json` (Stand 09.11.2026, Status **draft**). Änderungen bitte **nicht hier**, sondern als Kommentar/Anmerkung zurückmelden – die Datei wird aus dem JSON neu erzeugt.\n')
L.append('## 1. Zusammenfassung\n')
L.append('| Kennzahl | Wert |\n|---|---|')
L.append(f'| Kernbereiche | {len(c["keyAreas"])} (16 TPI NEXT + 3 KI) |')
L.append(f'| Kontrollpunkte gesamt | **{len(cps)}** |')
L.append(f'| davon TPI NEXT (bereinigt) | {n["TPI_NEXT_DE"]} |')
L.append(f'| davon TPI NEXT rekonstruiert (KB02, Ebene Kontrolliert) | {n["TPI_NEXT_RECON"]} |')
L.append(f'| davon neue agile Kontrollpunkte (Agile TPI) | {n["AGILE_TPI_EN"]} |')
L.append(f'| davon KI-Kontrollpunkte (KB17–19 + Ergänzungen) | {n["AI_EXT"]} |')
L.append(f'| Agile-TPI-Punkte als Zusatzinformation an TPI-NEXT-Punkten | {sum(len(x.get("agileRefs",[])) for x in cps if x["source"]!="AGILE_TPI_EN")} von 108 |')
L.append(f'| Aufwand S (kurzfristig < 1 Monat) / M (1–3 Monate) / L (> 3 Monate) | {eff["S"]} / {eff["M"]} / {eff["L"]} |')
L.append('\n**Legende:** Ebene K = Kontrolliert, E = Effizient, O = Optimierend · Aufw. = Umsetzungsaufwand bei Nichterfüllung · Sicht P/T/O und Cluster A–G aus Agile TPI · 🤖 = KI-Kontrollpunkt · 🔄 = neuer agiler Kontrollpunkt · ⚠️ = rekonstruiert, bitte besonders prüfen\n')
L.append('## 2. Hinweise zur Bereinigung\n')
L.append('- Tippfehler korrigiert (z. B. „einen einfache“, „de Testprozesses“, „lieft“, „übern“, „abziehen“ → „abzielen“, „Widerverwendung“).')
L.append('- Projektspezifische Bewertungstexte (BRUNATA, Projekt B2B, aqua, NTT Data, DSC) entfernt – sie können als Demo-Assessment dienen (F-18).')
L.append('- Uneinheitliche Ebenenbezeichnungen vereinheitlicht (Kontrolliert / Effizient / Optimierend).')
L.append('- **KB02 „Grad der Beteiligung“:** Überschrift und Ebene KONTROLLIERT fehlten im Word-Dokument; die 4 Kontrollpunkte dieser Ebene sind nach TPI NEXT rekonstruiert (⚠️).')
L.append('- Wo ein agiler Kontrollpunkt inhaltlich einem TPI-NEXT-Punkt entspricht, wurde die Formulierung des TPI-NEXT-Punktes behutsam um die agile Sicht ergänzt (z. B. „Auftraggeber bzw. Product Owner“).\n')
L.append('## 3. Kontrollpunkte je Kernbereich\n')
for a in c['keyAreas']:
    L.append(f'### {a["id"]} – {a["name"]["de"]} / {a["name"]["en"]}' + (' 🤖' if a['isAiArea'] else '') + '\n')
    L.append(f'*{a["description"]["de"]}*  \n*{a["description"]["en"]}*\n')
    for lv in ('controlled','efficient','optimizing'):
        L.append(f'**{LVN[lv]}** – {a["levels"][lv]["de"]}\n')
        L.append('| ID | Kontrollpunkt (DE) / Checkpoint (EN) | Aufw. | Agile | Empfehlung (DE) |\n|---|---|:-:|---|---|')
        for x in a['checkpoints']:
            if x['level']!=lv: continue
            mark=('🤖 ' if 'AI' in x['tags'] else '')+('🔄 ' if 'agile' in x['tags'] else '')+('⚠️ ' if 'reconstructed' in x['tags'] else '')
            ag=(f'{x["view"]}/{x["cluster"]} ({", ".join(x["agileRefs"])})' if x.get('agileRefs') else '–')
            L.append(f'| `{x["id"]}` | {mark}{x["text"]["de"]}<br>*{x["text"]["en"]}* | {x["effort"]} | {ag} | {x["recommendation"]["de"]} |')
        L.append('')
L.append('## 4. Zuordnung aller 108 Agile-TPI-Kontrollpunkte\n')
L.append('| Agile-ID | Cluster | Original (EN) | → Katalog-ID | Art |\n|---|:-:|---|---|---|')
m={r:x for x in cps for r in x.get('agileRefs',[])}
for sid,(cl,t) in sorted(agile.items(), key=lambda k:[int(p) for p in k[0].split('.')]):
    x=m[sid]; L.append(f'| {sid} | {cl} | {t.replace("|","/")} | `{x["id"]}` | {"neu (agil)" if x["source"]=="AGILE_TPI_EN" else "zusammengeführt"} |')
open(R/'docs/03_fragenkatalog/05_katalog-v1-uebersicht.md','w',encoding='utf-8').write('\n'.join(L)+'\n')
print(len(L))
