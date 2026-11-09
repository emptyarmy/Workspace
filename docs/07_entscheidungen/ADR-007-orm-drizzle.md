# ADR-007: Drizzle ORM statt Prisma

- **Status:** akzeptiert (09.11.2026)
- **Ersetzt:** die ORM-Wahl „Prisma“ in ADR-003 und `04_architektur/01_architektur.md`
- **Bezug:** ADR-003, N-06

## Kontext
Beim Aufsetzen des Grundgerüsts zeigte sich: Prisma lädt beim Installieren bzw. Generieren plattformspezifische Engine-Binärdateien von einem eigenen Server nach. In abgeschotteten Umgebungen (Firmen-Proxy, CI ohne freien Internetzugang) ist das eine häufige Fehlerquelle; zudem war die aktuelle Prisma-Hauptversion zum Zeitpunkt nur als Vorabversion (RC) verfügbar.

## Entscheidung
**Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) mit dem Treiber `pg`:
- reines TypeScript, keine Binärdateien, nur npm-Registry nötig,
- Schema als TypeScript-Code (`apps/server/src/db/schema.ts`), SQL-Migrationen versioniert in `apps/server/drizzle/`,
- funktionale Indizes (z. B. `lower(email)` für case-insensitiv eindeutige E-Mails) direkt abbildbar.

## Konsequenzen
- Migration erzeugen: `npm run db:generate`; ausführen inkl. Stammdaten: `npm run db:migrate`.
- Row Level Security (Mandantentrennung) wird per SQL-Migration ergänzt.
