
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import Institution from './src/models/Institution';
import Hall from './src/models/Hall';
import Training from './src/models/Training';
import Nomination from './src/models/Nomination';
import Attendance from './src/models/Attendance';
import Notification from './src/models/Notification';

dotenv.config();

async function verify() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/training_db';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const userCount = await User.countDocuments();
        const instCount = await Institution.countDocuments();
        const hallCount = await Hall.countDocuments();
        const trainingCount = await Training.countDocuments();
        const nominationCount = await Nomination.countDocuments();
        const attendanceCount = await Attendance.countDocuments();
        const notificationCount = await Notification.countDocuments();

        console.log('Verification Results:');
        console.log(`- Users: ${userCount} (Expected: 10)`);
        console.log(`- Institutions: ${instCount} (Expected: 5)`);
        console.log(`- Halls: ${hallCount} (Expected: 5)`);
        console.log(`- Trainings: ${trainingCount} (Expected: 6)`);
        console.log(`- Nominations: ${nominationCount} (Expected: 10)`);
        console.log(`- Attendance: ${attendanceCount} (Expected: 2)`);
        console.log(`- Notifications: ${notificationCount} (Expected: 2)`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error verifying database:', err);
        process.exit(1);
    }
}

verify();
