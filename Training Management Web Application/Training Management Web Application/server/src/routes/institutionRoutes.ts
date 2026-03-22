import { Router } from 'express';
import { getInstitutions, createInstitution, deleteInstitution } from '../controllers/institutionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getInstitutions);
router.post('/', authenticateToken, createInstitution);
router.delete('/:id', authenticateToken, deleteInstitution);

export default router;
