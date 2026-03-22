const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables from .env file
dotenv.config();

// Mongoose connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';

const UserSchema = new mongoose.Schema({
    _id: String,
    email: String,
    name: String,
    role: String,
    profilePicture: String,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

const animeAvatars = [
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Felix',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Milo',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Coco',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Lilly',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Simon',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Mia',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Oscar',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Bella',
    'https://api.dicebear.com/7.x/big-smile/svg?seed=Abby',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Anita',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/croodles/svg?seed=Sam',
    'https://api.dicebear.com/7.x/croodles/svg?seed=Ruby',
    'https://api.dicebear.com/7.x/croodles/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/croodles/svg?seed=Chloe',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Felix',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=John',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jane'
];

async function updateAvatars() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const users = await User.find({});
        console.log(`Found ${users.length} users to update.`);

        let updatedCount = 0;

        for (const user of users) {
            // Pick a random avatar from the list
            const randomAvatar = animeAvatars[Math.floor(Math.random() * animeAvatars.length)];

            // Set it as their new profile picture
            user.profilePicture = randomAvatar;
            await user.save();
            updatedCount++;
            console.log(`Updated user ${user.email} with a new avatar.`);
        }

        console.log(`\nSuccessfully updated ${updatedCount} users.`);

    } catch (error) {
        console.error('Error updating users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

// Run the function
updateAvatars();
