
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User';
import Institution from './src/models/Institution';

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/training_db');
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Institution.deleteMany({});
        console.log('Cleared existing data');

        // Create Institutions
        const institutions = [
            {
                _id: 'inst-1',
                name: 'District General Hospital',
                type: 'Hospital',
                location: 'Main City Center',
            },
            {
                _id: 'inst-2',
                name: 'Community Health Center - North',
                type: 'CHC',
                location: 'North Zone',
            }
        ];

        for (const instData of institutions) {
            await Institution.create(instData);
            console.log(`Created institution: ${instData.name}`);
        }

        const officerPassword = await bcrypt.hash('officer123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);
        const instPassword = await bcrypt.hash('inst123', 10);
        const partPassword = await bcrypt.hash('part123', 10);

        const users = [
            {
                _id: 'user-1',
                email: 'admin@dmo.gov',
                name: 'Dr. Admin Kumar',
                password: adminPassword,
                role: 'master_admin',
                isApproved: true
            },
            {
                _id: 'user-2',
                email: 'priya@dmo.gov',
                name: 'Dr. Priya Sharma',
                password: officerPassword,
                role: 'program_officer',
                isApproved: true
            },
            {
                _id: 'user-4',
                email: 'anjali@hospital1.gov',
                name: 'Dr. Anjali Patel',
                password: instPassword,
                role: 'institutional_admin',
                institutionId: 'inst-1',
                designation: 'Medical Superintendent',
                isApproved: true
            },
            {
                _id: 'user-6',
                email: 'kavita@hospital1.gov',
                name: 'Nurse Kavita Singh',
                password: partPassword,
                role: 'participant',
                institutionId: 'inst-1',
                designation: 'Staff Nurse',
                isApproved: true
            }
        ];

        for (const userData of users) {
            await User.create(userData);
            console.log(`Created user: ${userData.email}`);
        }

        console.log('Seeding complete');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

seed();
