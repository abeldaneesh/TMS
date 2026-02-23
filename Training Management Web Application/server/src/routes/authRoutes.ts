import express from 'express';
import { register, login, getMe, updateDeviceToken, sendEmailOtp, verifyEmailOtp, debugFcm } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendEmailOtp);
router.post('/verify-otp', verifyEmailOtp);
router.get('/me', authenticateToken, getMe);
router.post('/device-token', authenticateToken, updateDeviceToken);

// Temporary debug route to test FCM delivery
router.get('/debug-fcm/:email', debugFcm);

export default router;
