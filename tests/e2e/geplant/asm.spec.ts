// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Assessment und Stammdaten (ASM) – geplant', () => {
  test.fixme(
    'TC-ASM-001 Neues Assessment mit allen Pflichtfeldern anlegen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'Assessment erscheint in der Liste' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-002 Speichern ohne Projektnamen (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'Feldfehler, kein Speichern' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-003 Enddatum vor Startdatum (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Validierungsmeldung' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-004 Anzahl Interviews negativ / nicht numerisch (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Validierungsmeldung' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-005 Assessment duplizieren (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Kopie mit neuem Namen, gleiche Antworten' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-006 Assessment löschen mit Bestätigung (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'Eintrag entfernt' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-007 Löschen abbrechen (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'alle Profile' },
        { type: 'Erwartet', description: 'Eintrag bleibt erhalten' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-008 Vorgehensmodell „klassisch“ wählen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'agile KP ausgeblendet, nicht im Bericht' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-ASM-009 Kernbereich einer Abteilung zuweisen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Zuweisung sichtbar, Nutzer der Abteilung sehen KB unter „Meine Kernbereiche“' },
      ],
    },
    async () => {},
  );
});
