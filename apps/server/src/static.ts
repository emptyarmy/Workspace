import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Auslieferung der gebauten Weboberfläche (apps/web/dist) durch den API-Server – Produktionsbetrieb (Phase 8c).
 *
 * - Alle Dateien werden beim Start einmal eingelesen (die Oberfläche ist klein). Angefragte Pfade werden nur in
 *   dieser Liste nachgeschlagen, nie im Dateisystem: Pfad-Traversal (../) ist damit ausgeschlossen.
 * - /assets/* tragen einen Inhalts-Hash im Namen → ein Jahr cachebar (immutable); index.html wird nie gecacht.
 * - Unbekannte Pfade außerhalb von /api und /public liefern index.html (Single-Page-App, Vue Router im History-Modus).
 * - HTML-Seiten bekommen eine eigene Content-Security-Policy (nur Skripte und Stile vom eigenen Ursprung).
 */

/**
 * CSP für die Weboberfläche. Vite erzeugt keine Inline-Skripte; Stile kommen als Datei.
 * Bilder auch von https:, weil Firmenlogos als HTTPS-Adresse gepflegt werden (TC-ADM-006; nur https erlaubt).
 */
export const HTML_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};
const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.webmanifest',
  '.map',
]);

interface StaticFile {
  body: Buffer;
  gzip?: Buffer;
  type: string;
  cache: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function loadStaticFiles(root: string): Map<string, StaticFile> {
  const files = new Map<string, StaticFile>();
  for (const full of walk(root)) {
    const urlPath = '/' + relative(root, full).split(sep).join('/');
    const ext = extname(full).toLowerCase();
    const body = readFileSync(full);
    const file: StaticFile = {
      body,
      type: TYPES[ext] ?? 'application/octet-stream',
      cache: urlPath.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : ext === '.html'
          ? 'no-cache'
          : 'public, max-age=3600',
    };
    if (COMPRESSIBLE.has(ext) && body.length > 1024) file.gzip = gzipSync(body, { level: 9 });
    files.set(urlPath, file);
  }
  if (!files.has('/index.html')) throw new Error(`WEB_DIST_DIR: ${root}/index.html fehlt (npm run build).`);
  return files;
}

export function registerStatic(app: FastifyInstance, root: string): void {
  const files = loadStaticFiles(root);
  const index = files.get('/index.html')!;

  function send(req: FastifyRequest, reply: FastifyReply, file: StaticFile, status = 200) {
    reply.status(status).header('Content-Type', file.type).header('Cache-Control', file.cache);
    reply.header('Vary', 'Accept-Encoding');
    if (file.type.startsWith('text/html')) reply.header('Content-Security-Policy', HTML_CSP);
    const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
    if (file.gzip && acceptsGzip) {
      reply.header('Content-Encoding', 'gzip');
      return reply.send(req.method === 'HEAD' ? undefined : file.gzip);
    }
    return reply.send(req.method === 'HEAD' ? undefined : file.body);
  }

  // Ersetzt den JSON-404 für alles außerhalb der API: Datei oder (für Seitenaufrufe) index.html.
  app.setNotFoundHandler((req, reply) => {
    const path = decodeURIComponentSafe(req.url.split('?')[0]!);
    const isApi = path === '/api' || path.startsWith('/api/') || path.startsWith('/public/');
    if (isApi || (req.method !== 'GET' && req.method !== 'HEAD'))
      return reply.status(404).send({ error: 'not_found' });
    const file = files.get(path);
    if (file) return send(req, reply, file);
    // Fehlende Dateien mit Endung (z. B. veraltetes /assets/x.js) → echter 404 statt index.html.
    if (extname(path))
      return reply.status(404).header('Cache-Control', 'no-store').send({ error: 'not_found' });
    return send(req, reply, index);
  });
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
