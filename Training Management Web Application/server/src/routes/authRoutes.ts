import { Router } from 'express';
import { login, register, getMe, verifyEmail, updateDeviceToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/device-token', authenticateToken, updateDeviceToken);

export default router;
