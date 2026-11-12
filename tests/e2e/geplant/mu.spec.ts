// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Mehrbenutzerbetrieb (zwei Browser-Kontexte) (MU) – geplant', () => {
  test.fixme(
    'TC-MU-001 Nutzer A beantwortet KP, Nutzer B sieht die Antwort ohne Neuladen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Anzeige bei B ≤ 2 s' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-002 A und B (gleiche Abteilung) ändern denselben KP gleichzeitig (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'zweiter Speichervorgang erhält Konfliktdialog' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-003 Präsenzanzeige „A bearbeitet KB03“ bei B (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Hinweis sichtbar' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-004 Nutzer ohne Zuweisung versucht, KP eines fremden KB zu beantworten (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Antwort-Buttons deaktiviert; API 403' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-005 Nutzer ohne Mitgliedschaft öffnet Assessment-URL (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '„Keine Berechtigung“' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-006 Kommentar von A erscheint bei B mit Verfasser A (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Verfasser korrekt' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-MU-007 B versucht Kommentar von A zu löschen (Rolle Befragter) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'nicht möglich' },
      ],
    },
    async () => {},
  );
});
