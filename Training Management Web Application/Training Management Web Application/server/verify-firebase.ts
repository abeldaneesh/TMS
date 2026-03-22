import admin from './src/config/firebase';
import { v4 as uuidv4 } from 'uuid';

async function testUpload() {
    console.log('Testing Firebase Storage Upload (via ts-node)...');

    try {
        const bucket = admin.storage().bucket();
        const filename = `test/hello-${uuidv4()}.txt`;
        const file = bucket.file(filename);

        await file.save('Hello Firebase Storage!', {
            metadata: { contentType: 'text/plain' }
        });

        console.log('File uploaded successfully!');

        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        console.log('Public URL:', publicUrl);
        console.log('Attempting to delete test file...');
        await file.delete();
        console.log('Test file deleted.');
        console.log('Verification SUCCESS');
    } catch (error) {
        console.error('Verification FAILED:', error);
    }
}

testUpload();
