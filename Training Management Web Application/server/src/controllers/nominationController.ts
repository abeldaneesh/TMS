import { Response } from 'express';
import Nomination from '../models/Nomination';
import User from '../models/User';
import Training from '../models/Training';
import { AuthRequest } from '../middleware/authMiddleware';

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
        const existingNomination = await Nomination.findOne({
            trainingId,
            participantId,
            status: { $in: ['nominated', 'approved', 'attended'] }
        });

        if (existingNomination) {
            res.status(400).json({ message: `${participantName} is already appointed for this training` });
            return;
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

        const nomination = await Nomination.create({
            trainingId,
            participantId,
            institutionId,
            nominatedBy: req.user!.userId,
        });

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

        // Only master_admin can approve or reject nominations
        if (req.user?.role !== 'master_admin') {
            res.status(403).json({ message: 'Only admins can approve/reject nominations' });
            return;
        }

        const updateData: any = { status, rejectionReason };

        if (status === 'approved') {
            updateData.approvedBy = req.user!.userId;
            updateData.approvedAt = new Date();
        }

        const nomination = await Nomination.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!nomination) {
            res.status(404).json({ message: 'Nomination not found' });
            return;
        }

        res.json({
            ...nomination.toObject(),
            id: nomination._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating nomination status' });
    }
};
