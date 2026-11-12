// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Mandantentrennung bei Assessments (TEN) – geplant', () => {
  test.fixme(
    'TC-TEN-001 Nutzer Firma A ruft Assessment-ID von Firma B auf (UI + API) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '404' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-TEN-002 Nutzer Firma A listet Assessments (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'nur eigene sichtbar' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-TEN-010 Admin A ruft Assessments, Berichte, Nutzerliste oder Einstellungen von Firma B auf (UI + API) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '404 (S-06)' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-TEN-025 Firma A und B konfigurieren unterschiedliche KI-Module (gemockt) (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Empfehlungen von A über Modul A, von B über Modul B' },
      ],
    },
    async () => {},
  );
});
