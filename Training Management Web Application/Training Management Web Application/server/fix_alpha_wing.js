const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://abeldaneesh_db_user:TheDarkAvenger%40@abelswolf.ipogkci.mongodb.net/test?retryWrites=true&w=majority&appName=abelswolf';

async function fix() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const res = await db.collection('halls').updateOne(
            { name: 'Alpha wing' },
            { $set: { availability: [] } }
        );
        console.log('Update result:', res);
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fix();
