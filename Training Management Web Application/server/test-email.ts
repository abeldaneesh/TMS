import { sendOTP } from './src/utils/emailService';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing email OTP...');
sendOTP('abeldaneesh3@gmail.com', '123456', 'Abel').then(res => {
    console.log('Result:', res);
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
