import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { SecretBox } from '../auth/secrets';
import { companyMailConfig } from '../db/schema';
import type { MailMessage, SmtpSettings } from './mailer';

/** SMTP-Einstellungen der Firma oder null (= Standard-Mailversand der Installation). */
export async function companySmtp(app: FastifyInstance, companyId: string): Promise<SmtpSettings | null> {
  if (!app.deps.db) return null;
  const [cfg] = await app.deps.db.db
    .select()
    .from(companyMailConfig)
    .where(eq(companyMailConfig.companyId, companyId))
    .limit(1);
  if (!cfg || cfg.transport !== 'smtp' || !cfg.host || !cfg.port) return null;
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    username: cfg.username,
    password: new SecretBox(app.deps.config.SECRET_ENCRYPTION_KEY).decrypt(cfg.passwordEnc),
    from: cfg.fromAddress,
  };
}

/**
 * Versendet eine Mail an einen Nutzer über den Mailserver **seiner** Firma (S-04).
 * Fehler beim Versand werden protokolliert, brechen die fachliche Aktion aber nicht ab.
 */
export async function sendCompanyMail(
  app: FastifyInstance,
  companyId: string,
  msg: MailMessage,
): Promise<boolean> {
  if (!app.deps.mailer) return false;
  try {
    await app.deps.mailer.send(msg, await companySmtp(app, companyId));
    return true;
  } catch (err) {
    app.log.error({ err, companyId }, 'Mailversand fehlgeschlagen');
    return false;
  }
}
