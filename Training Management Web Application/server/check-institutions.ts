import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institution from './src/models/Institution';

dotenv.config();

async function checkInstitutions() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/training_db');
        console.log('Connected to MongoDB');

        const institutions = await Institution.find();
        console.log('Institutions found:', institutions.length);
        console.log(JSON.stringify(institutions, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkInstitutions();
