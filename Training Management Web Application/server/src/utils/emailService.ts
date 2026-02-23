import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
// It will fall back to a dummy key to prevent crashes if not set during init
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const sendOTP = async (email: string, otp: string, name: string) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EmailService] WARNING: RESEND_API_KEY is not set. Emails won\'t be sent successfully.');
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Account Verification</h2>
          <p style="font-size: 16px; color: #333;">Hello ${name},</p>
          <p style="font-size: 16px; color: #333;">Thank you for registering for the DMO Training Management System.</p>
          <p style="font-size: 16px; color: #333;">Please use the following 6-digit code to verify your email address. This code is valid for 10 minutes:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1e293b; margin: 25px 0;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">If you did not attempt to register, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">Regards,<br/>DMO Administration</p>
        </div>
      `;

    console.log(`[EmailService] Attempting to send OTP email to ${email} via Resend...`);

    // Send email via Resend API (HTTP POST) mapping
    // We use "onboarding@resend.dev" as the 'from' address unless you verified your own domain
    // Resend's free tier only allows sending TO the email that registered the Resend account
    // unless you verify a custom domain.
    const { data, error } = await resend.emails.send({
      from: 'DMO Admin <onboarding@resend.dev>', // Required formats for Free Tiers
      to: email, // IMPORTANT: On Resend Free, this MUST be your verified email address until a domain is verified
      subject: 'Verify your DMO TMS Registration',
      html: htmlContent
    });

    if (error) {
      console.error('[EmailService] Resend API Error:', error);
      throw new Error(`Resend Error: ${error.message}`);
    }

    console.log(`[EmailService] OTP sent to ${email} via Resend - MsgID: ${data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Error sending OTP email via Resend:', error);
    throw error;
  }
};
