/**
 * Phase 8c: Auslieferung der gebauten Weboberfläche durch den Server (WEB_DIST_DIR). Läuft ohne Datenbank
 * mit einem künstlichen dist-Ordner.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { HTML_CSP, loadStaticFiles } from '../src/static';

let dir: string;
let app: FastifyInstance;
const INDEX =
  '<!doctype html><html><head><script type="module" src="/assets/index-abc123.js"></script></head><body><div id="app"></div></body></html>';
const BIG_JS = `console.log(${JSON.stringify('x'.repeat(5000))});`;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ai-tpi-dist-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), INDEX);
  writeFileSync(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(dir, 'assets', 'index-abc123.js'), BIG_JS);
  // Datei außerhalb des Ordners – darf nie ausgeliefert werden
  writeFileSync(join(dir, '..', 'ai-tpi-geheim.txt'), 'geheim');
  app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', WEB_DIST_DIR: dir }) });
});
afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
  rmSync(join(dir, '..', 'ai-tpi-geheim.txt'), { force: true });
});

describe('Weboberfläche aus WEB_DIST_DIR', () => {
  it('index.html mit HTML-CSP, ohne Cache; Sicherheits-Header wie bei der API', async () => {
    const res = await app.inject('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['content-security-policy']).toBe(HTML_CSP);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.body).toBe(INDEX);
    expect(HTML_CSP).not.toContain('unsafe-inline');
    expect(HTML_CSP).not.toContain('unsafe-eval');
  });

  it('Seiten-Deep-Links liefern index.html (Vue Router im History-Modus)', async () => {
    for (const url of ['/start', '/assessments/123/bericht', '/login/heise?passwordSet=1']) {
      const res = await app.inject(url);
      expect(res.statusCode, url).toBe(200);
      expect(res.body, url).toBe(INDEX);
    }
    expect((await app.inject({ method: 'HEAD', url: '/start' })).statusCode).toBe(200);
  });

  it('Assets: ein Jahr cachebar, gzip auf Wunsch, sonst unkomprimiert', async () => {
    const plain = await app.inject('/assets/index-abc123.js');
    expect(plain.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(plain.headers['content-type']).toBe('text/javascript; charset=utf-8');
    expect(plain.headers['content-encoding']).toBeUndefined();
    expect(plain.body).toBe(BIG_JS);
    const gz = await app.inject({
      url: '/assets/index-abc123.js',
      headers: { 'accept-encoding': 'gzip, br' },
    });
    expect(gz.headers['content-encoding']).toBe('gzip');
    expect(gunzipSync(gz.rawPayload).toString()).toBe(BIG_JS);
    expect(gz.rawPayload.length).toBeLessThan(BIG_JS.length / 10);
    const icon = await app.inject('/favicon.svg');
    expect(icon.headers['content-type']).toBe('image/svg+xml');
    expect(icon.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('404 statt App: fehlende Dateien, API-Pfade, schreibende Anfragen, Pfad-Traversal', async () => {
    for (const url of [
      '/assets/fehlt.js',
      '/api/gibt-es-nicht',
      '/public/gibt-es-nicht',
      '/../ai-tpi-geheim.txt',
      '/assets/..%2F..%2Fai-tpi-geheim.txt',
      '/%2e%2e/ai-tpi-geheim.txt',
    ]) {
      const res = await app.inject(url);
      expect(res.statusCode, url).toBe(404);
      expect(res.body, url).not.toContain('geheim');
      expect(res.body, url).not.toContain('<div id="app">');
    }
    const api = await app.inject('/api/gibt-es-nicht');
    expect(api.json()).toEqual({ error: 'not_found' });
    expect(api.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(
      (await app.inject({ method: 'POST', url: '/start', headers: { 'x-requested-with': 'ai-tpi' } }))
        .statusCode,
    ).toBe(404);
  });

  it('API funktioniert unverändert neben der Oberfläche', async () => {
    const res = await app.inject('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('ohne index.html bricht der Start mit klarer Meldung ab', () => {
    const empty = mkdtempSync(join(tmpdir(), 'ai-tpi-leer-'));
    try {
      expect(() => loadStaticFiles(empty)).toThrow(/index\.html fehlt/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('ohne WEB_DIST_DIR (Entwicklung mit Vite)', () => {
  it('nur API: unbekannte Pfade → JSON-404', async () => {
    const api = await buildApp({ config: loadConfig({ NODE_ENV: 'test' }) });
    const res = await api.inject('/start');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
    await api.close();
  });
});
