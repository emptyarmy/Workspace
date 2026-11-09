import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { isLoopbackAddress } from '../src/security/localhost';

const H = { 'x-requested-with': 'ai-tpi' };

const config = loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true' });
let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp({ config });
});
afterAll(() => app.close());

describe('Health und Katalog', () => {
  it('GET /api/health meldet Status und Katalogversion', async () => {
    const res = await app.inject('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', db: 'not_configured' });
  });

  it('GET /api/catalog liefert 19 Kernbereiche', async () => {
    const res = await app.inject('/api/catalog');
    expect(res.json().keyAreas).toHaveLength(19);
  });

  it('GET /api/catalog/key-areas/KB17 liefert den KI-Kernbereich', async () => {
    const res = await app.inject('/api/catalog/key-areas/kb17');
    expect(res.statusCode).toBe(200);
    expect(res.json().isAiArea).toBe(true);
  });

  it('unbekannter Kernbereich → 404 ohne Details (negativ)', async () => {
    const res = await app.inject('/api/catalog/key-areas/KB99');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('setzt Sicherheits-Header', async () => {
    const res = await app.inject('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});

describe('Branding (R-01)', () => {
  it('unbekanntes bzw. ungültiges Kürzel → neutrales Branding statt Fehler (TC-AUTH-012)', async () => {
    for (const slug of ['gibt-es-nicht', 'UNGÜLTIG!!']) {
      const res = await app.inject(`/public/branding/${encodeURIComponent(slug)}`);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ name: 'AI_TPI', logoUrl: null, logoAlt: 'AI_TPI' });
    }
  });
});

describe('Ersteinrichtung nur über localhost (R-06)', () => {
  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1', '127.0.0.5'])('%s gilt als localhost', (a) => {
    expect(isLoopbackAddress(a)).toBe(true);
  });
  it.each(['192.168.1.10', '10.0.0.1', '::ffff:10.0.0.1', '', undefined, '127.0.0.256', '1270.0.0.1'])(
    '%s gilt nicht als localhost (negativ)',
    (a) => expect(isLoopbackAddress(a)).toBe(false),
  );

  it('Status über localhost verfügbar (TC-SET-001)', async () => {
    const res = await app.inject({ url: '/api/setup/status', remoteAddress: '127.0.0.1' });
    expect(res.statusCode).toBe(200);
  });

  it('Aufruf von außen → 404 (TC-SET-002)', async () => {
    const res = await app.inject({ url: '/api/setup/status', remoteAddress: '192.168.1.20' });
    expect(res.statusCode).toBe(404);
  });

  it('gefälschter X-Forwarded-For-Header wird ignoriert (TC-SET-004)', async () => {
    const res = await app.inject({
      url: '/api/setup/status',
      remoteAddress: '192.168.1.20',
      headers: { 'x-forwarded-for': '127.0.0.1', 'x-real-ip': '127.0.0.1' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('SETUP_ENABLED=false → 404 auch über localhost (TC-SET-005)', async () => {
    const off = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'false' }) });
    const res = await off.inject({ url: '/api/setup/status', remoteAddress: '127.0.0.1' });
    expect(res.statusCode).toBe(404);
    await off.close();
  });
});

describe('Passwort serverseitig prüfen (TC-PWD-024)', () => {
  const token = 'x'.repeat(32);
  it('schwaches Passwort wird abgewiesen, auch wenn die UI umgangen wird', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: H,
      payload: { token, password: 'abc', passwordRepeat: 'abc' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('password_policy');
  });
  it('Regeln erfüllt, aber Stärke „schwach“ → abgewiesen (N-09)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: H,
      payload: { token, password: 'Passw0rt!', passwordRepeat: 'Passw0rt!' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().strength).toBe('weak');
  });
  it('abweichende Wiederholung → 400 (TC-PWD-023)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: H,
      payload: { token, password: 'vK8#qLz2!mWr9$Tb', passwordRepeat: 'vK8#qLz2!mWr9$Tc' },
    });
    expect(res.json().error).toBe('password_mismatch');
  });
  it('gültiges Passwort, aber ungültiger Link → invalid_token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: H,
      payload: { token, password: 'vK8#qLz2!mWr9$Tb', passwordRepeat: 'vK8#qLz2!mWr9$Tb' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_token');
  });
  it('Passwort vergessen ohne Datenbank: trotzdem 202 (keine Aussage über Existenz)', async () => {
    for (const email of ['admin@brunata.com', 'unbekannt@nirgendwo.de']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/password-reset',
        headers: H,
        payload: { email },
      });
      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ status: 'accepted' });
    }
  });
  it('Passwort vergessen mit ungültiger E-Mail → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset',
      headers: H,
      payload: { email: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
  it('Login mit ungültiger E-Mail → 400 (TC-AUTH-004)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: H,
      payload: { email: 'kein-mail', password: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});
