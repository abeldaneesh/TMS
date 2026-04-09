import express from 'express';
import {
    register,
    login,
    getMe,
    updateDeviceToken,
    logout,
    sendEmailOtp,
    verifyEmailOtp,
    debugFcm,
    testEmail,
    refreshSession,
    markSessionClosing,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendEmailOtp);
router.post('/verify-otp', verifyEmailOtp);
router.post('/session/closing', markSessionClosing);
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);
router.post('/session/heartbeat', authenticateToken, refreshSession);
router.post('/device-token', authenticateToken, updateDeviceToken);

// Diagnostic routes
router.get('/test-email', testEmail);
router.get('/debug-fcm/:email', debugFcm);

export default router;
