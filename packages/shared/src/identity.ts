/**
 * Rollen, E-Mail-Domains und Erkennung externer Berater (R-02, R-08, S-03, S-08).
 */
import { z } from 'zod';

/** Genau eine Rolle je Nutzer (R-08). */
export const ROLES = ['admin', 'assessor', 'respondent', 'reader'] as const;
export type Role = (typeof ROLES)[number];
export const roleSchema = z.enum(ROLES);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** Domain-Teil einer E-Mail-Adresse, klein geschrieben. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 0
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase();
}

/** Externe Berater erhalten eine Firmenadresse mit Präfix „ext.“ (S-03); keine manuelle Pflege (S-08). */
export function isExternalEmail(email: string): boolean {
  return email.trim().toLowerCase().startsWith('ext.');
}

/** Prüft, ob die E-Mail zu einer der Firmen-Domains gehört (exakt, keine automatischen Subdomains). */
export function belongsToCompany(email: string, companyDomains: string[]): boolean {
  const domain = emailDomain(email);
  return domain.length > 0 && companyDomains.map((d) => d.toLowerCase()).includes(domain);
}

/** Freemail-Domains dürfen keiner Firma zugeordnet werden (S-02). Liste ist in der DB erweiterbar. */
export const DEFAULT_BLOCKED_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'web.de',
  'gmx.de',
  'gmx.net',
  'gmx.at',
  'gmx.ch',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'yahoo.de',
  'icloud.com',
  'me.com',
  't-online.de',
  'freenet.de',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'mail.de',
  'posteo.de',
];

/** Firmenkürzel für /login/<kürzel>: a–z, 0–9, Bindestrich, 2–30 Zeichen. */
export const companySlugSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])$/);
