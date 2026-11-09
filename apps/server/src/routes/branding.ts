import type { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { companySlugSchema } from '@ai-tpi/shared';
import { companies } from '../db/schema';

export interface Branding {
  name: string;
  logoUrl: string | null;
  logoAlt: string;
}

/** Neutrales Branding für /login und für unbekannte Firmenkürzel (verrät keine Firmennamen, R-01). */
export const NEUTRAL_BRANDING: Branding = { name: 'AI_TPI', logoUrl: null, logoAlt: 'AI_TPI' };

export const brandingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/branding', async () => NEUTRAL_BRANDING);

  app.get<{ Params: { slug: string } }>('/public/branding/:slug', async (req) => {
    const slug = req.params.slug.toLowerCase();
    if (!companySlugSchema.safeParse(slug).success || !app.deps.db) return NEUTRAL_BRANDING;
    try {
      const [row] = await app.deps.db.db
        .select({ name: companies.name, logoUrl: companies.logoUrl, logoAlt: companies.logoAlt })
        .from(companies)
        .where(and(eq(companies.slug, slug), eq(companies.active, true)))
        .limit(1);
      return row
        ? { name: row.name, logoUrl: row.logoUrl, logoAlt: row.logoAlt ?? row.name }
        : NEUTRAL_BRANDING;
    } catch (err) {
      req.log.warn({ err }, 'branding lookup failed');
      return NEUTRAL_BRANDING;
    }
  });
};
