import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institution from './src/models/Institution';

dotenv.config();

async function seedInstitutions() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/training_db';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const existingCount = await Institution.countDocuments();
        if (existingCount > 0) {
            console.log(`Found ${existingCount} institutions. Skipping seed to prevent duplicates.`);
            await mongoose.disconnect();
            return;
        }

        const institutions = [
            { _id: 'inst-1', name: 'District General Hospital', type: 'Hospital', location: 'Main City Center' },
            { _id: 'inst-2', name: 'Community Health Center - North', type: 'CHC', location: 'North Zone' },
            { _id: 'inst-3', name: 'Primary Health Center - East', type: 'PHC', location: 'East Zone' },
            { _id: 'inst-4', name: 'Primary Health Center - West', type: 'PHC', location: 'West Zone' },
            { _id: 'inst-5', name: 'Urban Health Center - South', type: 'UHC', location: 'South Zone' }
        ];

        await Institution.insertMany(institutions);
        console.log(`Inserted ${institutions.length} institutions successfully.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding institutions:', err);
    }
}

seedInstitutions();
