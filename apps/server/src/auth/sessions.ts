import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { companies, sessions, users } from '../db/schema';
import { randomToken, sha256 } from './crypto';

export const SESSION_COOKIE = 'ai_tpi_session';
/** Leerlauf-Timeout 60 min, absolute Laufzeit 12 h (N-08). */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'assessor' | 'respondent' | 'reader';
  companyId: string;
  companySlug: string;
  companyName: string;
  /** Logo der eigenen Firma für die Kopfzeile (TC-AUTH-013). */
  companyLogoUrl: string | null;
  companyLogoAlt: string | null;
  isExternal: boolean;
  mustChangePassword: boolean;
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomToken();
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt: new Date(Date.now() + ABSOLUTE_TIMEOUT_MS),
  });
  return token;
}

/** Liefert den Nutzer zur Sitzung und verlängert den Leerlauf-Zeitraum; abgelaufene oder inaktive → null. */
export async function resolveSession(db: Db, token: string, now = new Date()): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      lastSeenAt: sessions.lastSeenAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        companyId: users.companyId,
        isExternal: users.isExternal,
        mustChangePassword: users.mustChangePassword,
      },
      companySlug: companies.slug,
      companyName: companies.name,
      companyLogoUrl: companies.logoUrl,
      companyLogoAlt: companies.logoAlt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  if (row.user.status !== 'active' || now.getTime() - row.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }
  await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));
  const { status: _status, ...user } = row.user;
  return {
    ...user,
    companySlug: row.companySlug,
    companyName: row.companyName,
    companyLogoUrl: row.companyLogoUrl,
    companyLogoAlt: row.companyLogoAlt,
  };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function destroyAllSessions(db: Db, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
