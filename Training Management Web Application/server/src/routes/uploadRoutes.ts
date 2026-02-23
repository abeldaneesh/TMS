import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import admin from '../config/firebase';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
});

// @ts-ignore
router.post('/profile-picture', authenticateToken, upload.single('profilePicture'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const bucket = admin.storage().bucket();
        const filename = `profiles/${uuidv4()}-${req.file.originalname}`;
        const file = bucket.file(filename);

        // Upload buffer to Firebase Storage
        const blobStream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype
            },
            resumable: false
        });

        blobStream.on('error', (error) => {
            console.error('Firebase upload error:', error);
            res.status(500).json({ message: 'Failed to upload to cloud storage' });
        });

        blobStream.on('finish', async () => {
            // Make the file public
            await file.makePublic();

            // Get the public URL. Note: Standard Firebase URLs follow this pattern
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            res.status(200).json({
                message: 'File uploaded successfully to cloud storage',
                url: publicUrl,
                path: publicUrl
            });
        });

        blobStream.end(req.file.buffer);

    } catch (error: any) {
        console.error('Upload route error:', error);
        res.status(500).json({ message: error.message || 'Server error during upload' });
    }
});

export default router;
