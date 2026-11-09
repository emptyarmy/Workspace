/**
 * Integrationstests gegen eine echte PostgreSQL-Datenbank.
 * Laufen nur, wenn TEST_DATABASE_URL gesetzt ist (Datenbank wird dabei geleert!), z. B.:
 *   TEST_DATABASE_URL=postgres://ai_tpi:ai_tpi@localhost:5432/ai_tpi_test npm run test:unit
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type DbHandle } from '../src/db/client';
import { companies, users } from '../src/db/schema';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('mit Datenbank', () => {
  let handle: DbHandle;
  let app: FastifyInstance;

  beforeAll(async () => {
    handle = createDb(url!);
    await handle.db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', SETUP_ENABLED: 'true' }), db: handle });
  });
  afterAll(async () => {
    await app?.close();
    await handle?.close();
  });

  it('Health meldet Datenbank „up“', async () => {
    expect((await app.inject('/api/health')).json()).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('Branding liefert Logo der Firma über ihr Kürzel (TC-AUTH-010)', async () => {
    await handle.db.insert(companies).values({
      name: 'Beispiel GmbH',
      slug: 'beispiel',
      logoUrl: 'https://example.com/logo.svg',
      logoAlt: 'Beispiel GmbH Logo',
    });
    const res = await app.inject('/public/branding/beispiel');
    expect(res.json()).toEqual({
      name: 'Beispiel GmbH',
      logoUrl: 'https://example.com/logo.svg',
      logoAlt: 'Beispiel GmbH Logo',
    });
  });

  it('Ersteinrichtung verfügbar, solange kein Nutzer existiert – danach 404 (TC-SET-003)', async () => {
    expect((await app.inject({ url: '/api/setup/status', remoteAddress: '127.0.0.1' })).statusCode).toBe(200);
    const [c] = await handle.db.select({ id: companies.id }).from(companies).limit(1);
    await handle.db
      .insert(users)
      .values({ companyId: c!.id, name: 'Admin', email: 'admin@beispiel.de', role: 'admin' });
    expect((await app.inject({ url: '/api/setup/status', remoteAddress: '127.0.0.1' })).statusCode).toBe(404);
  });

  it('E-Mail-Adressen sind case-insensitiv eindeutig (negativ)', async () => {
    const [c] = await handle.db.select({ id: companies.id }).from(companies).limit(1);
    await expect(
      handle.db
        .insert(users)
        .values({ companyId: c!.id, name: 'Dublette', email: 'ADMIN@beispiel.de', role: 'reader' }),
    ).rejects.toThrow();
  });
});
