import type { FastifyPluginAsync } from 'fastify';
import { catalog } from '@ai-tpi/catalog';

/**
 * Fragenkatalog lesen. In Phase 4 kommt hier die Authentifizierung dazu (nur angemeldete Nutzer).
 */
export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/catalog', async () => catalog);

  app.get<{ Params: { id: string } }>('/api/catalog/key-areas/:id', async (req, reply) => {
    const area = catalog.keyAreas.find((a) => a.id === req.params.id.toUpperCase());
    if (!area) return reply.status(404).send({ error: 'not_found' });
    return area;
  });
};
