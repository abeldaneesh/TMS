import { Router } from 'express';
import { getInstitutions, deleteInstitution } from '../controllers/institutionController';

const router = Router();

router.get('/', getInstitutions);
router.delete('/:id', deleteInstitution);

export default router;
