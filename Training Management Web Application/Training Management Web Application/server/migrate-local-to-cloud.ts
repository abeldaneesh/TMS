
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import Institution from './src/models/Institution';
import Hall from './src/models/Hall';
import Training from './src/models/Training';
import Nomination from './src/models/Nomination';
import Attendance from './src/models/Attendance';
import Notification from './src/models/Notification';
import HallBlock from './src/models/HallBlock';
import HallBookingRequest from './src/models/HallBookingRequest';

dotenv.config();

// Configuration
const LOCAL_URI = 'mongodb://127.0.0.1:27017/training_db';
// We expect MONGODB_URI to be passed via environment variable
const CLOUD_URI = process.env.MONGODB_URI;

if (!CLOUD_URI) {
    console.error('Error: MONGODB_URI environment variable is not set.');
    console.error('Usage: $env:MONGODB_URI="<your_connection_string>"; npx ts-node migrate-local-to-cloud.ts');
    process.exit(1);
}

async function migrate() {
    console.log('🚀 Starting Migration: Local MongoDB -> Cloud MongoDB');

    let localData: any = {};

    // 1. Read from Local DB
    try {
        console.log(`\n1️⃣  Connecting to LOCAL DB (${LOCAL_URI})...`);
        await mongoose.connect(LOCAL_URI);
        console.log('   ✅ Connected to Local DB');

        console.log('   📥 Reading data...');
        localData.users = await User.find({});
        localData.institutions = await Institution.find({});
        localData.halls = await Hall.find({});
        localData.trainings = await Training.find({});
        localData.nominations = await Nomination.find({});
        localData.attendances = await Attendance.find({});
        localData.notifications = await Notification.find({});
        try {
            // Handle cases where models might not exist yet if they were recently added
            localData.hallBlocks = await HallBlock.find({});
        } catch (e) { localData.hallBlocks = []; }
        try {
            localData.hallRequests = await HallBookingRequest.find({});
        } catch (e) { localData.hallRequests = []; }

        console.log(`   📊 Found:`);
        console.log(`      - Users: ${localData.users.length}`);
        console.log(`      - Institutions: ${localData.institutions.length}`);
        console.log(`      - Halls: ${localData.halls.length}`);
        console.log(`      - Trainings: ${localData.trainings.length}`);
        console.log(`      - Nominations: ${localData.nominations.length}`);
        console.log(`      - Attendance: ${localData.attendances.length}`);
        console.log(`      - Notifications: ${localData.notifications.length}`);

        await mongoose.disconnect();
        console.log('   Disconnected from Local DB');

    } catch (err) {
        console.error('❌ Error reading from Local DB:', err);
        process.exit(1);
    }

    // 2. Write to Cloud DB
    try {
        console.log(`\n2️⃣  Connecting to CLOUD DB...`);
        await mongoose.connect(CLOUD_URI as string);
        console.log('   ✅ Connected to Cloud DB');

        console.log('   🗑️  Clearing existing Cloud data (to ensure exact replica)...');
        await Promise.all([
            User.deleteMany({}),
            Institution.deleteMany({}),
            Hall.deleteMany({}),
            Training.deleteMany({}),
            Nomination.deleteMany({}),
            Attendance.deleteMany({}),
            Notification.deleteMany({}),
            HallBlock.deleteMany({}),
            HallBookingRequest.deleteMany({})
        ]);
        console.log('   ✅ Cloud DB cleared');

        console.log('   out  Uploading Local data to Cloud...');

        if (localData.users.length > 0) await User.insertMany(localData.users);
        if (localData.institutions.length > 0) await Institution.insertMany(localData.institutions);
        if (localData.halls.length > 0) await Hall.insertMany(localData.halls);
        if (localData.trainings.length > 0) await Training.insertMany(localData.trainings);
        if (localData.nominations.length > 0) await Nomination.insertMany(localData.nominations);
        if (localData.attendances.length > 0) await Attendance.insertMany(localData.attendances);
        if (localData.notifications.length > 0) await Notification.insertMany(localData.notifications);
        if (localData.hallBlocks && localData.hallBlocks.length > 0) await HallBlock.insertMany(localData.hallBlocks);
        if (localData.hallRequests && localData.hallRequests.length > 0) await HallBookingRequest.insertMany(localData.hallRequests);

        console.log('\n✅ MIGRATION COMPLETE! Your local data is now on the Cloud.');

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error writing to Cloud DB:', err);
        process.exit(1);
    }
}

migrate();
