
const mongoose = require('mongoose');

async function checkUsers() {
    const mongoURI = 'mongodb://127.0.0.1:27017/training_db';
    console.log(`Connecting to ${mongoURI}...`);

    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            role: String,
            name: String,
            isApproved: Boolean
        }), 'users');

        const users = await User.find({}, { email: 1, role: 1, name: 1, isApproved: 1 });
        console.log('Existing Users:');
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
