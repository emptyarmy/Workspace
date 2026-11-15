/**
 * Produktions-Build des API-Servers (Phase 8c): bündelt src/index.ts und scripts/migrate.ts mit esbuild
 * zu dist/server.mjs und dist/migrate.mjs.
 *
 * - Eigener Code und die Arbeitsbereichs-Pakete (@ai-tpi/shared, @ai-tpi/catalog inkl. catalog.v1.json)
 *   werden eingebunden – sie liegen nur als TypeScript vor.
 * - npm-Abhängigkeiten (fastify, pg, @node-rs/argon2 mit nativem Modul, …) bleiben extern und kommen zur
 *   Laufzeit aus node_modules (npm ci --omit=dev). Damit braucht der Betrieb kein tsx.
 * - dist/setup-cli.mjs (Ersteinrichtung über die Kommandozeile) wird unverändert kopiert.
 * - dist/migrate.mjs findet die SQL-Migrationen über ../drizzle (relativ zu dist/).
 *
 * Aufruf: npm run build -w @ai-tpi/server
 */
import { build } from 'esbuild';
import { chmodSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Alles, was nicht relativ ist und nicht zum Arbeitsbereich gehört, bleibt extern. */
const externalNpm = {
  name: 'external-npm',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('@ai-tpi/')) return undefined;
      return { path: args.path, external: true };
    });
  },
};

rmSync(`${root}dist`, { recursive: true, force: true });
await build({
  absWorkingDir: root,
  entryPoints: { server: 'src/index.ts', migrate: 'scripts/migrate.ts' },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  legalComments: 'none',
  plugins: [externalNpm],
  logLevel: 'info',
});
copyFileSync(`${root}scripts/setup-cli.mjs`, `${root}dist/setup-cli.mjs`);
chmodSync(`${root}dist/setup-cli.mjs`, 0o755);
