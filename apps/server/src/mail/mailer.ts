import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** SMTP-Server einer Firma (S-04). Fehlt er, gilt der Standard-Mailversand der Installation (N-05). */
export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username?: string | null;
  password?: string | null;
  from?: string | null;
}

export interface OutboxEntry extends MailMessage {
  sentAt: string;
  /** „system“ oder „smtp:<host>:<port>“ – zeigt in Tests, über welchen Mailserver versendet wurde. */
  via: string;
}

export interface Mailer {
  send(msg: MailMessage, smtp?: SmtpSettings | null): Promise<void>;
  /** Nur bei MAIL_TRANSPORT=memory: versendete Nachrichten (für Tests). */
  outbox?: OutboxEntry[];
}

/**
 * Mailversand: Standard der Installation (sendmail des Betriebssystems oder SMTP, lokal Mailpit, N-05)
 * oder – wenn übergeben – der SMTP-Server der Firma des Empfängers (S-04).
 */
export function createMailer(config: AppConfig): Mailer {
  if (config.MAIL_TRANSPORT === 'memory') {
    const outbox: OutboxEntry[] = [];
    return {
      outbox,
      async send(msg, smtp) {
        outbox.push({
          ...msg,
          sentAt: new Date().toISOString(),
          via: smtp ? `smtp:${smtp.host}:${smtp.port}` : 'system',
        });
      },
    };
  }
  const system: Transporter =
    config.MAIL_TRANSPORT === 'sendmail'
      ? nodemailer.createTransport({ sendmail: true, newline: 'unix' })
      : nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: false });
  return {
    async send(msg, smtp) {
      if (!smtp) {
        await system.sendMail({ from: config.MAIL_FROM, ...msg });
        return;
      }
      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.username ? { user: smtp.username, pass: smtp.password ?? '' } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
      try {
        await transport.sendMail({ from: smtp.from || config.MAIL_FROM, ...msg });
      } finally {
        transport.close();
      }
    },
  };
}
