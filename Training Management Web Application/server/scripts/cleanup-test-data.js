const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
}

// Define Schemas with _id as String for UUID support
const userSchema = new mongoose.Schema({ _id: String, email: String }, { _id: false });
const trainingSchema = new mongoose.Schema({ _id: String, title: String }, { _id: false });
const hallSchema = new mongoose.Schema({ _id: String, name: String }, { _id: false });
const institutionSchema = new mongoose.Schema({ _id: String, name: String }, { _id: false });

const User = mongoose.model('User', userSchema, 'users');
const Hall = mongoose.model('Hall', hallSchema, 'halls');
const Institution = mongoose.model('Institution', institutionSchema, 'institutions');
const Training = mongoose.model('Training', trainingSchema, 'trainings');
const Nomination = mongoose.model('Nomination', new mongoose.Schema({ trainingId: String, participantId: String }), 'nominations');
const Attendance = mongoose.model('Attendance', new mongoose.Schema({ trainingId: String, participantId: String }), 'attendances');
const Notification = mongoose.model('Notification', new mongoose.Schema({ message: String, userId: String }), 'notifications');

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');

        const testEmailRegex = /test|qr_|@example\.com/i;
        const testNameRegex = /Test|QR Hall|Cleanup|Training [A-Z]/i;

        // 1. Identify IDs of things to delete (for cascading)
        const usersToDelete = await User.find({ email: { $regex: testEmailRegex } });
        const userIds = usersToDelete.map(u => u._id);

        const trainingsToDelete = await Training.find({ title: { $regex: testNameRegex } });
        const trainingIds = trainingsToDelete.map(t => t._id);

        console.log(`Identified ${userIds.length} users and ${trainingIds.length} trainings for cleanup.`);

        // 2. Cascading Delete
        if (userIds.length > 0 || trainingIds.length > 0) {
            const nomRes = await Nomination.deleteMany({
                $or: [
                    { participantId: { $in: userIds } },
                    { trainingId: { $in: trainingIds } }
                ]
            });
            console.log(`Deleted ${nomRes.deletedCount} nominations.`);

            const attRes = await Attendance.deleteMany({
                $or: [
                    { participantId: { $in: userIds } },
                    { trainingId: { $in: trainingIds } }
                ]
            });
            console.log(`Deleted ${attRes.deletedCount} attendance records.`);

            const notifRes = await Notification.deleteMany({
                $or: [
                    { userId: { $in: userIds } },
                    { message: { $regex: /test/i } }
                ]
            });
            console.log(`Deleted ${notifRes.deletedCount} notifications.`);
        }

        // 3. Delete Main Entities using same regex to be safe
        const userRes = await User.deleteMany({ email: { $regex: testEmailRegex } });
        const trainingRes = await Training.deleteMany({ title: { $regex: testNameRegex } });
        const hallRes = await Hall.deleteMany({ name: { $regex: testNameRegex } });
        const instRes = await Institution.deleteMany({ name: { $regex: testNameRegex } });

        console.log(`Final cleanup results:`);
        console.log(`- Users deleted: ${userRes.deletedCount}`);
        console.log(`- Trainings deleted: ${trainingRes.deletedCount}`);
        console.log(`- Halls deleted: ${hallRes.deletedCount}`);
        console.log(`- Institutions deleted: ${instRes.deletedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

run();
