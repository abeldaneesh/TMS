import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import connectDB from './src/config/db';

dotenv.config();

async function test() {
    console.log('Testing MongoDB connection...');
    await connectDB();
    console.log('Testing User.findOne...');
    const existingUser = await User.findOne({ email: 'abeldaneesh3@gmail.com' });
    console.log('Result:', !!existingUser);
    process.exit(0);
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
