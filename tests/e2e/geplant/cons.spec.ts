// AUTOMATISCH ERZEUGT von tools/tests/generate_planned.py – nicht von Hand bearbeiten.
// Platzhalter für noch nicht umgesetzte Funktionen; Quelle: docs/05_test/02_testfallkatalog.md
import { test } from '@playwright/test';

test.describe('Zusammenführung der Abteilungsantworten (CONS) – geplant', () => {
  test.fixme(
    'TC-CONS-001 Zwei Abteilungen antworten unterschiedlich auf denselben KP (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'beide Antworten getrennt gespeichert, keine überschreibt die andere' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-002 Vergleichsansicht des Assessors (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'alle Abteilungsantworten + Kommentare sichtbar, Systemvorschlag angezeigt' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-003 Gleiche Antworten aller Abteilungen (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Vorschlag = gemeinsame Antwort' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-004 Assessor übernimmt Vorschlag (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'konsolidierte Antwort gesetzt, Bericht aktualisiert' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-005 Assessor weicht ab ohne Begründung (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'Speichern verhindert, Hinweis' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-006 Befragter ruft Zusammenführung auf (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'keine Berechtigung (UI + API 403)' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-007 Bericht zeigt Konsenslücken (positiv)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: 'KP mit uneinigen Abteilungen gelistet' },
      ],
    },
    async () => {},
  );
  test.fixme(
    'TC-CONS-008 Befragter einer Abteilung ändert Antwort einer anderen Abteilung (API) (negativ)',
    {
      annotation: [
        { type: 'Gerät', description: 'Desktop' },
        { type: 'Erwartet', description: '403' },
      ],
    },
    async () => {},
  );
});
