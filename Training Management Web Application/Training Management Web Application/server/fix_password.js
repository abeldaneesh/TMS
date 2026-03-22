
import mongoose from 'mongoose';

async function fix() {
    const mongoURI = 'mongodb://127.0.0.1:27017/training_db';
    try {
        await mongoose.connect(mongoURI);
        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            password: { type: String, required: true }
        }), 'users');

        const hash = '$2b$10$Ywol/E6fUOdnbH.psmxWTUeXrnL/n.CYzkq4O0D/0m';
        const result = await User.updateOne({ email: 'rajesh@dmo.gov' }, { $set: { password: hash } });

        console.log('Update result:', JSON.stringify(result));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
