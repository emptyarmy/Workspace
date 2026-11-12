#!/usr/bin/env python3
"""
Erzeugt Platzhalter-Tests (Playwright `test.fixme`) für alle Testfälle des Testfallkatalogs,
die noch von keinem echten Test abgedeckt werden – in der Regel Funktionen späterer Phasen
(Assessment, Fragebogen, Kommentare, Zusammenführung, Bericht, Empfehlungen, Benchmark …).

- Quelle: docs/05_test/02_testfallkatalog.md
- Ziel:   tests/e2e/geplant/<bereich>.spec.ts (wird bei jedem Lauf vollständig neu geschrieben)
- Ein Testfall gilt als abgedeckt, wenn seine ID im Titel eines Tests außerhalb von tests/e2e/geplant steht
  (auch als Bereich „TC-ADM-008…012“ oder Liste „TC-USR-005/006“).

Aufruf:  python3 tools/tests/generate_planned.py
Danach:  Platzhalter einer umgesetzten Funktion durch echte Tests ersetzen und das Skript erneut ausführen –
         abgedeckte Fälle verschwinden dann automatisch aus tests/e2e/geplant.
"""
from __future__ import annotations

import glob
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "docs/05_test/02_testfallkatalog.md"
TARGET = ROOT / "tests/e2e/geplant"

ROW = re.compile(r"^\| (TC-([A-Z0-9]+)-(\d{3})) \| ([PN]) \| ([ADM]) \| (.*?) \| (.*?) \|\s*$")
REF = re.compile(r"TC-([A-Z0-9]+)-(\d{3})(?:…(\d{3}))?((?:/\d{3})*)")

AREA_TITLES = {
    "ADM": "Admin-Bereich – Funktionen späterer Phasen",
    "ANS": "Fragebogen und Antworten",
    "ASM": "Assessment und Stammdaten",
    "AUTH": "Anmeldung",
    "BM": "Benchmark",
    "COM": "Kommentare",
    "CONS": "Zusammenführung der Abteilungsantworten",
    "HIST": "Änderungshistorie",
    "IO": "Import und Export",
    "MU": "Mehrbenutzerbetrieb (zwei Browser-Kontexte)",
    "REC": "Empfehlungen (regelbasiert und KI)",
    "REP": "Bericht",
    "RST": "Passwort vergessen / Pflichtänderung",
    "SRC": "Quellen und Autoren",
    "TEN": "Mandantentrennung bei Assessments",
    "USR": "Rollen beim Fragebogen und Bericht",
}
DEVICE = {"A": "alle Profile", "D": "Desktop", "M": "Mobil/Tablet"}


def covered_ids() -> set[str]:
    found: set[str] = set()
    files = [f for f in glob.glob(str(ROOT / "tests/e2e/**/*.ts"), recursive=True) if "/geplant/" not in f]
    files += glob.glob(str(ROOT / "apps/*/test/*.ts")) + glob.glob(str(ROOT / "packages/*/test/*.ts"))
    for f in files:
        for m in REF.finditer(Path(f).read_text(encoding="utf-8")):
            area, first, last, more = m.groups()
            nums = list(range(int(first), int(last) + 1)) if last else [int(first)]
            nums += [int(x) for x in more.split("/") if x]
            found.update(f"TC-{area}-{n:03d}" for n in nums)
    return found


def ts(text: str) -> str:
    """Markdown-Zelle → TypeScript-String (einfache Anführungszeichen)."""
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text).replace("`", "").strip()
    return "'" + text.replace("\\", "\\\\").replace("'", "\\'") + "'"


def main() -> None:
    covered = covered_ids()
    open_cases: dict[str, list[tuple]] = defaultdict(list)
    for line in CATALOG.read_text(encoding="utf-8").splitlines():
        m = ROW.match(line)
        if m and m.group(1) not in covered:
            open_cases[m.group(2)].append(m.groups())

    TARGET.mkdir(parents=True, exist_ok=True)
    for old in TARGET.glob("*.spec.ts"):
        old.unlink()
    total = 0
    for area, cases in sorted(open_cases.items()):
        title = AREA_TITLES.get(area, area)
        out = [
            "// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.",
            "// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md",
            "import { test } from '@playwright/test';",
            "",
            f"test.describe({ts(f'{title} ({area}) – geplant')}, () => {{",
        ]
        for tid, _a, _n, kind, device, step, expected in cases:
            label = "positiv" if kind == "P" else "negativ"
            out += [
                f"  test.fixme(",
                f"    {ts(f'{tid} {step} ({label})')},",
                "    {",
                "      annotation: [",
                f"        {{ type: 'Gerät', description: {ts(DEVICE[device])} }},",
                f"        {{ type: 'Erwartet', description: {ts(expected)} }},",
                "      ],",
                "    },",
                "    async () => {},",
                "  );",
            ]
            total += 1
        out += ["});", ""]
        (TARGET / f"{area.lower()}.spec.ts").write_text("\n".join(out), encoding="utf-8")
    print(f"generate_planned: {total} Platzhalter in {len(open_cases)} Dateien → {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
