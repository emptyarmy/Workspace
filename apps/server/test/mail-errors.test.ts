/**
 * Test-Mail: Versandfehler werden einem verständlichen Grund zugeordnet (Anzeige im Admin-Bereich).
 * Fehlerobjekte wie von nodemailer bzw. Node geliefert.
 */
import { describe, expect, it } from 'vitest';
import nodemailer from 'nodemailer';
import { classifyMailError } from '../src/mail/mailer';

const err = (o: Record<string, unknown>) => Object.assign(new Error(String(o.message ?? '')), o);

describe('classifyMailError', () => {
  it.each([
    [{ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:1025' }, 'unreachable'],
    [{ code: 'EDNS', message: 'getaddrinfo ENOTFOUND smtp.example.invalid' }, 'unreachable'],
    [{ message: 'getaddrinfo ENOTFOUND mail.firma.invalid' }, 'unreachable'],
    [{ code: 'ETIMEDOUT', message: 'Connection timeout' }, 'timeout'],
    [{ code: 'ETIMEDOUT', message: 'Greeting never received' }, 'timeout'],
    [{ code: 'EAUTH', responseCode: 535, message: 'Invalid login: 535 5.7.8 Error' }, 'auth_failed'],
    [{ code: 'EENVELOPE', responseCode: 530, message: '530 5.7.0 Authentication required' }, 'auth_failed'],
    [
      { code: 'ESOCKET', message: 'C0: error:0A00010B:SSL routines:ssl3_get_record:wrong version number' },
      'tls',
    ],
    [{ code: 'ESOCKET', message: 'self-signed certificate' }, 'tls'],
    [{ code: 'EENVELOPE', responseCode: 550, message: '550 Sender address rejected' }, 'rejected'],
    [{ message: 'irgendetwas' }, 'other'],
  ])('%j → %s', (e, expected) => {
    expect(classifyMailError(err(e))).toBe(expected);
  });

  it('echter Verbindungsversuch auf einen geschlossenen Port → unreachable', async () => {
    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 9,
      secure: false,
      connectionTimeout: 3000,
    });
    const e = await transport
      .sendMail({ from: 'a@heise.de', to: 'b@heise.de', subject: 'x', text: 'x' })
      .catch((x) => x);
    expect(classifyMailError(e)).toBe('unreachable');
  });
});
