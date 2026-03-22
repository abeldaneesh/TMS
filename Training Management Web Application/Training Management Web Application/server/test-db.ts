import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const Notification = mongoose.model('Notification', new mongoose.Schema({
        title: String,
        relatedId: String
    }, { strict: false }));

    const Training = mongoose.model('Training', new mongoose.Schema({
        title: String
    }, { strict: false }));

    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(10);
    for (const n of notifs) {
        console.log(`Title: ${n.title} | relatedId: ${n.relatedId}`);
        if (n.relatedId) {
            try {
                const t = await Training.findById(n.relatedId);
                console.log(`  Training exists: ${!!t}`);
            } catch (e) {
                console.log(`  Invalid ID format for Training`);
            }
        }
    }
    await mongoose.disconnect();
}
check();
