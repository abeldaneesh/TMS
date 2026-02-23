require('dotenv').config({ path: './server/.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function testInvalidEmail() {
    console.log('Testing Nodemailer with INVALID email...');

    const mailOptions = {
        from: `"DMO Admin Test" <${process.env.EMAIL_USER}>`,
        to: 'test@gma', // Invalid domain
        subject: 'Nodemailer Test',
        text: 'Testing failure behavior'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Success? (Unexpected):', info.messageId);
    } catch (error) {
        console.log('Caught Expected Error:', error.message);
        console.log('Error Code:', error.code);
    }
}

testInvalidEmail();
