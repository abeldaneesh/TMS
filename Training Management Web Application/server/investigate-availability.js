const mongoose = require('mongoose');
const MONGO_URI = "mongodb+srv://abeldaneesh_db_user:TheDarkAvenger%40@abelswolf.ipogkci.mongodb.net/training_db?retryWrites=true&w=majority";

async function investigate() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        // 1. Get Hall
        const hall = await db.collection('halls').findOne({ name: 'Auditorium' });
        console.log('Auditorium Availability:', JSON.stringify(hall.availability, null, 2));

        // 2. Check for Hall Blocks for "Now" and "Future"
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const blocks = await db.collection('hallblocks').find({
            hallId: hall._id,
        }).toArray();
        console.log('Blocks count:', blocks.length);
        blocks.forEach(b => console.log(`Block: ${b.date.toISOString()} | ${b.startTime}-${b.endTime} | Reason: ${b.reason}`));

        // 3. Check for ANY training that covers a wide range
        const overlappingTrainings = await db.collection('trainings').find({
            hallId: hall._id,
            status: { $in: ['scheduled', 'ongoing', 'completed'] }
        }).toArray();
        console.log('Trainings count:', overlappingTrainings.length);
        overlappingTrainings.forEach(t => {
            console.log(`Training: ${t.title} | Date: ${t.date.toISOString()} | ${t.startTime}-${t.endTime} | Status: ${t.status}`);
        });

        // 4. Test the exact logic for March 5th, 2026
        const testDate = '2026-03-05';
        const testStart = '10:00';
        const testEnd = '12:00';

        const checkDate = new Date(testDate);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`\nTesting range for ${testDate}: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

        const conflictingTrainings = await db.collection('trainings').find({
            hallId: hall._id,
            date: { $gte: startOfDay, $lte: endOfDay },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: testEnd } },
                        { endTime: { $gt: testStart } },
                    ],
                }
            ],
            status: { $in: ['scheduled', 'ongoing', 'completed'] }
        }).toArray();

        console.log('Conflicting Trainings found in test:', conflictingTrainings.length);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

investigate();
