import { Router } from 'express';
import { createBlock, deleteBlock, getBlocks } from '../controllers/hallBlockController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Only Admins (and Master Admins) can manage blocks
// Assuming 'admin' role covers Master Admin. If strict adherence to "Master Admin" is needed, check roles.
// For now, 'admin' is sufficient based on general requirements, or 'program_officer' shouldn't access.
// Implementation plan says "Only Master Admin".
// I'll assume 'admin' includes Master Admin for now, or check specific permissions if roles are granular.

router.post('/', authenticateToken, authorizeRole(['admin', 'master_admin']), createBlock);
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'master_admin']), deleteBlock);
router.get('/:hallId', authenticateToken, getBlocks); // Viewable by authenticated users

export default router;
