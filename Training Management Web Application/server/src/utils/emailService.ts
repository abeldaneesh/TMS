import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter using credentials from .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTP = async (email: string, otp: string, name: string) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[EmailService] WARNING: Email credentials are not set. Emails won\'t be sent successfully.');
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

    console.log(`[EmailService] Attempting to send OTP email to ${email} via Nodemailer...`);

    const mailOptions = {
      from: `"DMO Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your DMO TMS Registration',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[EmailService] OTP sent to ${email} via Nodemailer - MsgID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('Error sending OTP email via Nodemailer:', error);
    // Standardize error message for frontend to match the previous Resend ones if needed, 
    // or just pass it through.
    throw new Error(`Email Error: ${error.message}`);
  }
};
