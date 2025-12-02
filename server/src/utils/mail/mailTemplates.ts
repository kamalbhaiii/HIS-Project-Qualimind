// src/modules/mail/emailTemplates.ts
import cfg from "@config/index";

const APP_NAME = cfg.nodemailer.name_from;
const APP_BASE_URL  = cfg.frontend.url;

const baseStyles = {
  bodyBg: '#f4f5fb',
  cardBg: '#ffffff',
  primary: '#4f46e5', // indigo-ish accent
  textMain: '#111827',
  textMuted: '#6b7280',
};

function wrapInLayout(title: string, contentHtml: string) {
  const { bodyBg, cardBg, primary, textMain, textMuted } = baseStyles;

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:${bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:24px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
              <tr>
                <td style="padding:12px 16px 8px;font-size:14px;color:${textMuted};text-align:center;">
                  <strong style="color:${primary};">${APP_NAME}</strong>
                </td>
              </tr>
              <tr>
                <td style="background:${cardBg};border-radius:16px;padding:24px 24px 20px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
                  ${contentHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 8px 0;font-size:11px;color:${textMuted};text-align:center;">
                  You’re receiving this email because you have an account on ${APP_NAME}.
                  If you didn’t request this, you can safely ignore it.
                </td>
              </tr>
              <tr>
                <td style="padding:4px 8px 0;font-size:11px;color:${textMuted};text-align:center;">
                  &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export function buildVerificationEmail(name: string | null | undefined, verificationUrl: string) {
  const safeName = name || 'there';

  const html = wrapInLayout(
    'Verify your email',
    `
      <h1 style="margin:0 0 8px;font-size:22px;color:${baseStyles.textMain};">
        Verify your email
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:${baseStyles.textMuted};line-height:1.5;">
        Hi ${safeName},<br/>
        Thanks for signing up for <strong>${APP_NAME}</strong>. Please confirm that this is your email address to finish setting up your account.
      </p>

      <table border="0" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
        <tr>
          <td align="center" bgcolor="${baseStyles.primary}" style="border-radius:999px;">
            <a href="${verificationUrl}"
               style="display:inline-block;padding:10px 22px;border-radius:999px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:500;">
              Verify email
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:12px;color:${baseStyles.textMuted};line-height:1.5;">
        If the button above doesn’t work, copy and paste this URL into your browser:
      </p>
      <p style="margin:0;font-size:11px;color:${baseStyles.textMuted};word-break:break-all;">
        <a href="${verificationUrl}" style="color:${baseStyles.primary};text-decoration:none;">
          ${verificationUrl}
        </a>
      </p>
    `
  );

  const text = `Hi ${safeName},

Thanks for signing up for ${APP_NAME}. Please verify your email address by opening this link:

${verificationUrl}

If you didn’t sign up, you can ignore this email.`;

  return {
    subject: `Verify your email for ${APP_NAME}`,
    html,
    text,
  };
}

export function buildWelcomeEmail(name: string | null | undefined) {
  const safeName = name || 'there';
  const dashboardUrl = `${APP_BASE_URL}/dashboard`;

  const html = wrapInLayout(
    'Welcome to QualiMind',
    `
      <h1 style="margin:0 0 8px;font-size:22px;color:${baseStyles.textMain};">
        Welcome to ${APP_NAME} 👋
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:${baseStyles.textMuted};line-height:1.5;">
        Hi ${safeName},<br/>
        Your account is all set up. You can now upload datasets, run preprocessing jobs,
        and explore insights with a clean dashboard experience.
      </p>

      <ul style="margin:0 0 16px;padding-left:18px;font-size:13px;color:${baseStyles.textMuted};line-height:1.6;">
        <li>Upload your first dataset in the <strong>Datasets</strong> tab</li>
        <li>Track preprocessing jobs in real time</li>
        <li>Export processed results in CSV, JSON, or TXT formats</li>
      </ul>

      <table border="0" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
        <tr>
          <td align="center" bgcolor="${baseStyles.primary}" style="border-radius:999px;">
            <a href="${dashboardUrl}"
               style="display:inline-block;padding:10px 22px;border-radius:999px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:500;">
              Go to dashboard
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:${baseStyles.textMuted};line-height:1.5;">
        We’re excited to see what you’ll build. If you have any questions, just reply to this email.
      </p>
    `
  );

  const text = `Hi ${safeName},

Welcome to ${APP_NAME}! Your account is ready.

You can get started by visiting your dashboard:
${dashboardUrl}

From there you can upload datasets, run preprocessing jobs, and export results.

If you have any questions, reply to this email.`;

  return {
    subject: `Welcome to ${APP_NAME}!`,
    html,
    text,
  };
}

// src/modules/mail/emailTemplates.ts

export function buildAccountVerifiedEmail(name: string | null | undefined) {
  const subject = 'Your QualiMind Account Is Now Verified 🎉';

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:40px 0;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;
                padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <h2 style="color:#111;font-size:22px;margin-top:0;">
        🎉 Your Account Is Successfully Verified!
      </h2>

      <p style="font-size:15px;color:#555;line-height:1.6;">
        Hi <strong>${name || 'there'}</strong>,
      </p>

      <p style="font-size:15px;color:#555;line-height:1.6;">
        Your email has now been verified and your QualiMind account is fully active.
        You can now upload datasets, track processing jobs, configure your settings,
        and enjoy the full power of the platform.
      </p>

      <div style="margin:30px 0;text-align:center;">
        <a href="https://app.qualimind.ai/login"
           style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;
                  font-size:15px;text-decoration:none;display:inline-block;">
          Go to Dashboard
        </a>
      </div>

      <p style="font-size:14px;color:#777;">
        If you did not verify this account, please contact support immediately.
      </p>

      <hr style="border:0;border-top:1px solid #e5e5e5;margin:24px 0;" />

      <p style="font-size:12px;color:#999;text-align:center;">
        © ${new Date().getFullYear()} QualiMind. All rights reserved.
      </p>

    </div>
  </div>
  `;

  const text = `
Your QualiMind Account Is Verified!

Hi ${name || 'there'},

Your email has been successfully verified. Your QualiMind account is now fully active.

Go to dashboard: https://app.qualimind.ai/login

If this wasn't you, please contact support immediately.

© ${new Date().getFullYear()} QualiMind
  `;

  return { subject, html, text };
}
