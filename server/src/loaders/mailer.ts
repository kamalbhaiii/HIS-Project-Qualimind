// src/loaders/mailer.ts
import nodemailer from 'nodemailer';
import cfg from '@config/index';

const GMAIL_SMTP_USER = cfg.nodemailer.smtp_user;
const GMAIL_SMTP_PASS = cfg.nodemailer.smtp_pass;
const EMAIL_FROM_NAME = cfg.nodemailer.smtp_user;
const EMAIL_FROM_ADDRESS = cfg.nodemailer.email_from;


if (!GMAIL_SMTP_USER || !GMAIL_SMTP_PASS) {
  console.warn(
    '[mailer] GMAIL_SMTP_USER or GMAIL_SMTP_PASS not set – email sending will fail.'
  );
}

export const mailerTransport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_SMTP_USER,
    pass: GMAIL_SMTP_PASS,
  },
});

export function getFromAddress() {
  const fromEmail = EMAIL_FROM_ADDRESS || GMAIL_SMTP_USER;
  return `"${EMAIL_FROM_NAME}" <${fromEmail}>`;
}
