import { Response } from 'express';
import Attendance from '../models/Attendance';
import Training from '../models/Training';
import Nomination from '../models/Nomination';
import User from '../models/User';
import Notification from '../models/Notification';
import { createAndSendNotification } from '../utils/notificationUtils';
import { AuthRequest } from '../middleware/authMiddleware';

// Mark attendance
export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId, method, qrData } = req.body;
        const participantId = req.user!.userId;

        // Check if training exists
        const training = await Training.findById(trainingId);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Check if today is the training date
        const today = new Date();
        const trainingDate = new Date(training.date);

        // Reset hours to compare just the date part
        today.setHours(0, 0, 0, 0);
        trainingDate.setHours(0, 0, 0, 0);

        if (today.getTime() !== trainingDate.getTime()) {
            res.status(400).json({ message: 'Attendance can only be marked on the day of the training.' });
            return;
        }

        // Check if already marked
        const existingAttendance = await Attendance.findOne({
            trainingId,
            participantId,
        });

        if (existingAttendance) {
            res.status(400).json({ message: 'Attendance already marked' });
            return;
        }

        // Check if participant is approved for this training
        const nomination = await Nomination.findOne({
            trainingId,
            participantId,
            status: 'approved'
        });

        if (!nomination) {
            res.status(403).json({ message: 'You must be an approved participant to mark attendance.' });
            return;
        }

        // Process validation if method is 'qr'
        if (method === 'qr' && qrData) {

            try {
                // Expecting qrData to be the token string directly, or a JSON? 
                // Implementation plan said: "Generates qrCodeToken (UUID)... Embeds token"
                // Let's assume the QR code contains JSON string: { "trainingId": "...", "token": "..." } or just the token?
                // A secure way is { trainingId, token }.
                // Let's assume the frontend sends the scanned string as `qrData`.

                let tokenToCheck = qrData;
                let parsedData: any = {};

                // Try parsing if it's JSON, otherwise treat as simple string token
                try {
                    parsedData = JSON.parse(qrData);
                    if (parsedData.token) tokenToCheck = parsedData.token;
                } catch (e) {
                    // Not JSON, assume string
                }

                // Check Session Validity
                if (!training.attendanceSession || !training.attendanceSession.isActive) {
                    res.status(400).json({ message: 'Attendance session is not active' });
                    return;
                }

                if (new Date() > new Date(training.attendanceSession.endTime!)) {
                    res.status(400).json({ message: 'Attendance session has expired' });
                    return;
                }

                if (training.attendanceSession.qrCodeToken !== tokenToCheck) {
                    res.status(400).json({ message: 'Invalid QR code' });
                    return;
                }

            } catch (e) {
                console.error("QR Validation error", e);
                res.status(400).json({ message: 'Invalid QR data' });
                return;
            }
        }

        const attendance = await Attendance.create({
            trainingId,
            participantId,
            method,
            qrData,
        });

        // Also update nomination status if exists
        await Nomination.updateMany(
            {
                trainingId,
                participantId,
                status: 'approved'
            },
            {
                status: 'attended',
            }
        );

        // --- NOTIFICATION LOGIC ---
        try {
            // 1. Notify Program Officer (Training Creator)
            // Get participant details for the message
            const participant = await User.findById(participantId).select('name');
            const notificationMessage = `${participant?.name || 'A participant'} has marked attendance for "${training.title}".`;

            // Identify recipients: 
            // - The creator of the training (Program Officer)
            const recipients = new Set<string>();
            recipients.add(training.createdById);

            console.log(`[DEBUG] Attendance marked for training ${trainingId} by ${participantId}`);
            console.log(`[DEBUG] Sending notifications to ${recipients.size} recipients:`, Array.from(recipients));

            // Create notifications
            await Promise.all(Array.from(recipients).map(async (userId) => {
                try {
                    const n = await createAndSendNotification({
                        userId,
                        title: 'Attendance Marked',
                        message: notificationMessage,
                        type: 'info',
                        actionUrl: `/trainings/${trainingId}`
                    });
                    console.log(`[DEBUG] Notification created for ${userId}: ${n._id}`);
                    return n;
                } catch (e) {
                    console.error(`[DEBUG] Failed to create notification for ${userId}`, e);
                    throw e;
                }
            }));

        } catch (notifError) {
            console.error('Error creating notifications:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            ...attendance.toObject(),
            id: attendance._id
        });
    } catch (error: any) {
        console.error('Attendance error:', error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'Attendance already marked' });
        } else {
            res.status(500).json({ message: 'Error marking attendance' });
        }
    }
};

// Get attendance for a training
export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const trainingId = req.params.trainingId as string;

        const attendance = await Attendance.find({ trainingId })
            .populate('participantId', 'name email designation')
            .lean() as any[];

        // Authorization check: If Program Officer, check ownership of training
        if (req.user?.role === 'program_officer') {
            const training = await Training.findById(trainingId);
            if (!training || training.createdById.toString() !== req.user.userId) {
                res.status(403).json({ message: 'Not authorized to view attendance for this training' });
                return;
            }
        }

        const formattedAttendance = attendance.map(att => ({
            id: att._id,
            ...att,
            participantId: att.participantId?._id || att.participantId,
            participant: {
                ...att.participantId,
                id: att.participantId?._id
            }
        }));

        res.json(formattedAttendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance' });
    }
};

// Get attendance for the logged-in user
export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const participantId = req.user!.userId;

        const attendance = await Attendance.find({ participantId })
            .populate({
                path: 'trainingId',
                select: 'title date startTime endTime program hallId',
                populate: {
                    path: 'hallId',
                    select: 'name location'
                }
            })
            .sort({ createdAt: -1 })
            .lean() as any[];

        const formattedAttendance = attendance.map(att => ({
            id: att._id,
            ...att,
            training: att.trainingId ? {
                ...att.trainingId,
                id: att.trainingId._id,
                hall: att.trainingId.hallId ? {
                    ...att.trainingId.hallId,
                    id: att.trainingId.hallId._id
                } : null
            } : null
        }));

        res.json(formattedAttendance);
    } catch (error) {
        console.error('Error fetching my attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance history' });
    }
};

// Get attendance history for a specific participant (for admins)
export const getAttendanceByParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const participantId = req.params.participantId as string;

        // Authorization check: Only admins or POs can view other's attendance
        if (req.user?.role === 'participant' && req.user.userId !== participantId) {
            res.status(403).json({ message: 'Not authorized to view this participant\'s attendance' });
            return;
        }

        const attendance = await Attendance.find({ participantId })
            .populate({
                path: 'trainingId',
                select: 'title date startTime endTime program hallId',
                populate: {
                    path: 'hallId',
                    select: 'name location'
                }
            })
            .sort({ createdAt: -1 })
            .lean() as any[];

        const formattedAttendance = attendance.map(att => ({
            id: att._id,
            ...att,
            training: att.trainingId ? {
                ...att.trainingId,
                id: att.trainingId._id,
                hall: att.trainingId.hallId ? {
                    ...att.trainingId.hallId,
                    id: att.trainingId.hallId._id
                } : null
            } : null
        }));

        res.json(formattedAttendance);
    } catch (error) {
        console.error('Error fetching participant attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance history' });
    }
};


import { v4 as uuidv4 } from 'uuid';

// Start Attendance Session
export const startAttendanceSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId } = req.params;
        const { durationInMinutes } = req.body;

        if (!durationInMinutes || durationInMinutes <= 0) {
            res.status(400).json({ message: 'Valid duration is required' });
            return;
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Check ownership or admin role (PO can start for their own training)
        if (req.user?.role !== 'master_admin' && req.user?.userId !== training.createdById && req.user?.userId !== training.trainerId) {
            res.status(403).json({ message: 'Not authorized to start session for this training' });
            return;
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60000);
        const qrCodeToken = uuidv4();

        training.attendanceSession = {
            isActive: true,
            startTime,
            endTime,
            startedBy: req.user!.userId,
            qrCodeToken
        };

        await training.save();

        // --- NOTIFICATION LOGIC ---
        try {
            // Find all approved participants for this training
            const approvedNominations = await Nomination.find({
                trainingId,
                status: 'approved'
            }).select('participantId');

            const participantIds = approvedNominations.map(n => n.participantId);

            if (participantIds.length > 0) {
                const message = `An attendance session has started for "${training.title}". Please scan the QR code to mark your attendance.`;

                await Promise.all(participantIds.map(userId =>
                    createAndSendNotification({
                        userId: userId.toString(),
                        title: 'Attendance Session Started',
                        message: message,
                        type: 'info',
                        actionUrl: `/scan-qr`
                    })
                ));
                console.log(`[DEBUG] Sent notifications to ${participantIds.length} participants for training ${trainingId}`);
            }
        } catch (notifError) {
            console.error('Error sending session start notifications:', notifError);
            // Don't fail the request
        }

        res.json({
            message: 'Attendance session started',
            session: training.attendanceSession
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ message: 'Error starting attendance session' });
    }
};

// Stop Attendance Session
export const stopAttendanceSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId } = req.params;

        const training = await Training.findById(trainingId);
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Check ownership
        if (req.user?.role !== 'master_admin' && req.user?.userId !== training.createdById && req.user?.userId !== training.trainerId) {
            res.status(403).json({ message: 'Not authorized to stop session' });
            return;
        }

        if (training.attendanceSession) {
            training.attendanceSession.isActive = false;
            await training.save();
        }

        res.json({ message: 'Attendance session stopped' });
    } catch (error) {
        console.error('Stop session error:', error);
        res.status(500).json({ message: 'Error stopping attendance session' });
    }
};

// Get Session Status
export const getSessionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId } = req.params;

        const training = await Training.findById(trainingId).select('attendanceSession');
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // If session is expired but still marked active, logic elsewhere might assume active. 
        // Frontend can check time, but backend remains truth.
        // We return the whole object, let frontend handle countdown.

        // Security: Don't return qrCodeToken to participants unless necessary? 
        // Plan says: "Active session view: Countdown timer. QR Code display" -> Only for PO.
        // Participants just scan.
        // But this endpoint might be used by PO to restore view.

        if (req.user?.role === 'participant') {
            // Participants shouldn't see token remotely, they see it on screen.
            // This prevents proxy attendance via shared digital sessions.
            res.json({
                isActive: training.attendanceSession?.isActive,
                startTime: training.attendanceSession?.startTime,
                endTime: training.attendanceSession?.endTime,
                // No token
            });
        } else {
            res.json(training.attendanceSession);
        }

    } catch (error) {
        console.error('Get session status error:', error);
        res.status(500).json({ message: 'Error fetching session status' });
    }
};

