import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK
try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase Admin SDK: Missing FIREBASE environment variables. Push notifications will be disabled.');
    } else if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                // Replace literal \n with actual newlines and trim any quotes/spaces
                privateKey: privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim(),
            }),
        });
        console.log('Firebase Admin SDK initialized successfully');
    }
} catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
}

export default admin;
