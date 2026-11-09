import { describe, expect, it } from 'vitest';
import {
  belongsToCompany,
  companySlugSchema,
  emailDomain,
  emailSchema,
  isExternalEmail,
  roleSchema,
} from '../src/index';

describe('E-Mail und Firmen-Domains (R-02, S-03)', () => {
  it('ermittelt die Domain case-insensitiv (TC-TEN-012)', () => {
    expect(emailDomain('Max@BRUNATA.de')).toBe('brunata.de');
    expect(belongsToCompany('Max@BRUNATA.de', ['brunata.de'])).toBe(true);
  });

  it('weist fremde Domains und nicht eingetragene Subdomains ab (TC-TEN-004/013)', () => {
    expect(belongsToCompany('max@firmab.de', ['brunata.de'])).toBe(false);
    expect(belongsToCompany('max@mail.brunata.de', ['brunata.de'])).toBe(false);
    expect(belongsToCompany('ohne-at-zeichen', ['brunata.de'])).toBe(false);
  });

  it('erkennt externe Berater am Präfix ext. (TC-TEN-022/023)', () => {
    expect(isExternalEmail('ext.max.mustermann@brunata.com')).toBe(true);
    expect(isExternalEmail('EXT.Max.M@brunata.com')).toBe(true);
    expect(isExternalEmail('max.ext@brunata.com')).toBe(false);
  });

  it('validiert E-Mail-Format', () => {
    expect(emailSchema.safeParse(' Max@Brunata.de ').data).toBe('max@brunata.de');
    expect(emailSchema.safeParse('keine-mail').success).toBe(false);
  });

  it('kennt genau vier Rollen (TC-USR-015/016)', () => {
    expect(roleSchema.options).toEqual(['admin', 'assessor', 'respondent', 'reader']);
    expect(roleSchema.safeParse('guest').success).toBe(false);
  });

  it('prüft Firmenkürzel', () => {
    expect(companySlugSchema.safeParse('brunata').success).toBe(true);
    expect(companySlugSchema.safeParse('firma-b2').success).toBe(true);
    for (const bad of ['B', 'Großbuchstaben', '-start', 'ende-', 'a b'])
      expect(companySlugSchema.safeParse(bad).success, bad).toBe(false);
  });
});
