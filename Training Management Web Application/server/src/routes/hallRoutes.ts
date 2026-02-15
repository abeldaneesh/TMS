import { Router } from 'express';
import {
    getHalls,
    getAvailableHalls,
    addAvailability,
    removeAvailability,
    getAvailability,
    getHallAvailabilityDetails,
    createHall,
    deleteHall
} from '../controllers/hallController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createHall);
router.get('/', authenticateToken, getHalls);
router.delete('/:hallId', authenticateToken, deleteHall);
router.get('/available', authenticateToken, getAvailableHalls);
router.get('/:hallId/details', authenticateToken, getHallAvailabilityDetails);
router.get('/:hallId/availability', authenticateToken, getAvailability);
router.post('/:hallId/availability', authenticateToken, addAvailability);
router.delete('/availability/:availabilityId', authenticateToken, removeAvailability);

export default router;
