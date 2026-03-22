require('dotenv').config({ path: './server/.env' });
const nodemailer = require('nodemailer');

const passWithSpaces = 'xoio qmkl luoz ulve'; // Match user's screenshot
const passWithoutSpaces = 'xoioqmklluozulve';

async function testPassport(pass) {
    console.log(`Testing with password: "${pass}"`);
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: pass
        }
    });

    try {
        await transporter.verify();
        console.log('Verification SUCCESS');
        return true;
    } catch (error) {
        console.log('Verification FAILED:', error.message);
        return false;
    }
}

async function runTests() {
    await testPassport(passWithSpaces);
    console.log('---');
    await testPassport(passWithoutSpaces);
}

runTests();
