
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/training_db';
        console.log(`Connecting to MongoDB at: ${mongoURI}...`);
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected...');
    } catch (err: any) {
        console.error('Error connecting to MongoDB:', err.message);
        // Avoid process.exit so we can see the error in some environments, or keep it to fail fast.
        // Let's keep it but ensure we log first.
        process.exit(1);
    }
};

export default connectDB;
