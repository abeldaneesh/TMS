import nodemailer from 'nodemailer';

const getTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

export const sendOTP = async (email: string, otp: string, name: string) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: `"DMO TMS Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify your DMO TMS Registration',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering for the DMO Training Management System.</p>
          <p>Please use the following 6-digit code to verify your email address. This code is valid for 10 minutes:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>If you did not attempt to register, please ignore this email.</p>
          <p>Regards,<br/>DMO Administration</p>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP sent to ${email} - MsgID: ${info.messageId}`);
        return true;
    } catch (error: any) {
        console.error('Error sending OTP email:', error);
        console.error('Check your EMAIL_USER and EMAIL_PASS environment variables.');
        if (error.code === 'EAUTH') {
            console.error('Authentication failed. Please verify your Gmail App Password.');
        }
        return false;
    }
};
