import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, count, eq, ne, sql } from 'drizzle-orm';
import type { ZodType } from 'zod';
import { destroyAllSessions } from '../auth/sessions';
import { issuePasswordToken } from '../auth/tokens';
import type { SessionUser } from '../auth/sessions';
import type { Db } from '../db/client';
import { blockedDomains, companies, companyDomains, departments, users } from '../db/schema';
import { sendCompanyMail } from '../mail/company';
import { adminNoticeMail, invitationMail, passwordLinkMail, type NoticeAction } from '../mail/templates';

export type UserRow = typeof users.$inferSelect;

export const fail = (reply: FastifyReply, status: number, error: string) =>
  reply.status(status).send({ error });

/** Einheitliche Validierungsantwort: 400 mit den betroffenen Feldern (Grundlage für Feldfehler im UI). */
export function parseBody<T>(schema: ZodType<T>, body: unknown, reply: FastifyReply): T | undefined {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  void reply.status(400).send({
    error: 'invalid_input',
    fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
  });
  return undefined;
}

export const userColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
  isExternal: users.isExternal,
  departmentId: users.departmentId,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

export async function domainsOf(db: Db, companyId: string): Promise<string[]> {
  const rows = await db
    .select({ d: companyDomains.domain })
    .from(companyDomains)
    .where(eq(companyDomains.companyId, companyId));
  return rows.map((r) => r.d);
}

export async function activeAdminCount(db: Db, companyId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.companyId, companyId), eq(users.role, 'admin'), eq(users.status, 'active')));
  return r?.n ?? 0;
}

export async function emailTaken(db: Db, email: string, exceptId?: string): Promise<boolean> {
  const cond = exceptId
    ? and(sql`lower(${users.email}) = ${email}`, ne(users.id, exceptId))
    : sql`lower(${users.email}) = ${email}`;
  const [r] = await db.select({ id: users.id }).from(users).where(cond).limit(1);
  return !!r;
}

/** Domain-Prüfung für Firmen-Domains (M6): gültiges Format, keine Freemail-Domain, nicht bereits vergeben. */
export const DOMAIN_RE = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export async function domainProblem(
  db: Db,
  domain: string,
  exceptCompanyId?: string,
): Promise<'domain_invalid' | 'domain_blocked' | 'domain_taken' | null> {
  if (!DOMAIN_RE.test(domain)) return 'domain_invalid';
  const [blocked] = await db.select().from(blockedDomains).where(eq(blockedDomains.domain, domain)).limit(1);
  if (blocked) return 'domain_blocked';
  const [owner] = await db
    .select({ companyId: companyDomains.companyId })
    .from(companyDomains)
    .where(eq(companyDomains.domain, domain))
    .limit(1);
  if (owner && owner.companyId !== exceptCompanyId) return 'domain_taken';
  return null;
}

/** Abteilung muss zur Firma gehören (sonst wie „nicht vorhanden“ behandeln). */
export async function departmentBelongs(db: Db, departmentId: string, companyId: string): Promise<boolean> {
  const [d] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(and(eq(departments.id, departmentId), eq(departments.companyId, companyId)))
    .limit(1);
  return !!d;
}

export async function companyInfo(db: Db, companyId: string) {
  const [c] = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return c;
}

/** Einladungs-Mail (N-01) über den Mailserver der Firma des Eingeladenen. */
export async function sendInvitation(
  app: FastifyInstance,
  target: Pick<UserRow, 'email' | 'name' | 'companyId'>,
) {
  const c = await companyInfo(app.deps.db!.db, target.companyId);
  if (!c) return false;
  return sendCompanyMail(
    app,
    target.companyId,
    invitationMail({
      to: target.email,
      name: target.name,
      companyName: c.name,
      loginUrl: `${app.deps.config.PUBLIC_BASE_URL}/login/${c.slug}`,
    }),
  );
}

/**
 * Passwort-Reset durch einen Admin (S-01, S-10): altes Passwort sofort ungültig, Sitzungen beendet,
 * neuer Einmal-Link über den Mailserver der Firma des Nutzers.
 */
export async function adminPasswordReset(app: FastifyInstance, target: UserRow): Promise<void> {
  const db = app.deps.db!.db;
  await db
    .update(users)
    .set({ passwordHash: null, status: 'invited', failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, target.id));
  await destroyAllSessions(db, target.id);
  const token = await issuePasswordToken(db, target.id);
  await sendCompanyMail(
    app,
    target.companyId,
    passwordLinkMail({
      to: target.email,
      name: target.name,
      byAdmin: true,
      link: `${app.deps.config.PUBLIC_BASE_URL}/passwort-festlegen?token=${token}`,
    }),
  );
}

/**
 * Information an alle aktiven Admins einer Firma (S-01, S-10, S-13), ohne den Handelnden selbst.
 * Versand über den Mailserver der informierten Firma.
 */
export async function notifyCompanyAdmins(
  app: FastifyInstance,
  companyId: string,
  actor: SessionUser,
  action: NoticeAction,
  target: { name: string; email: string },
  details?: string,
): Promise<number> {
  const admins = await app.deps
    .db!.db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.companyId, companyId), eq(users.role, 'admin'), eq(users.status, 'active')));
  const at = new Date();
  let sent = 0;
  for (const a of admins) {
    if (a.id === actor.id) continue;
    const ok = await sendCompanyMail(
      app,
      companyId,
      adminNoticeMail({
        to: a.email,
        name: a.name,
        action,
        actor: { name: actor.name, email: actor.email, companyName: actor.companyName },
        target,
        details,
        at,
      }),
    );
    if (ok) sent++;
  }
  return sent;
}

export const me = (req: FastifyRequest) => req.user!;
