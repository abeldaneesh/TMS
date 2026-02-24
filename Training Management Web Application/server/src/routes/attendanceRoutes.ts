import { Router } from 'express';
import { markAttendance, getAttendance, getMyAttendance, getAttendanceByParticipant } from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, markAttendance);
router.get('/my', authenticateToken, getMyAttendance);
router.get('/user/:participantId', authenticateToken, getAttendanceByParticipant);
router.get('/:trainingId', authenticateToken, getAttendance);

// Session Management Routes
import { startAttendanceSession, stopAttendanceSession, getSessionStatus } from '../controllers/attendanceController';
router.post('/:trainingId/session/start', authenticateToken, startAttendanceSession);
router.post('/:trainingId/session/stop', authenticateToken, stopAttendanceSession);
router.get('/:trainingId/session', authenticateToken, getSessionStatus);



export default router;
