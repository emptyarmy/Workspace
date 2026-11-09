import type { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { fail, me, parseBody } from '../admin/helpers';
import { audit } from '../audit';
import { DEFAULT_INDUSTRIES } from '../db/industries';
import { companies, industries } from '../db/schema';
import { requireAuth } from '../plugins/auth';

/** Standardbranchen (WZ 2008 / NACE) können umbenannt und deaktiviert, aber nicht gelöscht werden. */
const STANDARD = new Set(DEFAULT_INDUSTRIES.map((i) => i.code));

const name = z.string().trim().min(2).max(80);
const naceRef = z.string().trim().max(60).nullable().optional();
/** Code: 2–5 Zeichen, Großbuchstaben und Ziffern, beginnt mit einem Buchstaben; nach dem Anlegen unveränderlich. */
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/);
const createBody = z.object({ code: codeSchema, nameDe: name, nameEn: name, naceRef }).strict();
const patchBody = z
  .object({ nameDe: name.optional(), nameEn: name.optional(), naceRef, active: z.boolean().optional() })
  .strict();

/**
 * Branchenliste pflegen (Admin-Bereich, Reiter „Branchen“; 08_mandanten-und-benchmark.md, Abschnitt 4).
 * Die Liste gilt für **alle** Firmen, weil der Benchmark Firmen derselben Branche vergleicht.
 * Wie viele bzw. welche Firmen eine Branche nutzen, wird nicht offengelegt (S-06).
 */
export const adminIndustryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth(['admin']));
  const db = () => app.deps.db!.db;

  async function byCode(code: string) {
    const c = codeSchema.safeParse(code);
    if (!c.success) return undefined;
    const [i] = await db().select().from(industries).where(eq(industries.code, c.data)).limit(1);
    return i;
  }
  async function inUse(id: string) {
    const [r] = await db().select({ n: count() }).from(companies).where(eq(companies.industryId, id));
    return (r?.n ?? 0) > 0;
  }
  /** Bezeichnungen müssen je Sprache eindeutig sein (ohne Groß-/Kleinschreibung), sonst sind Auswahllisten mehrdeutig. */
  async function nameTaken(field: 'nameDe' | 'nameEn', value: string, exceptId?: string) {
    const col = industries[field];
    const [r] = await db()
      .select({ id: industries.id })
      .from(industries)
      .where(
        and(sql`lower(${col}) = ${value.toLowerCase()}`, exceptId ? ne(industries.id, exceptId) : undefined),
      )
      .limit(1);
    return !!r;
  }

  app.get('/api/admin/industries', async (req) => {
    const [own] = await db()
      .select({ industryId: companies.industryId })
      .from(companies)
      .where(eq(companies.id, me(req).companyId));
    const rows = await db().select().from(industries).orderBy(asc(industries.nameDe));
    return rows.map(({ id, ...i }) => ({
      ...i,
      standard: STANDARD.has(i.code),
      ownCompany: id === own?.industryId,
    }));
  });

  app.post('/api/admin/industries', async (req, reply) => {
    const b = parseBody(createBody, req.body, reply);
    if (!b) return;
    if (await byCode(b.code)) return fail(reply, 409, 'code_taken');
    if (await nameTaken('nameDe', b.nameDe)) return fail(reply, 409, 'name_de_taken');
    if (await nameTaken('nameEn', b.nameEn)) return fail(reply, 409, 'name_en_taken');
    const [created] = await db()
      .insert(industries)
      .values({ code: b.code, nameDe: b.nameDe, nameEn: b.nameEn, naceRef: b.naceRef || null })
      .returning();
    const u = me(req);
    await audit(db(), req, {
      action: 'admin.industry_created',
      userId: u.id,
      companyId: u.companyId,
      entity: 'industry',
      entityId: b.code,
      details: { code: b.code, nameDe: b.nameDe, nameEn: b.nameEn },
    });
    const { id: _id, ...rest } = created!;
    return reply.status(201).send({ ...rest, standard: false, ownCompany: false });
  });

  app.patch<{ Params: { code: string } }>('/api/admin/industries/:code', async (req, reply) => {
    const i = await byCode(req.params.code);
    if (!i) return fail(reply, 404, 'not_found');
    const b = parseBody(patchBody, req.body, reply);
    if (!b) return;
    if (b.nameDe && (await nameTaken('nameDe', b.nameDe, i.id))) return fail(reply, 409, 'name_de_taken');
    if (b.nameEn && (await nameTaken('nameEn', b.nameEn, i.id))) return fail(reply, 409, 'name_en_taken');
    // Eine Branche, der Firmen zugeordnet sind, bleibt aktiv – sonst fiele sie aus deren Auswahl und dem Benchmark.
    if (b.active === false && i.active && (await inUse(i.id))) return fail(reply, 409, 'industry_in_use');
    const patch: Partial<typeof industries.$inferInsert> = {};
    if (b.nameDe) patch.nameDe = b.nameDe;
    if (b.nameEn) patch.nameEn = b.nameEn;
    if (b.naceRef !== undefined) patch.naceRef = b.naceRef || null;
    if (b.active !== undefined) patch.active = b.active;
    const [updated] = await db().update(industries).set(patch).where(eq(industries.id, i.id)).returning();
    const u = me(req);
    await audit(db(), req, {
      action: 'admin.industry_updated',
      userId: u.id,
      companyId: u.companyId,
      entity: 'industry',
      entityId: i.code,
      details: {
        code: i.code,
        changed: Object.keys(patch),
        ...(patch.nameDe ? { fromDe: i.nameDe, toDe: patch.nameDe } : {}),
        ...(patch.nameEn ? { fromEn: i.nameEn, toEn: patch.nameEn } : {}),
      },
    });
    const { id, ...rest } = updated!;
    const [own] = await db()
      .select({ industryId: companies.industryId })
      .from(companies)
      .where(eq(companies.id, u.companyId));
    return { ...rest, standard: STANDARD.has(rest.code), ownCompany: id === own?.industryId };
  });

  /** Nur selbst angelegte, nicht verwendete Branchen können gelöscht werden. */
  app.delete<{ Params: { code: string } }>('/api/admin/industries/:code', async (req, reply) => {
    const i = await byCode(req.params.code);
    if (!i) return fail(reply, 404, 'not_found');
    if (STANDARD.has(i.code)) return fail(reply, 409, 'standard_industry');
    if (await inUse(i.id)) return fail(reply, 409, 'industry_in_use');
    await db().delete(industries).where(eq(industries.id, i.id));
    const u = me(req);
    await audit(db(), req, {
      action: 'admin.industry_deleted',
      userId: u.id,
      companyId: u.companyId,
      entity: 'industry',
      entityId: i.code,
      details: { code: i.code, nameDe: i.nameDe },
    });
    return reply.status(204).send();
  });
};
