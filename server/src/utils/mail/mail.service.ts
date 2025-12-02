// src/modules/mail/mail.service.ts
import { mailerTransport, getFromAddress } from '../../loaders/mailer';
import { buildAccountVerifiedEmail, buildVerificationEmail, buildWelcomeEmail } from './mailTemplates';

interface BasicUser {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Send email verification mail for non-Google signups.
 * `verificationUrl` should be a link to your frontend verification route.
 */
export async function sendEmailVerificationMail(
  user: BasicUser,
  verificationUrl: string
) {
  const { subject, html, text } = buildVerificationEmail(user.name, verificationUrl);

  await mailerTransport.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject,
    html,
    text,
  });
}

/**
 * Send welcome mail after successful signup (or after email verification,
 * depending on the flow you choose).
 */
export async function sendWelcomeMail(user: BasicUser) {
  const { subject, html, text } = buildWelcomeEmail(user.name);

  await mailerTransport.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject,
    html,
    text,
  });
}


export async function sendAccountVerifiedMail(user: BasicUser) {
  const { subject, html, text } = buildAccountVerifiedEmail(user.name);

  await mailerTransport.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject,
    html,
    text,
  });
}