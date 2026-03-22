import { Router } from 'express';
import {
    getHalls,
    getAvailableHalls,
    addAvailability,
    removeAvailability,
    getAvailability,
    getHallAvailabilityDetails,
    createHall,
    updateHall,
    deleteHall
} from '../controllers/hallController';
import {
    createBlock,
    deleteBlock,
    getBlocks
} from '../controllers/hallBlockController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, authorizeRole(['admin', 'master_admin']), createHall);
router.put('/:hallId', authenticateToken, authorizeRole(['admin', 'master_admin']), updateHall);
router.get('/', authenticateToken, getHalls);
router.delete('/:hallId', authenticateToken, authorizeRole(['admin', 'master_admin']), deleteHall);
router.get('/available', authenticateToken, getAvailableHalls);
router.get('/blocks', authenticateToken, getBlocks);
router.get('/:hallId/blocks', authenticateToken, getBlocks);
router.get('/:hallId/details', authenticateToken, getHallAvailabilityDetails);
router.get('/:hallId/availability', authenticateToken, getAvailability);
router.post('/:hallId/availability', authenticateToken, addAvailability);
router.delete('/availability/:availabilityId', authenticateToken, removeAvailability);

export default router;
