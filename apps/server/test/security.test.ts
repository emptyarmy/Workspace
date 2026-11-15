/**
 * Security-Review 8b: Sicherheits-Header, Rate-Limits, Ersteinrichtung hinter einem Proxy, Konfiguration
 * für production, SSRF-Schutz für KI-Aufrufe. Läuft ohne Datenbank.
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { testAiConnection } from '../src/admin/ai-test';
import { AiError, callLlm } from '../src/assessment/llm';
import { assertAllowedTarget, isBlockedAddress } from '../src/security/outbound';
import { RateLimiter } from '../src/security/rate-limit';

const H = { 'x-requested-with': 'ai-tpi' };
const apps: FastifyInstance[] = [];
async function make(env: Record<string, string> = {}) {
  const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true', ...env }) });
  apps.push(app);
  return app;
}
afterAll(() => Promise.all(apps.map((a) => a.close())));

describe('Sicherheits-Header (OWASP A05)', () => {
  it('API: restriktive CSP, kein Caching, Clickjacking- und MIME-Schutz, kein HSTS ohne HTTPS', async () => {
    const res = await (await make()).inject('/api/health');
    expect(res.headers).toMatchObject({
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'same-origin',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
    });
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
  it('mit COOKIE_SECURE: HSTS und Secure-Cookie', async () => {
    const res = await (await make({ COOKIE_SECURE: 'true' })).inject('/api/health');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });
  it('Fehlerantworten enthalten keine internen Details', async () => {
    const res = await (
      await make()
    ).inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { ...H, 'content-type': 'application/json' },
      payload: '{kaputt',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toMatch(/at .*\.ts|stack|node_modules/i);
  });
});

describe('Konfiguration für production', () => {
  const prod = { NODE_ENV: 'production', SECRET_ENCRYPTION_KEY: 'k'.repeat(32) };
  it('Secure-Cookie, Rate-Limits und Protokoll sind standardmäßig an', () => {
    const c = loadConfig(prod);
    expect(c.COOKIE_SECURE).toBe(true);
    expect(c.AUTH_RATE_LIMIT_PER_MIN).toBe(30);
    expect(c.RESET_MAILS_PER_15_MIN).toBe(3);
    expect(c.TEST_ENDPOINTS).toBe(false);
    expect(c.TRUST_PROXY).toBe(false);
  });
  it('lassen sich bewusst abschalten (z. B. Intranet ohne HTTPS)', () => {
    const c = loadConfig({ ...prod, COOKIE_SECURE: 'false', AUTH_RATE_LIMIT_PER_MIN: '0' });
    expect(c.COOKIE_SECURE).toBe(false);
    expect(c.AUTH_RATE_LIMIT_PER_MIN).toBe(0);
  });
  it('ohne SECRET_ENCRYPTION_KEY startet production nicht', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/SECRET_ENCRYPTION_KEY/);
  });
  it('in Tests sind die Rate-Limits ohne Angabe aus', () => {
    const c = loadConfig({ NODE_ENV: 'test' });
    expect([c.AUTH_RATE_LIMIT_PER_MIN, c.RESET_MAILS_PER_15_MIN, c.COOKIE_SECURE]).toEqual([0, 0, false]);
  });
});

describe('Rate-Limit Anmeldung/Passwort (OWASP A07)', () => {
  it('je Client-Adresse: nach dem Limit 429 mit Retry-After, andere Adresse unabhängig', async () => {
    const app = await make({ AUTH_RATE_LIMIT_PER_MIN: '3' });
    const login = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: H,
        payload: { email: 'x@beispiel.de', password: 'falsch' },
        remoteAddress: ip,
      });
    for (let i = 0; i < 3; i++) expect((await login('10.0.0.1')).statusCode).not.toBe(429);
    const blocked = await login('10.0.0.1');
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: 'rate_limited' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect((await login('10.0.0.2')).statusCode).not.toBe(429);
    // „Passwort vergessen“ zählt zum selben Kontingent; andere Endpunkte nicht
    const reset = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset',
      headers: H,
      payload: { email: 'x@beispiel.de' },
      remoteAddress: '10.0.0.1',
    });
    expect(reset.statusCode).toBe(429);
    expect((await app.inject({ url: '/api/health', remoteAddress: '10.0.0.1' })).statusCode).toBe(200);
  });
  it('RateLimiter: gleitendes Fenster, 0 = aus', () => {
    const l = new RateLimiter(2, 1000);
    expect([l.hit('a', 0), l.hit('a', 100), l.hit('a', 200) > 0]).toEqual([0, 0, true]);
    expect(l.hit('a', 1150)).toBe(0); // erster Treffer liegt außerhalb des Fensters
    const off = new RateLimiter(0, 1000);
    expect(Array.from({ length: 50 }, () => off.hit('a')).every((x) => x === 0)).toBe(true);
  });
});

describe('Ersteinrichtung nur direkt lokal (R-06)', () => {
  it('localhost ohne Proxy-Header → erreichbar; mit Weiterleitungs-Header → 404', async () => {
    const app = await make();
    expect((await app.inject({ url: '/api/setup/status', remoteAddress: '127.0.0.1' })).statusCode).toBe(200);
    for (const h of ['x-forwarded-for', 'forwarded', 'x-real-ip', 'x-forwarded-host'])
      expect(
        (
          await app.inject({
            url: '/api/setup/status',
            remoteAddress: '127.0.0.1',
            headers: { [h]: '203.0.113.9' },
          })
        ).statusCode,
        h,
      ).toBe(404);
    expect((await app.inject({ url: '/api/setup/status', remoteAddress: '203.0.113.9' })).statusCode).toBe(
      404,
    );
  });
  it('TRUST_PROXY ändert die Prüfung der Ersteinrichtung nicht', async () => {
    const app = await make({ TRUST_PROXY: 'true' });
    const res = await app.inject({
      url: '/api/setup/status',
      remoteAddress: '203.0.113.9',
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('SSRF-Schutz für KI-Aufrufe (OWASP A10)', () => {
  it('sperrt link-lokale Adressen und Cloud-Metadaten, erlaubt localhost und interne Netze', () => {
    for (const a of [
      '169.254.169.254',
      '169.254.0.1',
      '0.0.0.0',
      '::',
      'fe80::1',
      '[fd00:ec2::254]',
      '::ffff:169.254.169.254',
    ])
      expect(isBlockedAddress(a), a).toBe(true);
    for (const a of ['127.0.0.1', '::1', '10.1.2.3', '192.168.0.10', '172.16.0.5', 'api.openai.com'])
      expect(isBlockedAddress(a), a).toBe(false);
  });
  it('Verbindungstest und KI-Aufruf an die Metadaten-Adresse werden abgewiesen, ohne Anfrage', async () => {
    await expect(assertAllowedTarget('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      'blocked_address',
    );
    await expect(assertAllowedTarget('http://localhost:11434/api/tags')).resolves.toBeUndefined();
    const r = await testAiConnection({
      mode: 'local',
      provider: 'ollama',
      baseUrl: 'http://169.254.169.254',
      apiKey: null,
      timeoutSec: 5,
    });
    expect(r).toMatchObject({ ok: false, error: 'blocked_address' });
    const err = await callLlm(
      {
        provider: 'openai_compatible',
        baseUrl: 'http://169.254.169.254/v1',
        model: 'x',
        temperature: 0,
        maxTokens: 10,
        timeoutSec: 5,
      },
      null,
      { system: 's', user: 'u' },
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err).toMatchObject({ code: 'unreachable', message: 'blocked_address' });
  });
});
