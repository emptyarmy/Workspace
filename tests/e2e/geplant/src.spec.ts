// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Quellen und Autoren (SRC) – geplant', () => {
  test.fixme(
    'TC-SRC-001 Quelle/Autor anlegen (Name, Rolle, Typ) (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'erscheint in Auswahlliste' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-SRC-002 Quelle ohne Namen anlegen (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Validierungsfehler' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-SRC-003 Doppelte Quelle (gleicher Name+Rolle) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Hinweis auf Duplikat' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-SRC-004 Verwendete Quelle löschen (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Löschen verhindert, Deaktivieren angeboten' },
      ],
    },
    async () => {},
  );
});
