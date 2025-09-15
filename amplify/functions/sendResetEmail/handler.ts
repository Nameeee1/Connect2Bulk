import type { Handler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const ses = new SESClient({});

interface Payload {
  to: string;
  resetUrl: string;
  firstName?: string;
  lastName?: string;
}

export const handler: Handler = async (event: any) => {
  try {
    // When invoked via Amplify Data custom resolver, args are in event.arguments
    // Also support direct payload (invoke) and API Gateway style body for flexibility
    const payload: Payload = event?.arguments
      ? event.arguments
      : (typeof event?.body === 'string' ? JSON.parse(event.body) : (event as any));

    const to = String(payload?.to || '').trim();
    const resetUrl = String(payload?.resetUrl || '').trim();
    const firstName = payload?.firstName || '';
    const lastName = payload?.lastName || '';

    if (!to || !resetUrl) {
      return false;
    }

    const from = process.env.FROM_EMAIL;
    if (!from) {
      console.warn('FROM_EMAIL not configured for sendResetEmail function');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Email sender not configured' }),
      };
    }

    const subject = 'Set your password for Connect2Bulk';
    const friendly = [firstName, lastName].filter(Boolean).join(' ') || 'there';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2a2f45;">
        <h2 style="margin: 0 0 12px;">Welcome to Connect2Bulk</h2>
        <p style="margin: 0 0 12px;">Hi ${friendly},</p>
        <p style="margin: 0 0 12px;">Your admin created an account for you. Click the button below to set your password and sign in:</p>
        <p style="margin: 16px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #0d6efd; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">Create New Password</a>
        </p>
        <p style="margin: 0 0 12px;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #f8f9fa; padding: 8px; border-radius: 8px;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="margin: 0; font-size: 12px; color: #64748b;">This email was sent automatically. If you did not expect it, you can ignore this message.</p>
      </div>
    `;

    const cmd = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    });
    await ses.send(cmd);

    return true;
  } catch (err: any) {
    console.error('sendResetEmail error:', err);
    return false;
  }
};
