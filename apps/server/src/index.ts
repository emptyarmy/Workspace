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

try {
  await app.listen({ host: config.SERVER_HOST, port: config.SERVER_PORT });
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error(
      `\nPort ${config.SERVER_PORT} ist bereits belegt (vermutlich durch eine andere Anwendung).\n` +
        `→ In der .env einen freien Port eintragen, z. B. SERVER_PORT=${config.SERVER_PORT + 1}, und „npm run dev“ neu starten.\n` +
        `  Belegung prüfen: lsof -nP -iTCP:${config.SERVER_PORT} -sTCP:LISTEN\n`,
    );
    await db?.close();
    process.exit(1);
  }
  throw err;
}
if (!db) app.log.warn('DATABASE_URL nicht gesetzt – Server läuft ohne Datenbank (nur Katalog/Health).');
