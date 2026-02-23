import { Request, Response } from 'express';
import Training from '../models/Training';
import HallBlock from '../models/HallBlock';
import { AuthRequest } from '../middleware/authMiddleware';
import Nomination from '../models/Nomination';
import { createAndSendNotification } from '../utils/notificationUtils';

// Get all trainings
export const getTrainings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { institutionId, createdById } = req.query;
        // Cast to AuthRequest to access user property safely if middleware populated it
        const authReq = req as AuthRequest;
        const whereClause: any = {};

        if (createdById) {
            whereClause.createdById = createdById as string;
        }

        // Enforcement: If PO, they can only see their own trainings
        if (authReq.user?.role === 'program_officer') {
            whereClause.createdById = authReq.user.userId;
        }

        // Apply filtering by institutionId directly in query if possible, or filter locally
        // Mongoose: if institutionId provided, find documents where requiredInstitutions array contains it OR is empty/null?
        // Logic below: "checking if ID is in requiredInstitutions JSON array"
        // In Mongoose schema, requiredInstitutions is [String].
        if (institutionId) {
            whereClause.requiredInstitutions = institutionId as string;
        }

        // Wait, the logic below filters *after* fetching if institutionId is present.
        // It says "if (institutionId) result = result.filter(...)".
        // If I can do it in query, it's better.
        // But let's check exact requirements. "Store array directly".
        // If `training.requiredInstitutions` contains `institutionId`.

        // Check if user is a participant and filter accordingly
        if (authReq.user?.role === 'participant') {
            const Nomination = require('../models/Nomination').default;
            const userNominations = await Nomination.find({
                participantId: authReq.user.userId,
                status: { $in: ['nominated', 'approved', 'attended'] }
            }).select('trainingId');

            const nominatedTrainingIds = userNominations.map((n: any) => n.trainingId);

            // Add to whereClause. If other filters exist, this should logically AND with them.
            // Using $in ensure we only get trainings the user is nominated for.
            whereClause._id = { $in: nominatedTrainingIds };
        }

        let query = Training.find(whereClause)
            .populate('hallId')
            .populate('createdById', 'name email')
            .sort({ date: 1 });

        const trainings = await query.lean() as any[];

        // If participant, fetch their nominations to attach status
        let userStatusMap: Record<string, string> = {};
        if (authReq.user?.role === 'participant') {
            const Nomination = require('../models/Nomination').default;
            const nominations = await Nomination.find({ participantId: authReq.user.userId });
            nominations.forEach((n: any) => {
                userStatusMap[n.trainingId] = n.status;
            });
        }

        // Map populated fields to match expected output
        const formattedTrainings = trainings.map(t => ({
            ...t,
            id: t._id,
            userStatus: userStatusMap[t._id.toString()] || null,
            hallId: t.hallId?._id || t.hallId,
            createdById: t.createdById?._id || t.createdById,
            hall: {
                ...t.hallId,
                id: t.hallId?._id
            },
            creator: {
                ...t.createdById,
                id: t.createdById?._id
            }
        }));

        res.json(formattedTrainings);
    } catch (error) {
        console.error('Error fetching trainings:', error);
        res.status(500).json({ message: 'Error fetching trainings' });
    }
};

// Get single training
// Get single training
export const getTrainingById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const training = await Training.findById(id)
            .populate('hallId')
            .populate('createdById', 'name email')
            .lean();

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Enforcement: If PO, check ownership
        const authReq = req as AuthRequest;
        // Handle populated createdById
        const creatorId = (training.createdById as any)._id || training.createdById;

        if (authReq.user?.role === 'program_officer' && creatorId.toString() !== authReq.user.userId) {
            res.status(403).json({ message: 'Not authorized to view this training' });
            return;
        }

        const transformedTraining = {
            ...training,
            // @ts-ignore
            id: training._id,
            // @ts-ignore
            creator: training.createdById,
            // @ts-ignore
            createdById: training.createdById?._id || training.createdById
        };

        res.json(transformedTraining);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching training' });
    }
};

// Create training
export const createTraining = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            title,
            description,
            program,
            date,
            startTime,
            endTime,
            hallId,
            capacity,
            trainerId,
            targetAudience,
            requiredInstitutions,
            status // Extract status
        } = req.body;

        const trainingDateObj = new Date(date);
        const startOfDay = new Date(trainingDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(trainingDateObj);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Check Training Conflict (Skip if draft)
        if (status !== 'draft') {
            const conflictingTraining = await Training.findOne({
                hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                ],
                status: { $in: ['scheduled', 'ongoing'] } // Only check confirmed
            });

            if (conflictingTraining) {
                res.status(409).json({ message: 'Hall is already booked for this time slot.' });
                return;
            }

            // 2. Check Hall Block Conflict
            const conflictingBlock = await HallBlock.findOne({
                hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                ]
            });

            if (conflictingBlock) {
                res.status(403).json({ message: 'This hall slot is blocked by admin and cannot be booked.' });
                return;
            }
        }

        const training = await Training.create({
            title,
            description,
            program,
            date: trainingDateObj,
            startTime,
            endTime,
            hallId,
            capacity,
            trainerId,
            targetAudience,
            createdById: req.user!.userId,
            status: status || 'scheduled',
            requiredInstitutions
        });

        res.status(201).json({
            ...training.toObject(),
            id: training._id
        });
    } catch (error: any) {
        console.error('Create training error:', error);
        res.status(500).json({ message: 'Error creating training' });
    }
};

// Update training details
export const updateTraining = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user!.userId;
        const userRole = req.user!.role;
        const {
            title,
            description,
            program,
            date,
            startTime,
            endTime,
            hallId,
            capacity,
            targetAudience,
            requiredInstitutions,
            status
        } = req.body;

        const training = await Training.findById(id);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Authorization check: Only creator or master_admin can update this training
        if (training.createdById.toString() !== userId && userRole !== 'master_admin') {
            res.status(403).json({ message: 'Not authorized to update this training' });
            return;
        }

        const trainingDateObj = new Date(date || training.date);
        const startOfDay = new Date(trainingDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(trainingDateObj);
        endOfDay.setHours(23, 59, 59, 999);

        // Check conflicts
        if (status !== 'draft') {
            const conflictingTraining = await Training.findOne({
                _id: { $ne: id },
                hallId: hallId || training.hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                $and: [
                    { startTime: { $lt: endTime || training.endTime } },
                    { endTime: { $gt: startTime || training.startTime } }
                ],
                status: { $in: ['scheduled', 'ongoing'] }
            });

            if (conflictingTraining) {
                res.status(409).json({ message: 'Hall is already booked for this time slot.' });
                return;
            }

            const conflictingBlock = await HallBlock.findOne({
                hallId: hallId || training.hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                $and: [
                    { startTime: { $lt: endTime || training.endTime } },
                    { endTime: { $gt: startTime || training.startTime } }
                ]
            });

            if (conflictingBlock) {
                res.status(403).json({ message: 'This hall slot is blocked by admin and cannot be booked.' });
                return;
            }
        }

        // Update fields
        if (title !== undefined) training.title = title;
        if (description !== undefined) training.description = description;
        if (program !== undefined) training.program = program;
        if (targetAudience !== undefined) training.targetAudience = targetAudience;
        if (date !== undefined) training.date = trainingDateObj;
        if (startTime !== undefined) training.startTime = startTime;
        if (endTime !== undefined) training.endTime = endTime;
        if (hallId !== undefined) training.hallId = hallId;
        if (capacity !== undefined) training.capacity = capacity;
        if (requiredInstitutions !== undefined) training.requiredInstitutions = requiredInstitutions;
        if (status !== undefined) training.status = status;

        await training.save();

        res.json({
            ...training.toObject(),
            id: training._id
        });
    } catch (error: any) {
        console.error('Update training error:', error);
        res.status(500).json({ message: 'Error updating training' });
    }
};

// Update training status
export const updateTrainingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const training = await Training.findById(id);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Authorization check: Only creator or master_admin can update status
        if (training.createdById.toString() !== userId && userRole !== 'master_admin') {
            res.status(403).json({ message: 'Not authorized to update this training' });
            return;
        }

        training.status = status;
        await training.save();

        res.json({
            ...training.toObject(),
            id: training._id
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Error updating training status' });
    }
};

// Delete training
export const deleteTraining = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const training = await Training.findById(id);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Authorization check: Only creator or master_admin can delete
        if (training.createdById.toString() !== userId && userRole !== 'master_admin') {
            res.status(403).json({ message: 'Not authorized to delete this training' });
            return;
        }

        await Training.findByIdAndDelete(id);

        // Clean up associated hall requests
        const HallBookingRequest = require('../models/HallBookingRequest').default;
        await HallBookingRequest.deleteMany({ trainingId: id });

        res.json({ message: 'Training deleted successfully' });
    } catch (error) {
        console.error('Delete training error:', error);
        res.status(500).json({ message: 'Error deleting training' });
    }
};

// Generate certificates for attended participants
export const generateCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const training = await Training.findById(id);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        // Authorization: Only creator or master_admin
        if (training.createdById.toString() !== userId && userRole !== 'master_admin') {
            res.status(403).json({ message: 'Not authorized to generate certificates' });
            return;
        }

        if (training.status !== 'completed') {
            res.status(400).json({ message: 'Certificates can only be generated for completed trainings' });
            return;
        }

        // Update training
        training.certificatesGenerated = true;
        await training.save();

        // Get all attended participants
        const attendedNominations = await Nomination.find({
            trainingId: id,
            status: 'attended'
        });

        // Send notifications
        const notificationPromises = attendedNominations.map(nomination => {
            return createAndSendNotification({
                userId: nomination.participantId,
                title: 'Certificate Ready',
                message: `Your certificate for "${training.title}" is now available for download.`,
                type: 'success',
                relatedId: training._id
            });
        });

        await Promise.all(notificationPromises);

        res.json({
            message: 'Certificates generated successfully',
            count: attendedNominations.length
        });
    } catch (error) {
        console.error('Generate certificates error:', error);
        res.status(500).json({ message: 'Error generating certificates' });
    }
};
