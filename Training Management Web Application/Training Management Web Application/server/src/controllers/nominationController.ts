import { Response } from 'express';
import Nomination, { NominationStatus } from '../models/Nomination';
import User from '../models/User';
import Training from '../models/Training';
import { AuthRequest } from '../middleware/authMiddleware';
import { createAndSendNotification } from '../utils/notificationUtils';
import {
    buildParticipantSnapshot,
    mergeParticipantSnapshots,
    toArchivedParticipantProfile,
    upsertTrainingParticipantSnapshot,
} from '../models/shared/participantSnapshot';

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
        if (req.user?.role === 'institutional_admin' || req.user?.role === 'medical_officer') {
            institutionId = req.user.institutionId;
        }

        if (!institutionId) {
            // Fetch participant's institution
            const participant = await User.findOne({ _id: participantId, isDeleted: { $ne: true } }).select('institutionId name');
            institutionId = participant?.institutionId;
            const participantName = participant?.name || 'User';

            if (!institutionId) {
                res.status(400).json({ message: `${participantName} has no institution assigned` });
                return;
            }
        }

        const participant = await User.findOne({ _id: participantId, isDeleted: { $ne: true } })
            .select('name institutionId designation department email phone role isDeleted deletedAt')
            .populate('institutionId', 'name');
        if (!participant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }

        const participantSnapshot = buildParticipantSnapshot(participant, (participant as any).institutionId);

        const participantName = participant.name || 'User';
        const participantInstitutionId = typeof participant.institutionId === 'string'
            ? participant.institutionId
            : ((participant as any).institutionId?._id?.toString() || '');
        const participantDesignation = participant.designation?.trim() || '';

        if ((req.user?.role === 'institutional_admin' || req.user?.role === 'medical_officer') &&
            req.user.institutionId &&
            participantInstitutionId !== req.user.institutionId) {
            res.status(403).json({ message: `${participantName} does not belong to your institution` });
            return;
        }

        // Fetch training details to check eligibility and conflicts
        const training = await Training.findById(trainingId);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        const requiredInstitutions = Array.isArray(training.requiredInstitutions)
            ? training.requiredInstitutions.map((id: any) => String(id))
            : [];
        const targetAudience = Array.isArray(training.targetAudience)
            ? training.targetAudience.flatMap((designation: any) =>
                String(designation)
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean)
            )
            : [];

        if (requiredInstitutions.length > 0 && (!participantInstitutionId || !requiredInstitutions.includes(participantInstitutionId))) {
            res.status(400).json({ message: `${participantName} does not belong to a required institution for this training` });
            return;
        }

        if (targetAudience.length > 0 && (!participantDesignation || !targetAudience.includes(participantDesignation))) {
            res.status(400).json({ message: `${participantName} does not match the target audience for this training` });
            return;
        }

        if (participantInstitutionId) {
            institutionId = participantInstitutionId;
        }

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

        const assignedParticipantsCount = await Nomination.countDocuments({
            trainingId,
            status: { $in: ['nominated', 'approved', 'attended'] }
        });

        if (assignedParticipantsCount >= training.capacity) {
            res.status(400).json({ message: 'Training has reached its maximum capacity. Cannot assign more participants.' });
            return;
        }

        upsertTrainingParticipantSnapshot(training, participantSnapshot);
        await training.save();

        // Check if participant has any other training on the same date
        const trainingDate = new Date(training.date);
        const startOfDay = new Date(trainingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(trainingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflictingTrainings = await Training.find({
            _id: { $ne: trainingId },
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'cancelled' }
        }).select('_id');

        const conflictingTrainingIds = conflictingTrainings.map((t: any) => t._id);

        if (conflictingTrainingIds.length > 0) {
            const conflictingNomination = await Nomination.findOne({
                participantId,
                status: { $in: ['nominated', 'approved', 'attended'] },
                trainingId: { $in: conflictingTrainingIds }
            });

            if (conflictingNomination) {
                res.status(400).json({ message: `${participantName} already has another training scheduled on this date` });
                return;
            }
        }

        let nomination;
        if (existingNomination) {
            existingNomination.status = NominationStatus.NOMINATED;
            existingNomination.institutionId = institutionId;
            existingNomination.nominatedBy = req.user!.userId;
            existingNomination.rejectionReason = undefined;
            existingNomination.participantSnapshot = mergeParticipantSnapshots(
                existingNomination.participantSnapshot as any,
                participantSnapshot
            ) as any;
            await existingNomination.save();
            nomination = existingNomination;
        } else {
            nomination = await Nomination.create({
                trainingId,
                participantId,
                institutionId,
                nominatedBy: req.user!.userId,
                participantSnapshot,
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
        } else if (req.user?.role === 'medical_officer') {
            // Medical officers should see the nominations they created across sessions.
            where.nominatedBy = req.user.userId;
        } else if (req.user?.role === 'program_officer') {
            // PO can only see nominations for trainings they created
            const poTrainingIds = (await Training.find({ createdById: req.user.userId }).distinct('_id')).map((entry: any) => String(entry));

            if (trainingId) {
                const requestedTrainingId = String(trainingId);
                where.trainingId = poTrainingIds.includes(requestedTrainingId)
                    ? requestedTrainingId
                    : '__no_match__';
            } else {
                where.trainingId = { $in: poTrainingIds };
            }
        }

        const nominations = await Nomination.find(where)
            .populate('participantId', 'name email designation institutionId department phone role isDeleted deletedAt')
            .populate('trainingId', 'title date participantSnapshots')
            .populate('institutionId', 'name')
            .lean() as any[];

        const formattedNominations = nominations.map((nom) => {
            const participantId = String(nom.participantId?._id || nom.participantId || nom.participantSnapshot?.participantId || '');
            const trainingSnapshot = Array.isArray(nom.trainingId?.participantSnapshots)
                ? nom.trainingId.participantSnapshots.find((entry: any) => String(entry.participantId) === participantId)
                : undefined;
            const participantSnapshot = mergeParticipantSnapshots(nom.participantSnapshot, trainingSnapshot);
            const participantProfile = toArchivedParticipantProfile(participantId, nom.participantId, participantSnapshot);

            return {
                id: nom._id,
                ...nom,
                participantId,
                trainingId: nom.trainingId?._id || nom.trainingId,
                institutionId: nom.institutionId?._id || nom.institutionId || participantSnapshot?.institutionId,
                participantSnapshot,
                participant: participantProfile,
                training: {
                    ...nom.trainingId,
                    id: nom.trainingId?._id,
                },
                institution: nom.institutionId
                    ? {
                        ...nom.institutionId,
                        id: nom.institutionId?._id
                    }
                    : participantSnapshot?.institutionName
                        ? {
                            id: participantSnapshot.institutionId,
                            name: participantSnapshot.institutionName,
                        }
                        : null
            };
        });

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

        const validStatuses = Object.values(NominationStatus);
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid nomination status' });
            return;
        }

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

        const trainingId = String((nomination.trainingId as any)?._id || nomination.trainingId);
        const participantId = String(nomination.participantId);

        if (status === 'rejected') {
            await Nomination.updateMany(
                {
                    trainingId,
                    participantId,
                    status: { $in: ['nominated', 'approved', 'attended'] }
                },
                updateData
            );
        } else {
            await Nomination.findByIdAndUpdate(
                id,
                updateData,
                { new: false, runValidators: true }
            );
        }

        const updatedNomination = await Nomination.findById(id).populate('trainingId', 'title');

        if (!updatedNomination) {
            res.status(404).json({ message: 'Nomination update failed' });
            return;
        }

        // Send Notification to Participant
        try {
            const action = status === 'approved' ? 'approved' : 'rejected';
            const trainingTitle = (nomination.trainingId as any)?.title || (updatedNomination.trainingId as any)?.title || 'Training';
            const isRemoval = status === 'rejected' && typeof rejectionReason === 'string' && rejectionReason.toLowerCase().includes('removed from training');

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
                    actionUrl: `/trainings/${(nomination.trainingId as any)._id.toString()}`
                });
            } else {
                await createAndSendNotification({
                    userId: participantId,
                    title: isRemoval ? 'Removed From Training' : `Nomination ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    message: isRemoval
                        ? `You have been removed from "${trainingTitle}".`
                        : `Your nomination for "${trainingTitle}" has been ${action}.`,
                    type: isRemoval ? 'warning' : 'nomination_status',
                    relatedId: trainingId,
                    actionUrl: `/dashboard`
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

