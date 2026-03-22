import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    getMyFeedbackSubmissions,
    getTrainingFeedback,
    submitTrainingFeedback
} from '../controllers/feedbackController';

const router = Router();

router.get('/my', authenticateToken, getMyFeedbackSubmissions);
router.get('/training/:trainingId', authenticateToken, getTrainingFeedback);
router.post('/training/:trainingId', authenticateToken, submitTrainingFeedback);

export default router;
