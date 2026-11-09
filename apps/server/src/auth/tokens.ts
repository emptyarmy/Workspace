import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { oneTimeTokens } from '../db/schema';
import { randomToken, sha256 } from './crypto';

/** Einmal-Link: 30 min gültig, nur einmal nutzbar; gespeichert wird nur der Hash (N-07). */
export const ONE_TIME_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function issuePasswordToken(db: Db, userId: string, now = new Date()): Promise<string> {
  // Ältere, noch offene Links desselben Nutzers werden ungültig.
  await db
    .update(oneTimeTokens)
    .set({ usedAt: now })
    .where(and(eq(oneTimeTokens.userId, userId), isNull(oneTimeTokens.usedAt)));
  const token = randomToken();
  await db.insert(oneTimeTokens).values({
    userId,
    purpose: 'password_set',
    tokenHash: sha256(token),
    expiresAt: new Date(now.getTime() + ONE_TIME_TOKEN_TTL_MS),
  });
  return token;
}

/** Prüft ein Token, ohne es zu verbrauchen. */
export async function findValidToken(db: Db, token: string, now = new Date()) {
  const [row] = await db
    .select()
    .from(oneTimeTokens)
    .where(
      and(
        eq(oneTimeTokens.tokenHash, sha256(token)),
        eq(oneTimeTokens.purpose, 'password_set'),
        isNull(oneTimeTokens.usedAt),
        gt(oneTimeTokens.expiresAt, now),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function consumeToken(db: Db, id: string, now = new Date()): Promise<void> {
  await db.update(oneTimeTokens).set({ usedAt: now }).where(eq(oneTimeTokens.id, id));
}
