import { Response } from 'express';
import Training from '../models/Training';
import User from '../models/User';
import Nomination from '../models/Nomination';
import Attendance from '../models/Attendance';
import Institution from '../models/Institution';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        // Filter logic based on role (placeholder for now as per original code logic)
        let trainingFilter: any = {};
        if (userRole === 'program_officer') {
            trainingFilter = { createdById: userId };
        } else if (userRole === 'institutional_admin') {
            const user = await User.findById(userId);
            if (user?.institutionId) {
                // Logic for institutional admin view
            }
        }

        const totalTrainings = await Training.countDocuments(trainingFilter);
        const upcomingTrainings = await Training.countDocuments({
            ...trainingFilter,
            date: { $gt: new Date() },
            status: { $ne: 'cancelled' }
        });
        const completedTrainings = await Training.countDocuments({
            ...trainingFilter,
            status: 'completed'
        });

        const totalParticipants = await User.countDocuments({ role: 'participant' });

        // For PO, only count nominations for their trainings
        const nominationFilter: any = {};
        if (userRole === 'program_officer') {
            const poTrainingIds = await Training.find({ createdById: userId }).distinct('_id');
            nominationFilter.trainingId = { $in: poTrainingIds };
        }

        // Attendance rate calculation (simplified)
        // Pool consists of anyone who was approved OR has already attended
        const totalNominations = await Nomination.countDocuments({
            ...nominationFilter,
            status: { $in: ['approved', 'attended'] }
        });

        // Attendance count filtered by same trainings
        const totalAttendance = await Attendance.countDocuments(nominationFilter);
        const attendanceRate = totalNominations > 0 ? (totalAttendance / totalNominations) * 100 : 0;

        // Trained staff (unique participants in attendance for these trainings)
        const trainedStaff = await Attendance.distinct('participantId', nominationFilter);
        const trainedStaffCount = trainedStaff.length;

        res.json({
            totalTrainings,
            upcomingTrainings,
            completedTrainings,
            totalParticipants,
            attendanceRate: Math.round(attendanceRate),
            trainedStaff: trainedStaffCount,
            untrainedStaff: totalParticipants - trainedStaffCount,
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

export const getTrainingAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const trainingId = req.params.trainingId as string;

        const training = await Training.findById(trainingId);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Authorization check: If Program Officer, check ownership
        if (req.user?.role === 'program_officer' && training.createdById.toString() !== req.user.userId) {
            res.status(403).json({ message: 'Not authorized to view analytics for this training' });
            return;
        }

        const totalNominated = await Nomination.countDocuments({ trainingId });

        const totalApproved = await Nomination.countDocuments({
            trainingId, status: { $in: ['approved', 'attended'] }
        });

        const totalAttended = await Attendance.countDocuments({ trainingId });

        const attendanceRate = totalApproved > 0 ? (totalAttended / totalApproved) * 100 : 0;

        // Group by institution - fetch nominations and populate institution
        const nominations = await Nomination.find({ trainingId })
            .populate('institutionId');

        const institutionStats: any = {};

        // Initialize with basic counts
        nominations.forEach((nom: any) => {
            // Check if institutionId is populated (it might be null or string if not populated correctly, but we populated it)
            // In Mongoose populate, if no doc found, it returns null.
            const institution = nom.institutionId;
            if (!institution) return;

            const instId = institution._id.toString();
            if (!institutionStats[instId]) {
                institutionStats[instId] = {
                    institutionId: instId,
                    institutionName: institution.name,
                    nominated: 0,
                    approved: 0,
                    attended: 0
                };
            }
            institutionStats[instId].nominated++;
            if (nom.status === 'approved') institutionStats[instId].approved++;
        });

        // Add attendance counts
        const attendance = await Attendance.find({ trainingId })
            .populate({
                path: 'participantId',
                select: 'institutionId'
            });

        for (const att of attendance) {
            const participant: any = att.participantId;
            // The participant might have been deleted or not found
            if (participant && participant.institutionId) {
                const instId = participant.institutionId.toString();
                if (institutionStats[instId]) {
                    institutionStats[instId].attended++;
                }
            }
        }

        res.json({
            trainingId,
            trainingTitle: training.title,
            totalNominated,
            totalApproved,
            totalAttended,
            attendanceRate: Math.round(attendanceRate),
            byInstitution: Object.values(institutionStats)
        });

    } catch (error) {
        console.error('Training analytics error:', error);
        res.status(500).json({ message: 'Error fetching training analytics' });
    }
};

export const getInstitutionReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const institutionId = req.params.institutionId as string;

        const institution = await Institution.findById(institutionId);

        if (!institution) {
            res.status(404).json({ message: 'Institution not found' });
            return;
        }

        const totalStaff = await User.countDocuments({ institutionId });

        // Trained staff: Users from this institution who have at least one attendance record
        // We need to find all attendance records where the participant belongs to this institution.
        // Mongoose doesn't support deep query in `find` for referencing collections without aggregation lookup or two queries.
        // Approach: Find all users of this institution, then find if they are in attendance.

        const staffMembers = await User.find({ institutionId }).select('_id');
        const staffIds = staffMembers.map(u => u._id);

        const trainedStaffIds = await Attendance.distinct('participantId', {
            participantId: { $in: staffIds }
        });

        const trainedStaffCount = trainedStaffIds.length;

        const trainingsByProgramMap = new Map<string, { program: string, trainings: Set<string>, participants: Set<string> }>();

        // Find nominations for this institution
        const nominations = await Nomination.find({
            institutionId,
            status: { $in: ['approved', 'attended'] }
        }).populate('trainingId');

        nominations.forEach((nom: any) => {
            const training = nom.trainingId;
            if (!training) return;

            if (!trainingsByProgramMap.has(training.program)) {
                trainingsByProgramMap.set(training.program, {
                    program: training.program,
                    trainings: new Set(),
                    participants: new Set()
                });
            }

            const entry = trainingsByProgramMap.get(training.program)!;
            entry.trainings.add(training._id.toString());
            entry.participants.add(nom.participantId.toString());
        });

        const trainingsByProgram = Array.from(trainingsByProgramMap.values()).map(entry => ({
            program: entry.program,
            trainings: entry.trainings.size,
            participants: entry.participants.size
        }));

        res.json({
            institutionId,
            institutionName: institution.name,
            totalStaff,
            trainedStaff: trainedStaffCount,
            untrainedStaff: totalStaff - trainedStaffCount,
            trainingsByProgram
        });

    } catch (error) {
        console.error('Institution report error:', error);
        res.status(500).json({ message: 'Error fetching institution report' });
    }
};
