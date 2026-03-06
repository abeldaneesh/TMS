import { Router } from 'express';
import { getPendingUsers, approveUser, rejectUser, getUsers, getUserById, updateProfile, changePassword, deleteUser } from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getUsers);
router.get('/pending', authenticateToken, authorizeRole(['master_admin', 'medical_officer']), getPendingUsers);
router.get('/:userId', authenticateToken, getUserById);
router.post('/:userId/approve', authenticateToken, authorizeRole(['master_admin', 'medical_officer']), approveUser);
router.post('/:userId/reject', authenticateToken, authorizeRole(['master_admin', 'medical_officer']), rejectUser);
router.put('/:userId/profile', authenticateToken, updateProfile);
router.put('/:userId/change-password', authenticateToken, changePassword);
router.delete('/:userId', authenticateToken, deleteUser);

export default router;
