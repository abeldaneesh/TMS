import { Router, Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

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
        const extname = filetypes.test(file.originalname.toLowerCase()); // Simplified ext check

        if (mimetype || extname) {
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

        console.log('[UploadRoute] Uploading profile picture to Cloudinary...');

        // Convert buffer to stream for Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'dmo_profiles',
                    resource_type: 'image',
                    public_id: `profile-${req.user?.userId || 'unknown'}-${Date.now()}`
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary Upload Error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        const result = uploadResponse as any;

        res.status(200).json({
            message: 'File uploaded successfully to Cloudinary',
            url: result.secure_url,
            path: result.secure_url
        });

    } catch (error: any) {
        console.error('Upload route error:', error);
        res.status(500).json({ message: error.message || 'Server error during upload' });
    }
});

export default router;
