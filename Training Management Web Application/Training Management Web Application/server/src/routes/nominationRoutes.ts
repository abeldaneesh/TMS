import { Router } from 'express';
import {
    getNominations,
    nominateParticipant,
    updateNominationStatus,
    getBusyParticipants,
} from '../controllers/nominationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getNominations);
router.post('/', authenticateToken, nominateParticipant);
router.get('/busy-participants', authenticateToken, getBusyParticipants);
router.patch('/:id/status', authenticateToken, updateNominationStatus);

export default router;
