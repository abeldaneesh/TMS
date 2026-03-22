import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './src/models/Notification';
import Training from './src/models/Training';

dotenv.config();

async function checkNotifications() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(10);
    for (const n of notifs) {
        console.log(`Notification: ${n.title} | relatedId: ${n.relatedId}`);
        if (n.relatedId) {
            const t = await Training.findById(n.relatedId);
            if (!t) {
                console.log(`  -> Training ${n.relatedId} NOT FOUND!`);
            } else {
                console.log(`  -> Training ${t.title} exists.`);
            }
        }
    }
    await mongoose.disconnect();
}

checkNotifications();
