/**
 * Führt alle Migrationen aus apps/server/drizzle aus und befüllt Stammdaten (Branchen, Freemail-Sperrliste).
 * Aufruf: npm run db:migrate
 */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DEFAULT_BLOCKED_DOMAINS } from '@ai-tpi/shared';
import { createDb } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { blockedDomains, industries, setupState } from '../src/db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ist nicht gesetzt (siehe .env.example).');
  process.exit(1);
}
const handle = createDb(url);
await migrate(handle.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
await handle.db.insert(industries).values(DEFAULT_INDUSTRIES).onConflictDoNothing();
await handle.db
  .insert(blockedDomains)
  .values(DEFAULT_BLOCKED_DOMAINS.map((domain) => ({ domain })))
  .onConflictDoNothing();
await handle.db.insert(setupState).values({ id: 1 }).onConflictDoNothing();
console.log('Migration und Stammdaten: OK');
await handle.close();
