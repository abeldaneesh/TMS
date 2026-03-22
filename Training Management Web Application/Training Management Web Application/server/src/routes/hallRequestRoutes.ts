import { Router } from 'express';
import { createRequest, getRequests, updateRequestStatus } from '../controllers/hallRequestController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createRequest);
router.get('/', authenticateToken, authorizeRole(['master_admin']), getRequests); // Only admin sees all requests? Or user sees their own?
// Let's allow admin to see all.
router.patch('/:id/status', authenticateToken, authorizeRole(['master_admin']), updateRequestStatus);

export default router;
