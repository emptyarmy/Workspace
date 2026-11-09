import { describe, expect, it } from 'vitest';
import { aiProbe, testAiConnection } from '../src/admin/ai-test';
import { maskSecret, SecretBox } from '../src/auth/secrets';
import { loadConfig } from '../src/config';
import { adminNoticeMail } from '../src/mail/templates';

describe('Geheimnisse in der DB (S-04)', () => {
  const box = new SecretBox('x'.repeat(32));
  it('verschlüsselt mit Zufalls-IV und entschlüsselt wieder', () => {
    const a = box.encrypt('sk-geheim');
    expect(a).toMatch(/^v1\./);
    expect(a).not.toContain('geheim');
    expect(box.encrypt('sk-geheim')).not.toBe(a);
    expect(box.decrypt(a)).toBe('sk-geheim');
  });
  it('anderer Schlüssel, manipulierte oder leere Werte → null', () => {
    const a = box.encrypt('sk-geheim');
    expect(new SecretBox('y'.repeat(32)).decrypt(a)).toBeNull();
    expect(box.decrypt(`${a.slice(0, -2)}AA`)).toBeNull();
    expect(box.decrypt('klartext')).toBeNull();
    expect(box.decrypt(null)).toBeNull();
  });
  it('Maskierung zeigt höchstens die letzten 4 Zeichen', () => {
    expect(maskSecret('sk-abcdef1234')).toBe('••••1234');
    expect(maskSecret('abc')).toBe('••••');
    expect(maskSecret(null)).toBeNull();
  });
  it('production ohne SECRET_ENCRYPTION_KEY wird abgewiesen; leerer Wert gilt als nicht gesetzt', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/SECRET_ENCRYPTION_KEY/);
    expect(() => loadConfig({ NODE_ENV: 'production', SECRET_ENCRYPTION_KEY: 'kurz' })).toThrow();
    expect(
      loadConfig({ NODE_ENV: 'development', SECRET_ENCRYPTION_KEY: '' }).SECRET_ENCRYPTION_KEY,
    ).toBeUndefined();
  });
});

describe('KI-Verbindungstest (Anbieter-Endpunkte)', () => {
  it('Prüf-URL und Header je Anbieter', () => {
    expect(aiProbe('ollama', 'http://localhost:11434/', null).url).toBe('http://localhost:11434/api/tags');
    const a = aiProbe('anthropic', 'https://api.anthropic.com', 'k');
    expect(a.url).toBe('https://api.anthropic.com/v1/models');
    expect(a.headers['x-api-key']).toBe('k');
    expect(aiProbe('openai', 'https://api.openai.com/v1', 'k').headers.authorization).toBe('Bearer k');
    expect(aiProbe('azure_openai', 'https://x.openai.azure.com', 'k').headers['api-key']).toBe('k');
  });
  it('regelbasiert braucht keine Verbindung; ohne Basis-URL → nicht erreichbar', async () => {
    expect(
      await testAiConnection({
        mode: 'rules',
        provider: 'rules',
        baseUrl: null,
        apiKey: null,
        timeoutSec: 5,
      }),
    ).toMatchObject({
      ok: true,
    });
    expect(
      await testAiConnection({
        mode: 'local',
        provider: 'ollama',
        baseUrl: null,
        apiKey: null,
        timeoutSec: 5,
      }),
    ).toMatchObject({
      ok: false,
      error: 'unreachable',
    });
  });
});

describe('Hinweis-Mail an Admins (S-01)', () => {
  it('nennt wer, was, wann und den betroffenen Nutzer; HTML ist maskiert', () => {
    const m = adminNoticeMail({
      to: 'b@beta.de',
      name: 'Bernd',
      action: 'password_reset',
      actor: { name: 'Anna <script>', email: 'anna@alpha.de', companyName: 'Alpha GmbH' },
      target: { name: 'Bea', email: 'bea@beta.de' },
      at: new Date('2026-11-09T12:00:00Z'),
    });
    expect(m.subject).toBe('Hinweis: Passwort zurückgesetzt – Bea');
    expect(m.text).toContain('anna@alpha.de, Alpha GmbH');
    expect(m.text).toContain('9.11.2026, 13:00:00');
    expect(m.html).not.toContain('<script>');
  });
});
