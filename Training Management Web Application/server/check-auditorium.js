const mongoose = require('mongoose');
const MONGO_URI = "mongodb+srv://abeldaneesh_db_user:TheDarkAvenger%40@abelswolf.ipogkci.mongodb.net/training_db?retryWrites=true&w=majority";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const aud = await db.collection('halls').findOne({ name: 'Auditorium' });
        if (!aud) {
            console.log('Auditorium not found');
            process.exit(0);
        }
        console.log('Auditorium ID:', aud._id);

        const trainings = await db.collection('trainings').find({
            hallId: aud._id,
            status: { $ne: 'cancelled' }
        }).toArray();

        console.log('Total trainings found:', trainings.length);
        trainings.forEach(t => {
            console.log(`- ${t.title} | ${t.status} | Date: ${t.date.toISOString()} | ${t.startTime}-${t.endTime}`);
        });

        const blocks = await db.collection('hallblocks').find({
            hallId: aud._id
        }).toArray();
        console.log('Total blocks found:', blocks.length);
        blocks.forEach(b => {
            console.log(`- ${b.reason} | Date: ${b.date.toISOString()} | ${b.startTime}-${b.endTime}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
