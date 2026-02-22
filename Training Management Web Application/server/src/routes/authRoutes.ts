import { Router } from 'express';
import { login, register, getMe, sendEmailOtp, verifyEmailOtp, updateDeviceToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/send-otp', sendEmailOtp);
router.post('/verify-otp', verifyEmailOtp);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/device-token', authenticateToken, updateDeviceToken);

export default router;
