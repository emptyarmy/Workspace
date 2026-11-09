import type { FastifyRequest } from 'fastify';
import type { Db } from './db/client';
import { auditLog } from './db/schema';

export async function audit(
  db: Db,
  req: FastifyRequest,
  entry: {
    action: string;
    userId?: string | null;
    companyId?: string | null;
    targetCompanyId?: string | null;
    entity?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(auditLog).values({ ...entry, ip: req.socket.remoteAddress ?? null });
}
