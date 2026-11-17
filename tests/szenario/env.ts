import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gemeinsame Einstellungen des Szenarios „Humani“ (playwright.szenario.config.ts und tests/szenario/*.spec.ts).
 * Eigene Datenbank und eigene Ports – Entwicklungsdaten (npm run dev) und die übrigen E2E-Tests bleiben unberührt.
 */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readDotEnv(): Record<string, string> {
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
const dotEnv = readDotEnv();

/** Szenario-Datenbank: SZENARIO_DATABASE_URL, sonst DATABASE_URL aus .env mit Datenbank „ai_tpi_szenario_e2e“. */
export const DATABASE_URL = (() => {
  if (process.env.SZENARIO_DATABASE_URL) return process.env.SZENARIO_DATABASE_URL;
  const u = new URL(
    process.env.DATABASE_URL ?? dotEnv.DATABASE_URL ?? 'postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi',
  );
  u.pathname = '/ai_tpi_szenario_e2e';
  return u.toString();
})();
export const SERVER_PORT = Number(process.env.SZENARIO_SERVER_PORT ?? 3200);
export const WEB_PORT = Number(process.env.SZENARIO_WEB_PORT ?? 5190);
export const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
/** Mailpit (docker compose up -d mailpit): SMTP für den Versand, Web/API zum Lesen der Mails. */
export const SMTP_HOST = process.env.SZENARIO_SMTP_HOST ?? 'localhost';
export const SMTP_PORT = process.env.SZENARIO_SMTP_PORT ?? '1025';
export const MAILPIT_URL = process.env.SZENARIO_MAILPIT_URL ?? 'http://localhost:8025';
