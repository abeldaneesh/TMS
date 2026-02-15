import { Router } from 'express';
import {
    getTrainings,
    getTrainingById,
    createTraining,
    updateTrainingStatus,
    deleteTraining,
} from '../controllers/trainingController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getTrainings);
router.get('/:id', authenticateToken, getTrainingById);
router.post('/', authenticateToken, createTraining);
router.patch('/:id/status', authenticateToken, updateTrainingStatus);
router.delete('/:id', authenticateToken, deleteTraining);

export default router;
