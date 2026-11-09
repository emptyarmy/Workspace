import type { MailMessage } from './mailer';

type Lang = 'de' | 'en';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function wrap(title: string, paragraphs: string[], link?: { href: string; label: string }): string {
  const button = link
    ? `<p><a href="${esc(link.href)}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(link.label)}</a></p>
<p style="color:#5b6573;font-size:13px">${esc(link.href)}</p>`
    : '';
  return `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#1b1f24;max-width:560px">
<h2 style="color:#1f3a5f">${esc(title)}</h2>
${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n')}
${button}
</body></html>`;
}

/** Einladung nach Anlage durch den Admin (N-01): Link zur Login-Seite + Anleitung „Passwort vergessen“. */
export function invitationMail(p: {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
  lang?: Lang;
}): MailMessage {
  const de = (p.lang ?? 'de') === 'de';
  const subject = de
    ? `Einladung: Testprozess-Reifegrad ${p.companyName}`
    : `Invitation: test process maturity ${p.companyName}`;
  const lines = de
    ? [
        `Hallo ${p.name},`,
        `Sie wurden für die Bewertung des Testprozess-Reifegrads von ${p.companyName} eingeladen.`,
        'So legen Sie Ihr erstes Passwort selbst fest:',
        '1. Öffnen Sie die Anmeldeseite über den Link unten.',
        '2. Klicken Sie auf „Passwort vergessen?“ und geben Sie diese E-Mail-Adresse ein.',
        '3. Sie erhalten einen Einmal-Link (30 Minuten gültig), mit dem Sie Ihr Passwort festlegen.',
      ]
    : [
        `Hello ${p.name},`,
        `You have been invited to assess the test process maturity of ${p.companyName}.`,
        'To set your first password yourself:',
        '1. Open the sign-in page using the link below.',
        '2. Click “Forgot password?” and enter this email address.',
        '3. You will receive a one-time link (valid for 30 minutes) to set your password.',
      ];
  const label = de ? 'Zur Anmeldeseite' : 'Go to sign-in page';
  return {
    to: p.to,
    subject,
    text: `${lines.join('\n')}\n\n${label}: ${p.loginUrl}\n`,
    html: wrap(subject, lines, { href: p.loginUrl, label }),
  };
}

/** Einmal-Link zum Festlegen des Passworts (N-07, „Passwort vergessen“ und Admin-Reset). */
export function passwordLinkMail(p: {
  to: string;
  name: string;
  link: string;
  byAdmin?: boolean;
  lang?: Lang;
}): MailMessage {
  const de = (p.lang ?? 'de') === 'de';
  const subject = de ? 'Ihr Link zum Festlegen des Passworts' : 'Your link to set your password';
  const lines = de
    ? [
        `Hallo ${p.name},`,
        p.byAdmin
          ? 'Ein Administrator hat Ihr Passwort zurückgesetzt. Ihr bisheriges Passwort ist nicht mehr gültig.'
          : 'Sie haben einen Link zum Festlegen Ihres Passworts angefordert.',
        'Der Link ist 30 Minuten gültig und kann nur einmal verwendet werden.',
        'Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.',
      ]
    : [
        `Hello ${p.name},`,
        p.byAdmin
          ? 'An administrator has reset your password. Your previous password is no longer valid.'
          : 'You requested a link to set your password.',
        'The link is valid for 30 minutes and can be used only once.',
        'If you did not request this, you can ignore this email.',
      ];
  const label = de ? 'Passwort festlegen' : 'Set password';
  return {
    to: p.to,
    subject,
    text: `${lines.join('\n')}\n\n${label}: ${p.link}\n`,
    html: wrap(subject, lines, { href: p.link, label }),
  };
}

/** Art der Aktion, über die die Admins einer Firma informiert werden (S-01, S-10, S-13). */
export type NoticeAction =
  | 'admin_created'
  | 'role_changed'
  | 'user_deactivated'
  | 'user_activated'
  | 'password_reset'
  | 'admin_deleted';

const NOTICE_TEXT: Record<NoticeAction, { de: string; en: string }> = {
  admin_created: {
    de: 'hat einen weiteren Admin für Ihre Firma angelegt',
    en: 'created another admin for your company',
  },
  role_changed: {
    de: 'hat die Rolle eines Nutzers Ihrer Firma geändert',
    en: 'changed the role of a user in your company',
  },
  user_deactivated: {
    de: 'hat einen Nutzer Ihrer Firma deaktiviert',
    en: 'deactivated a user in your company',
  },
  user_activated: { de: 'hat einen Nutzer Ihrer Firma aktiviert', en: 'activated a user in your company' },
  password_reset: {
    de: 'hat das Passwort eines Nutzers Ihrer Firma zurückgesetzt',
    en: 'reset the password of a user in your company',
  },
  admin_deleted: { de: 'hat einen Admin Ihrer Firma gelöscht', en: 'deleted an admin of your company' },
};

const NOTICE_SUBJECT: Record<NoticeAction, { de: string; en: string }> = {
  admin_created: { de: 'Neuer Admin angelegt', en: 'New admin created' },
  role_changed: { de: 'Rolle geändert', en: 'Role changed' },
  user_deactivated: { de: 'Nutzer deaktiviert', en: 'User deactivated' },
  user_activated: { de: 'Nutzer aktiviert', en: 'User activated' },
  password_reset: { de: 'Passwort zurückgesetzt', en: 'Password reset' },
  admin_deleted: { de: 'Admin gelöscht', en: 'Admin deleted' },
};

/**
 * Information an die Admins einer Firma (S-01, S-10, S-13): wer (Name, E-Mail, Firma), was, wann, betroffener Nutzer.
 */
export function adminNoticeMail(p: {
  to: string;
  name: string;
  action: NoticeAction;
  actor: { name: string; email: string; companyName: string };
  target: { name: string; email: string };
  details?: string;
  at: Date;
  lang?: Lang;
}): MailMessage {
  const de = (p.lang ?? 'de') === 'de';
  const when = p.at.toLocaleString(de ? 'de-DE' : 'en-GB', { timeZone: 'Europe/Berlin' });
  const what = NOTICE_TEXT[p.action][de ? 'de' : 'en'];
  const subject = `${de ? 'Hinweis' : 'Notice'}: ${NOTICE_SUBJECT[p.action][de ? 'de' : 'en']} – ${p.target.name}`;
  const lines = de
    ? [
        `Hallo ${p.name},`,
        `${p.actor.name} (${p.actor.email}, ${p.actor.companyName}) ${what}.`,
        `Betroffener Nutzer: ${p.target.name} (${p.target.email})`,
        ...(p.details ? [`Details: ${p.details}`] : []),
        `Zeitpunkt: ${when}`,
        'Diese Information erhalten alle Admins Ihrer Firma. Der Vorgang ist im Audit-Log Ihrer Firma vermerkt.',
      ]
    : [
        `Hello ${p.name},`,
        `${p.actor.name} (${p.actor.email}, ${p.actor.companyName}) ${what}.`,
        `Affected user: ${p.target.name} (${p.target.email})`,
        ...(p.details ? [`Details: ${p.details}`] : []),
        `Time: ${when}`,
        "All admins of your company receive this notice. The action is recorded in your company's audit log.",
      ];
  return { to: p.to, subject, text: `${lines.join('\n')}\n`, html: wrap(subject, lines) };
}

/** Test-Mail aus dem Reiter „E-Mail“ (Mailserver der Firma prüfen). */
export function testMail(p: {
  to: string;
  name: string;
  companyName: string;
  via: string;
  lang?: Lang;
}): MailMessage {
  const de = (p.lang ?? 'de') === 'de';
  const subject = de ? `Test-Mail: ${p.companyName}` : `Test email: ${p.companyName}`;
  const lines = de
    ? [
        `Hallo ${p.name},`,
        `diese Test-Mail wurde über ${p.via} versendet. Der Mailversand Ihrer Firma funktioniert.`,
      ]
    : [`Hello ${p.name},`, `this test email was sent via ${p.via}. Your company's email delivery works.`];
  return { to: p.to, subject, text: `${lines.join('\n')}\n`, html: wrap(subject, lines) };
}
