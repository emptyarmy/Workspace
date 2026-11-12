/**
 * Setzt die E2E-Testdatenbank zurück (Schema löschen, migrieren, Stammdaten). Wird von Playwright vor dem Serverstart aufgerufen.
 * Sicherheitsnetz: läuft nur, wenn der Datenbankname auf _e2e oder _test endet.
 */
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DEFAULT_BLOCKED_DOMAINS } from '@ai-tpi/shared';
import { createDb } from '../src/db/client';
import { DEFAULT_INDUSTRIES } from '../src/db/industries';
import { blockedDomains, industries, setupState } from '../src/db/schema';

const url = process.env.DATABASE_URL ?? '';
const dbName = url.split('/').pop()?.split('?')[0] ?? '';
if (!/_(e2e|test)$/.test(dbName)) {
  console.error(`Abbruch: „${dbName}“ ist keine Testdatenbank (Name muss auf _e2e oder _test enden).`);
  process.exit(1);
}
const h = createDb(url);
try {
  await h.db.execute(
    sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
  );
} catch (err) {
  // Verständliche Meldung statt langem Stacktrace (häufigste Ursachen beim lokalen Start).
  const e = err as { cause?: { code?: string; message?: string } };
  const where = (() => {
    try {
      const u = new URL(url);
      return `${u.hostname}:${u.port || 5432}`;
    } catch {
      return url;
    }
  })();
  const code = e.cause?.code ?? '';
  const hint =
    code === 'ECONNREFUSED'
      ? `Die Datenbank unter ${where} ist nicht erreichbar. Läuft Docker? → docker compose up -d db`
      : code === '3D000'
        ? `Die Datenbank „${dbName}“ existiert nicht. → docker compose exec db createdb -U ai_tpi ${dbName}`
        : code === '28000' || code === '28P01'
          ? `Anmeldung an ${where} abgelehnt (${e.cause?.message}). Antwortet dort ein anderes PostgreSQL? Siehe Doku „Fehlerbehebung“.`
          : `Datenbankfehler: ${e.cause?.message ?? String(err)}`;
  console.error(`\nE2E-Datenbank konnte nicht zurückgesetzt werden.\n${hint}\n`);
  await h.close().catch(() => {});
  process.exit(1);
}
await migrate(h.db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
await h.db.insert(industries).values(DEFAULT_INDUSTRIES);
await h.db.insert(blockedDomains).values(DEFAULT_BLOCKED_DOMAINS.map((domain) => ({ domain })));
await h.db.insert(setupState).values({ id: 1 });
console.log(`E2E-Datenbank ${dbName} zurückgesetzt.`);
await h.close();
