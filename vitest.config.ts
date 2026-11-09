import { defineConfig } from 'vitest/config';

// Unit- und API-Tests aller Pakete (E2E-Tests laufen separat mit Playwright).
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/server/test/**/*.test.ts', 'apps/web/test/**/*.test.ts'],
    environment: 'node',
    // DB-Integrationstests setzen das Schema zurück – Dateien daher nacheinander ausführen.
    fileParallelism: false,
  },
});
