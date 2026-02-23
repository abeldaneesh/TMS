import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '';
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export const sendOTP = async (email: string, otp: string, name: string) => {
  try {
    const fromEmail = process.env.EMAIL_USER?.trim() || 'abeldaneesh3@gmail.com';

    if (!apiKey) {
      console.warn('[EmailService] WARNING: SENDGRID_API_KEY is not set. Emails will fail.');
    }

    console.log(`[EmailService] Attempting to send OTP email to ${email} via SendGrid API...`);

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'DMO Admin'
      },
      subject: 'Verify your DMO TMS Registration',
      html: `
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
      `,
    };

    await sgMail.send(msg);

    console.log(`[EmailService] OTP sent successfully to ${email} via SendGrid`);
    return true;
  } catch (error: any) {
    console.error('Error sending OTP email via SendGrid:', error);
    if (error.response) {
      console.error('SendGrid API Body:', error.response.body);
    }
    throw new Error(`Email Error: ${error.message}`);
  }
};
