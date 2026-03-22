const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://abeldaneesh_db_user:TheDarkAvenger%40@abelswolf.ipogkci.mongodb.net/test?retryWrites=true&w=majority&appName=abelswolf';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const hall = await db.collection('halls').findOne({ name: 'Alpha wing' });
        if (!hall) {
            console.log('Alpha wing not found');
            process.exit(0);
        }
        
        const date = new Date('2026-03-02');
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23,59,59,999);

        const blocks = await db.collection('hallblocks').find({ 
            hallId: hall._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).toArray();

        const trainings = await db.collection('trainings').find({
            hallId: hall._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).toArray();

        console.log('Result for 2026-03-02:');
        console.log('Blocks:', JSON.stringify(blocks, null, 2));
        console.log('Trainings:', JSON.stringify(trainings, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
