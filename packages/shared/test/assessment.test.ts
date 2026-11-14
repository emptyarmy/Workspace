import { describe, expect, it } from 'vitest';
import {
  assessmentMasterSchema,
  checkpointInScope,
  departmentsDisagree,
  rationaleRequired,
  suggestConsolidated,
} from '../src/assessment';

describe('suggestConsolidated (R-11, strengere Bewertung)', () => {
  it.each([
    [[], 'open'],
    [['open', 'open'], 'open'],
    [['na', 'na'], 'na'],
    [['na', 'yes'], 'yes'],
    [['yes', 'yes', 'open'], 'yes'],
    [['yes', 'no'], 'partial'],
    [['yes', 'partial'], 'partial'],
    [['partial', 'no'], 'no'],
    [['yes', 'partial', 'no'], 'partial'],
    [['no', 'no', 'na'], 'no'],
  ] as const)('%j → %s', (values, expected) => {
    expect(suggestConsolidated([...values])).toBe(expected);
  });
});

describe('Begründungspflicht (TC-CONS-005)', () => {
  it('keine Begründung bei Übernahme eines einstimmigen Vorschlags', () => {
    expect(rationaleRequired('yes', ['yes', 'yes'])).toBe(false);
  });
  it('Begründung bei Abweichung vom Vorschlag', () => {
    expect(rationaleRequired('no', ['yes', 'yes'])).toBe(true);
  });
  it('Begründung bei uneinigen Abteilungen, auch wenn der Vorschlag übernommen wird', () => {
    expect(departmentsDisagree(['yes', 'no', 'open'])).toBe(true);
    expect(rationaleRequired('partial', ['yes', 'no'])).toBe(true);
  });
});

describe('Stammdaten (US-1.1, TC-ASM-002/003/004)', () => {
  const ok = { project: 'Testprozess 2026', assessorName: 'Anna Assessor', startDate: '2026-11-01' };
  it('Pflichtfelder genügen, Vorgaben werden gesetzt', () => {
    const r = assessmentMasterSchema.parse(ok);
    expect(r).toMatchObject({ methodModel: 'agile', includeAi: true, endDate: null, interviewCount: null });
  });
  it('ohne Projektname ungültig', () => {
    expect(assessmentMasterSchema.safeParse({ ...ok, project: ' ' }).success).toBe(false);
  });
  it('Enddatum vor Startdatum ungültig', () => {
    const r = assessmentMasterSchema.safeParse({ ...ok, endDate: '2026-10-31' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['endDate']);
  });
  it('negative oder nicht ganzzahlige Interviewzahl ungültig', () => {
    expect(assessmentMasterSchema.safeParse({ ...ok, interviewCount: -1 }).success).toBe(false);
    expect(assessmentMasterSchema.safeParse({ ...ok, interviewCount: 1.5 }).success).toBe(false);
    expect(assessmentMasterSchema.safeParse({ ...ok, interviewCount: '3' }).success).toBe(false);
  });
});

describe('checkpointInScope (TC-ASM-008)', () => {
  const area = { isAiArea: false };
  it('klassisch blendet agile Kontrollpunkte aus', () => {
    expect(checkpointInScope({ tags: ['agile'] }, area, { methodModel: 'classic', includeAi: true })).toBe(
      false,
    );
    expect(checkpointInScope({ tags: [] }, area, { methodModel: 'classic', includeAi: true })).toBe(true);
  });
  it('ohne KI blendet KI-Kernbereiche und KI-Kontrollpunkte aus', () => {
    expect(
      checkpointInScope({ tags: [] }, { isAiArea: true }, { methodModel: 'agile', includeAi: false }),
    ).toBe(false);
    expect(checkpointInScope({ tags: ['AI'] }, area, { methodModel: 'agile', includeAi: false })).toBe(false);
  });
});
