import { Router } from 'express';
import { getDashboardStats, getTrainingAnalytics, getInstitutionReport } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardStats);
router.get('/training/:trainingId', authenticateToken, getTrainingAnalytics);
router.get('/institution/:institutionId', authenticateToken, getInstitutionReport);

export default router;
