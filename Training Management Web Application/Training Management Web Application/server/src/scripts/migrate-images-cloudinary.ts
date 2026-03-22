import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrateToCloudinary() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected.');

        const users = await User.find({ profilePicture: { $exists: true, $ne: '' } });
        console.log(`Found ${users.length} users with profile pictures.`);

        for (const user of users) {
            const pic = user.profilePicture!;

            // Catch local paths and localhost URLs
            const isLocal = !pic.startsWith('http') || pic.includes('localhost') || pic.includes('127.0.0.1');

            if (isLocal) {
                console.log(`Migrating image for user ${user.email}: ${pic}`);

                // Construct local file path
                const baseFilename = path.basename(pic);
                const localPath = path.join(__dirname, '../../uploads/profiles', baseFilename);

                if (fs.existsSync(localPath)) {
                    console.log(`Uploading ${localPath} to Cloudinary...`);

                    const result = await cloudinary.uploader.upload(localPath, {
                        folder: 'dmo_profiles_migrated',
                        public_id: `migrated-${user._id}-${Date.now()}`
                    });

                    user.profilePicture = result.secure_url;
                    await user.save();
                    console.log(`SUCCESS: Migrated to ${result.secure_url}`);
                } else {
                    console.warn(`File not found locally: ${localPath}`);
                }
            } else {
                console.log(`Skipping already cloud image: ${pic}`);
            }
        }

        console.log('Cloudinary Migration completed.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateToCloudinary();
