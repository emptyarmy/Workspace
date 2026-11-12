// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Rollen beim Fragebogen und Bericht (USR) – geplant', () => {
  test.fixme(
    'TC-USR-019 Admin versucht Abteilungsantworten zu erfassen oder zusammenzuführen (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'nicht möglich, 403' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-USR-014 Rolle Leser: Bericht lesen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'lesbar; alle Bearbeitungselemente fehlen; Schreib-API → 403' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-USR-018 Leser versucht zu kommentieren bzw. zu antworten (UI + API) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'nicht möglich; 403' },
      ],
    },
    async () => {},
  );
});
