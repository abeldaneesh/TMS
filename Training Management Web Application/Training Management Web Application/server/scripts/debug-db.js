const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        console.log('Collections:', (await db.listCollections().toArray()).map(c => c.name));

        const users = await db.collection('users').find({}).limit(10).toArray();
        console.log('Users:', users.map(u => ({ id: u._id, email: u.email })));

        const trainings = await db.collection('trainings').find({}).limit(10).toArray();
        console.log('Trainings:', trainings.map(t => ({ id: t._id, title: t.title })));

        const halls = await db.collection('halls').find({}).limit(10).toArray();
        console.log('Halls:', halls.map(h => ({ id: h._id, name: h.name })));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
