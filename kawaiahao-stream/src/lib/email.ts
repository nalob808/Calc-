import nodemailer from 'nodemailer';
import type { BulletinData } from './bulletin';

/**
 * Creates a Nodemailer transporter using SMTP config from env vars.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddress = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP env vars: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    fromAddress: fromAddress || user,
  };
}

/**
 * Sends an email with the given subject and HTML body.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<string> {
  const { transporter, fromAddress } = getTransporter();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    return info.messageId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send email: ${message}`);
  }
}

/**
 * Sends a formatted bulletin preview notification to the personal email.
 * Styled with dark theme (#0a0a0a), gold accents (#c9972b), Playfair Display headings.
 */
export async function sendBulletinNotification(
  bulletinData: BulletinData,
  dashboardUrl: string
): Promise<string> {
  const personalEmail = process.env.PERSONAL_EMAIL;

  if (!personalEmail) {
    throw new Error('Missing PERSONAL_EMAIL env var');
  }

  const orderOfServiceHtml = bulletinData.orderOfService
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #222; color: #c9972b; font-family: 'DM Sans', sans-serif; font-size: 13px;">${item.type}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #222; color: #e0e0e0; font-family: 'DM Sans', sans-serif; font-size: 13px;">${item.title}${item.leader ? ` — ${item.leader}` : ''}${item.hymn ? ` (Hymn #${item.hymn})` : ''}</td>
        </tr>`
    )
    .join('\n');

  const html = `
    <div style="background-color: #0a0a0a; padding: 32px; font-family: 'DM Sans', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111; border-radius: 12px; border: 1px solid #222; overflow: hidden;">
        <div style="background-color: #c9972b; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #0a0a0a; font-size: 24px;">
            Bulletin Received
          </h1>
          <p style="margin: 8px 0 0; color: #0a0a0a; font-size: 14px;">
            Kawaia&#699;ha&#699;o Church Streaming Automation
          </p>
        </div>

        <div style="padding: 24px;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #c9972b; font-size: 20px; margin: 0 0 16px;">
            Service Details
          </h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px; width: 120px;">Date</td>
              <td style="padding: 8px 12px; color: #e0e0e0; font-size: 13px;">${bulletinData.serviceDate || 'Not detected'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px;">Time(s)</td>
              <td style="padding: 8px 12px; color: #e0e0e0; font-size: 13px;">${bulletinData.serviceTimes.join(', ') || 'Not detected'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px;">Sermon</td>
              <td style="padding: 8px 12px; color: #e0e0e0; font-size: 13px; font-weight: 600;">${bulletinData.sermonTitle || 'Not detected'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px;">Pastor</td>
              <td style="padding: 8px 12px; color: #e0e0e0; font-size: 13px;">${bulletinData.pastorName || 'Not detected'}</td>
            </tr>
          </table>

          ${
            bulletinData.orderOfService.length > 0
              ? `
          <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #c9972b; font-size: 20px; margin: 0 0 16px;">
            Order of Service
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            ${orderOfServiceHtml}
          </table>
          `
              : ''
          }

          <div style="text-align: center; margin-top: 24px;">
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #c9972b; color: #0a0a0a; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-family: 'DM Sans', sans-serif;">
              Review &amp; Confirm in Dashboard
            </a>
          </div>
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #222; text-align: center;">
          <p style="margin: 0; color: #555; font-size: 12px;">
            Extracted at ${bulletinData.extractedAt}
          </p>
        </div>
      </div>
    </div>
  `;

  const subject = `Bulletin Ready: ${bulletinData.sermonTitle || 'New Bulletin'} — ${bulletinData.serviceDate || 'Upcoming Service'}`;

  return sendEmail(personalEmail, subject, html);
}

/**
 * Sends a prayer request notification email.
 * Styled with dark theme and gold accents.
 */
export async function sendPrayerRequest(
  name: string,
  email: string,
  request: string
): Promise<string> {
  const prayerEmail = process.env.PRAYER_REQUEST_EMAIL;

  if (!prayerEmail) {
    throw new Error('Missing PRAYER_REQUEST_EMAIL env var');
  }

  const html = `
    <div style="background-color: #0a0a0a; padding: 32px; font-family: 'DM Sans', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #111; border-radius: 12px; border: 1px solid #222; overflow: hidden;">
        <div style="background-color: #c9972b; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; color: #0a0a0a; font-size: 22px;">
            New Prayer Request
          </h1>
        </div>

        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px; width: 80px;">Name</td>
              <td style="padding: 8px 12px; color: #e0e0e0; font-size: 14px; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; font-size: 13px;">Email</td>
              <td style="padding: 8px 12px; color: #c9972b; font-size: 14px;">${email}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 16px; background-color: #0a0a0a; border-radius: 8px; border-left: 3px solid #c9972b;">
            <p style="margin: 0; color: #e0e0e0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${request}</p>
          </div>
        </div>

        <div style="padding: 16px 24px; border-top: 1px solid #222; text-align: center;">
          <p style="margin: 0; color: #555; font-size: 12px;">
            Submitted at ${new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    prayerEmail,
    `Prayer Request from ${name}`,
    html
  );
}
