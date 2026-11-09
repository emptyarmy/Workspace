import type { FastifyPluginAsync } from 'fastify';
import { catalog } from '@ai-tpi/catalog';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => {
    const db = app.deps.db ? ((await app.deps.db.ping()) ? 'up' : 'down') : 'not_configured';
    return { status: db === 'down' ? 'degraded' : 'ok', db, catalogVersion: catalog.catalogVersion };
  });
};
