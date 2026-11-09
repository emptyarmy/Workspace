import { buildApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db/client';
import { createMailer } from './mail/mailer';

const config = loadConfig();
const db = config.DATABASE_URL ? createDb(config.DATABASE_URL) : undefined;
const app = await buildApp({ config, db, mailer: createMailer(config) });

const shutdown = async () => {
  await app.close();
  await db?.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ host: config.SERVER_HOST, port: config.SERVER_PORT });
if (!db) app.log.warn('DATABASE_URL nicht gesetzt – Server läuft ohne Datenbank (nur Katalog/Health).');
