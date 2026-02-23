import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

// Initialize Firebase (copied from config/firebase.ts logic)
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase environment variables (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)');
    process.exit(1);
}

// Try to detect the correct bucket name
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
const altBucketName = `${projectId}.firebasestorage.app`;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim(),
        }),
        storageBucket: bucketName
    });
}

let bucket = admin.storage().bucket();
// We will check if it works later or try the alternative

async function migrateImages() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected.');

        const users = await User.find({ profilePicture: { $exists: true, $ne: '' } });
        console.log(`Found ${users.length} users with profile pictures.`);

        for (const user of users) {
            const pic = user.profilePicture!;

            const isLocal = !pic.startsWith('http') || pic.includes('localhost') || pic.includes('127.0.0.1');

            if (isLocal) {
                console.log(`Migrating image for user ${user.email}: ${pic}`);

                // Construct local file path
                const baseFilename = path.basename(pic);
                const localPath = path.join(__dirname, '../../uploads/profiles', baseFilename);

                if (fs.existsSync(localPath)) {
                    const filename = `profiles/migrated-${Date.now()}-${path.basename(localPath)}`;
                    const file = bucket.file(filename);

                    console.log(`Uploading ${localPath} to Firebase...`);
                    try {
                        await bucket.upload(localPath, {
                            destination: filename,
                            metadata: {
                                contentType: 'image/jpeg',
                            }
                        });
                    } catch (uploadError: any) {
                        if (uploadError.status === 404) {
                            console.log(`Bucket ${bucket.name} not found, trying ${altBucketName}...`);
                            bucket = admin.storage().bucket(altBucketName);
                            await bucket.upload(localPath, {
                                destination: filename,
                                metadata: {
                                    contentType: 'image/jpeg',
                                }
                            });
                        } else {
                            throw uploadError;
                        }
                    }

                    await file.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

                    user.profilePicture = publicUrl;
                    await user.save();
                    console.log(`SUCCESS: Migrated to ${publicUrl}`);
                } else {
                    console.warn(`File not found locally: ${localPath}`);
                }
            } else {
                console.log(`Skipping already cloud image: ${pic}`);
            }
        }

        console.log('Migration completed.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateImages();
