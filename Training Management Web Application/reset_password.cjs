
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const mongoURI = 'mongodb://127.0.0.1:27017/training_db';
    try {
        await mongoose.connect(mongoURI);
        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            password: { type: String, required: true }
        }), 'users');

        const hashedPassword = await bcrypt.hash('password123', 10);
        const result = await User.updateOne({ email: 'rajesh@dmo.gov.in' }, { $set: { password: hashedPassword } });

        if (result.matchedCount > 0) {
            console.log('Password updated successfully for rajesh@dmo.gov.in');
        } else {
            console.log('User rajesh@dmo.gov.in not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetPassword();
