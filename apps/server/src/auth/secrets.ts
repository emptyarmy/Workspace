import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Nur für Entwicklung und Tests – in production ist SECRET_ENCRYPTION_KEY Pflicht (siehe config.ts). */
const DEV_SECRET = 'ai-tpi-dev-secret-not-for-production-use';

/**
 * Verschlüsselung von Geheimnissen in der Datenbank (SMTP-Passwort, KI-API-Schlüssel) mit AES-256-GCM.
 * Format: v1.<iv>.<tag>.<ciphertext> (base64url). Der Schlüssel wird per SHA-256 aus SECRET_ENCRYPTION_KEY abgeleitet.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(secret: string | undefined) {
    this.key = createHash('sha256')
      .update(secret ?? DEV_SECRET)
      .digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return ['v1', iv, cipher.getAuthTag(), data]
      .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
      .join('.');
  }

  /** Liefert null, wenn der Wert fehlt oder nicht entschlüsselt werden kann (z. B. anderer Schlüssel). */
  decrypt(value: string | null | undefined): string | null {
    if (!value) return null;
    const [v, iv, tag, data] = value.split('.');
    if (v !== 'v1' || !iv || !tag || !data) return null;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString(
        'utf8',
      );
    } catch {
      return null;
    }
  }
}

/** Anzeige eines gespeicherten Geheimnisses ohne Klartext: nur die letzten 4 Zeichen. */
export function maskSecret(plain: string | null): string | null {
  if (!plain) return null;
  return plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`;
}
