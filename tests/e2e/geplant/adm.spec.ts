// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Admin-Bereich – Funktionen späterer Phasen (ADM) – geplant', () => {
  test.fixme(
    'TC-ADM-029 Admin öffnet Bericht, Antworten, Kommentare und Empfehlungen der eigenen Firma (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'lesbar, keine Bearbeitungselemente (S-11)' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ADM-036 Admin versucht in der eigenen Firma eine Antwort zu ändern oder zusammenzuführen (API) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '403' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ADM-037 Admin ruft Bericht/Antworten einer anderen Firma auf (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '404' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ADM-030 Admin öffnet Benchmark-Ansicht (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'nur aggregierte Kennzahlen (Firma vs. Branche vs. alle), keine KP-Antworten/Kommentare' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ADM-031 Admin-Historie der eigenen Firma (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'enthält Ereignisse der eigenen Firma inkl. Antwortänderungen; firmenübergreifende Admin-Aktionen als Verwaltungsereignisse; nichts von anderen Firmen (S-12)' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ADM-013 Wechsel Anbieter (Ollama → Claude, gemockt) (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Empfehlungen werden über neuen Adapter erzeugt' },
      ],
    },
    async () => {},
  );
});
