import { Router } from 'express';
import { getPendingUsers, approveUser, rejectUser, getUsers, updateProfile, changePassword, deleteUser } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getUsers);
router.get('/pending', getPendingUsers);
router.post('/:userId/approve', approveUser);
router.post('/:userId/reject', rejectUser);
router.put('/:userId/profile', authenticateToken, updateProfile);
router.put('/:userId/change-password', authenticateToken, changePassword);
router.delete('/:userId', authenticateToken, deleteUser);

export default router;
