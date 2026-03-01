import { Response } from 'express';
import Nomination, { NominationStatus } from '../models/Nomination';
import User from '../models/User';
import Training from '../models/Training';
import { AuthRequest } from '../middleware/authMiddleware';
import { createAndSendNotification } from '../utils/notificationUtils';

// Nominate participant
export const nominateParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId, participantId, institutionId: bodyInstitutionId } = req.body;

        if (!trainingId || !participantId) {
            res.status(400).json({ message: 'Training ID and Participant ID are required' });
            return;
        }

        let institutionId = bodyInstitutionId;

        // If not provided in body or forced by role logic
        if (req.user?.role === 'institutional_admin') {
            institutionId = req.user.institutionId;
        }

        if (!institutionId) {
            // Fetch participant's institution
            const participant = await User.findById(participantId).select('institutionId name');
            institutionId = participant?.institutionId;
            const participantName = participant?.name || 'User';

            if (!institutionId) {
                res.status(400).json({ message: `${participantName} has no institution assigned` });
                return;
            }
        }

        const participant = await User.findById(participantId).select('name');
        const participantName = participant?.name || 'User';

        // Check if participant is already nominated/appointed for this training
        let existingNomination = await Nomination.findOne({
            trainingId,
            participantId
        });

        if (existingNomination) {
            if (['nominated', 'approved', 'attended'].includes(existingNomination.status)) {
                res.status(400).json({ message: `${participantName} is already appointed for this training` });
                return;
            }
        }

        // Fetch training details to check for conflicts
        const training = await Training.findById(trainingId);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Check if participant has any other training at the same time
        // Mongoose query for conflicting nomination
        // We need to look up nominations where:
        // 1. participantId matches
        // 2. status is active
        // 3. associated training has time conflict
        // Since Training details are in a separate collection, we can't easily join in one query without $lookup aggregation.
        // Option 1: Fetch all active nominations for participant, then populate training, then filter in JS.
        // Option 2: Find all trainings that conflict with this time, then find if participant has nomination for any of them.

        // Let's go with Option 2 as it's likely more efficient if there are many nominations but few concurrent trainings.
        // Find conflicting trainings first
        const conflictingTrainings = await Training.find({
            _id: { $ne: trainingId },
            date: training.date,
            $and: [
                { startTime: { $lt: training.endTime } },
                { endTime: { $gt: training.startTime } }
            ]
        }).select('_id');

        const conflictingTrainingIds = conflictingTrainings.map(t => t._id);

        if (conflictingTrainingIds.length > 0) {
            const conflictingNomination = await Nomination.findOne({
                participantId,
                status: { $in: ['nominated', 'approved', 'attended'] },
                trainingId: { $in: conflictingTrainingIds }
            });

            if (conflictingNomination) {
                res.status(400).json({ message: `${participantName} has another training schedule at this time` });
                return;
            }
        }

        let nomination;
        if (existingNomination) {
            existingNomination.status = NominationStatus.NOMINATED;
            existingNomination.institutionId = institutionId;
            existingNomination.nominatedBy = req.user!.userId;
            existingNomination.rejectionReason = undefined;
            await existingNomination.save();
            nomination = existingNomination;
        } else {
            nomination = await Nomination.create({
                trainingId,
                participantId,
                institutionId,
                nominatedBy: req.user!.userId,
            });
        }

        // Send Notification to Participant
        try {
            await createAndSendNotification({
                userId: participantId,
                title: 'New Training Assigned',
                message: `You have been nominated for a new training: "${training.title}".`,
                type: 'info',
                relatedId: trainingId,
                actionUrl: `/trainings/${trainingId}`
            });
        } catch (notifErr) {
            console.error('Failed to send nomination notification:', notifErr);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            ...nomination.toObject(),
            id: nomination._id
        });
    } catch (error: any) {
        console.error('Nomination error:', error);
        res.status(500).json({
            message: 'Error nominating participant',
            error: error instanceof Error ? error.message : String(error),
            details: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
    }
};

// Get nominations
export const getNominations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId, institutionId, participantId } = req.query;

        const where: any = {};
        if (trainingId) where.trainingId = String(trainingId);
        if (institutionId) where.institutionId = String(institutionId);
        if (participantId) where.participantId = String(participantId);

        // Filter based on role
        if (req.user?.role === 'institutional_admin') {
            // Get current user's institution
            const user = await User.findById(req.user.userId);
            if (user?.institutionId) {
                where.institutionId = user.institutionId;
            }
        } else if (req.user?.role === 'program_officer') {
            // PO can only see nominations for trainings they created
            const poTrainingIds = await Training.find({ createdById: req.user.userId }).distinct('_id');
            where.trainingId = { $in: poTrainingIds };
        }

        const nominations = await Nomination.find(where)
            .populate('participantId', 'name email designation institutionId') // Populating fields for display
            .populate('trainingId', 'title date')
            .populate('institutionId', 'name')
            .lean() as any[];

        const formattedNominations = nominations.map(nom => ({
            id: nom._id,
            ...nom,
            participantId: nom.participantId?._id || nom.participantId,
            trainingId: nom.trainingId?._id || nom.trainingId,
            institutionId: nom.institutionId?._id || nom.institutionId,
            participant: {
                ...nom.participantId,
                id: nom.participantId?._id
            },
            training: {
                ...nom.trainingId,
                id: nom.trainingId?._id
            },
            institution: {
                ...nom.institutionId,
                id: nom.institutionId?._id
            }
        }));

        res.json(formattedNominations);
    } catch (error) {
        console.error('Get nominations error:', error);
        res.status(500).json({ message: 'Error fetching nominations' });
    }
};

// Update nomination status (approve/reject)
export const updateNominationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status, rejectionReason } = req.body;

        // Only master_admin or the program_officer who created the training can approve/reject
        let isAuthorized = false;

        const nomination = await Nomination.findById(id).populate('trainingId', 'title createdById');

        if (!nomination) {
            res.status(404).json({ message: 'Nomination not found' });
            return;
        }

        if (req.user?.role === 'master_admin') {
            isAuthorized = true;
        } else if (req.user?.role === 'program_officer') {
            const trainingCreatorId = (nomination.trainingId as any)?.createdById?.toString();
            if (trainingCreatorId === req.user.userId) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            res.status(403).json({ message: 'Not authorized to modify this nomination status' });
            return;
        }

        const updateData: any = { status, rejectionReason };

        if (status === 'approved') {
            updateData.approvedBy = req.user!.userId;
            updateData.approvedAt = new Date();
        }

        const updatedNomination = await Nomination.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('trainingId', 'title');

        if (!updatedNomination) {
            res.status(404).json({ message: 'Nomination update failed' });
            return;
        }

        // Send Notification to Participant
        try {
            const trainingTitle = (updatedNomination.trainingId as any)?.title || 'Training';
            const action = status === 'approved' ? 'approved' : 'rejected';

            // The instruction provides a specific payload for 'approved' status.
            // If the status is 'approved', use the provided payload.
            // Otherwise, use the existing dynamic logic for other statuses (e.g., 'rejected').
            if (status === 'approved') {
                await createAndSendNotification({
                    userId: nomination.participantId.toString(),
                    title: 'Nomination Approved',
                    message: `Your nomination for "${(nomination.trainingId as any).title}" has been approved.`,
                    type: 'success',
                    relatedId: (nomination.trainingId as any)._id.toString(),
                    actionUrl: `/my-attendance`
                });
            } else {
                // Existing logic for other statuses like 'rejected'
                await createAndSendNotification({
                    userId: updatedNomination.participantId.toString(),
                    title: `Nomination ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    message: `Your nomination for "${trainingTitle}" has been ${action}.`,
                    type: 'nomination_status',
                    relatedId: updatedNomination._id.toString(),
                    actionUrl: `/nominations`
                });
            }
        } catch (notifErr) {
            console.error('Failed to send nomination status notification:', notifErr);
        }

        res.json({
            ...updatedNomination.toObject(),
            id: updatedNomination._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating nomination status' });
    }
};

// Get busy participants for a specific date
export const getBusyParticipants = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { date, excludeTrainingId } = req.query;

        if (!date) {
            res.status(400).json({ message: 'Date is required to check availability' });
            return;
        }

        const queryDate = new Date(String(date));

        // Ensure valid date
        if (isNaN(queryDate.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }

        // Set start and end of day for precise querying
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        // 1. Find all trainings scheduled for this date (excluding the one we are nominating for, if provided)
        const trainingQuery: any = {
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' }
        };

        if (excludeTrainingId) {
            trainingQuery._id = { $ne: String(excludeTrainingId) };
        }

        const trainingsOnDate = await Training.find(trainingQuery).select('_id');
        const trainingIds = trainingsOnDate.map(t => t._id);

        if (trainingIds.length === 0) {
            // No other trainings on this date, so no one is busy (relatively speaking to this day)
            res.json([]);
            return;
        }

        // 2. Find all active nominations for these trainings
        const activeNominations = await Nomination.find({
            trainingId: { $in: trainingIds },
            status: { $in: ['nominated', 'approved', 'attended'] }
        }).select('participantId');

        // Extract unique participant IDs
        const busyParticipantIds = Array.from(new Set(activeNominations.map(nom => String(nom.participantId))));

        res.json(busyParticipantIds);
    } catch (error) {
        console.error('Error fetching busy participants:', error);
        res.status(500).json({ message: 'Error fetching availability data' });
    }
};
