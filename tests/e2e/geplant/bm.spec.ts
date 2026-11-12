// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Benchmark (BM) – geplant', () => {
  test.fixme(
    'TC-BM-001 Fixture mit ≥ 5 Firmen derselben Branche (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Radar mit 3 Linien, Tabelle mit Median/Quartil korrekt' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-BM-002 Nur 3 Firmen in der Branche (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Hinweis „Zu wenige Vergleichsdaten“, kein Branchenwert' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-BM-003 Benchmark-Daten enthalten keine Firmennamen/Einzelwerte (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'API-Antwort geprüft: nur Aggregate' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-BM-004 Nur freigegebene Assessments fließen ein (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Entwurf einer Firma verändert Benchmark nicht' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-BM-005 Firma mit Opt-out (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'ist nicht im Vergleich enthalten; sieht selbst keinen Benchmark (R-04)' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-BM-006 Benchmark-Radar auf Mobil (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Mobil/Tablet' },
        { type: 'Erwartet', description: 'lesbar, Tabellenalternative vorhanden' },
      ],
    },
    async () => {},
  );
});
