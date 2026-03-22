
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/training_db');
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} (Role: ${u.role}, Approved: ${u.isApproved})`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
