// Email service for sending invitations and verification emails using Resend
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Get Resend client with credentials from environment variables
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set. Please configure it in your secrets.');
  }

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is not set. Please configure it in your secrets.');
  }

  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

/**
 * Send an email using Resend API
 * @param options - Email options
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data?.id);
  } catch (error: any) {
    console.error('❌ Email service error:', error);
    throw error;
  }
}

/**
 * Send invitation email with registration link
 * @param email - Recipient email
 * @param inviteToken - Unique invitation token
 * @param coachName - Name of the coach being invited
 */
export async function sendInvitationEmail(
  email: string, 
  inviteToken: string,
  coachName: string
): Promise<void> {
  // Use APP_URL in production, REPLIT_DEV_DOMAIN in development
  let baseUrl: string;
  if (process.env.NODE_ENV === 'development') {
    baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
  } else {
    baseUrl = process.env.APP_URL || '';
    if (!baseUrl) {
      throw new Error('APP_URL environment variable is required in production for email links');
    }
  }
  const registrationUrl = `${baseUrl}/register?token=${inviteToken}`;
  
  await sendEmail({
    to: email,
    subject: 'You\'ve been invited to Swim Squad App',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Swim Squad App Invitation</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Swim Squad App</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e40af; margin-top: 0;">Welcome, ${coachName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              You've been invited to join Swim Squad App as a coach. 
              This platform helps you manage training sessions, track swimmer attendance, and collaborate with fellow coaches.
            </p>
            
            <p style="font-size: 16px; color: #4b5563;">
              Click the button below to create your account and get started:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${registrationUrl}" 
                 style="display: inline-block; 
                        padding: 14px 32px; 
                        background-color: #1e40af; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        font-size: 16px;">
                Create Your Account
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⏰ This invitation expires in 48 hours.</strong>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
              If you can't click the button, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
              ${registrationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              If you didn't expect this invitation, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Send password reset email
 * @param email - Recipient email
 * @param resetToken - Unique password reset token
 * @param firstName - User's first name
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  firstName: string
): Promise<void> {
  let baseUrl: string;
  if (process.env.NODE_ENV === 'development') {
    baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
  } else {
    baseUrl = process.env.APP_URL || '';
    if (!baseUrl) {
      throw new Error('APP_URL environment variable is required in production for email links');
    }
  }
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Swim Squad App</h1>
          </div>

          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e40af; margin-top: 0;">Reset your password, ${firstName}</h2>

            <p style="font-size: 16px; color: #4b5563;">
              We received a request to reset the password for your account. Click the button below to choose a new password:
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block;
                        padding: 14px 32px;
                        background-color: #1e40af;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        font-size: 16px;">
                Reset Password
              </a>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>This link expires in 1 hour.</strong>
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
              If you can't click the button, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Send email verification link
 * @param email - Recipient email
 * @param verificationToken - Unique verification token
 * @param firstName - User's first name
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  firstName: string
): Promise<void> {
  // Use APP_URL in production, REPLIT_DEV_DOMAIN in development
  let baseUrl: string;
  if (process.env.NODE_ENV === 'development') {
    baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
  } else {
    baseUrl = process.env.APP_URL || '';
    if (!baseUrl) {
      throw new Error('APP_URL environment variable is required in production for email links');
    }
  }
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #1e40af; margin-top: 0;">Welcome ${firstName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Please verify your email address to activate your account:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; 
                        padding: 14px 32px; 
                        background-color: #1e40af; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        font-size: 16px;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              This verification link expires in 24 hours.
            </p>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
