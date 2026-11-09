import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/** Passwort-Hashing mit Argon2id (OWASP-Empfehlung: m=19 MiB, t=2, p=1). */
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(hashValue: string | null, password: string): Promise<boolean> {
  if (!hashValue) {
    // Gleiche Rechenzeit wie bei existierenden Konten – erschwert Benutzer-Enumeration über Antwortzeiten.
    await hash(password, ARGON_OPTS);
    return false;
  }
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}

/** Zufälliges Token (Sitzung, Einmal-Link). In der DB wird nur der SHA-256-Hash gespeichert. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
