import { Request, Response } from 'express';
import HallBookingRequest from '../models/HallBookingRequest';
import Training, { TrainingStatus } from '../models/Training';
import HallBlock from '../models/HallBlock';
import { AuthRequest } from '../middleware/authMiddleware';
import { createAndSendNotification } from '../utils/notificationUtils';

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { trainingId, hallId, priority, remarks } = req.body;
        const requestedBy = req.user?.userId;

        if (!trainingId || !hallId) {
            res.status(400).json({ message: 'Training ID and Hall ID are required' });
            return;
        }

        const request = await HallBookingRequest.create({
            trainingId,
            hallId,
            requestedBy,
            priority,
            remarks,
            status: 'pending'
        });

        res.status(201).json(request);
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating hall request', error: error.message });
    }
};

export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status) filter.status = status;

        const requests = await HallBookingRequest.find(filter)
            .populate('trainingId')
            .populate('hallId')
            .populate('requestedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching hall requests', error: error.message });
    }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const request = await HallBookingRequest.findById(id).populate('trainingId');
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }

        if (request.status !== 'pending') {
            res.status(400).json({ message: 'Request is already processed' });
            return;
        }

        if (status === 'approved') {
            const training = request.trainingId as any;
            if (!training) {
                res.status(404).json({ message: 'Associated training not found' });
                return;
            }

            // Strict Conflict Check
            const startTime = training.startTime;
            const endTime = training.endTime;
            const date = new Date(training.date);
            const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

            // 1. Check existing confirmed trainings
            const conflictingTraining = await Training.findOne({
                hallId: request.hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: [TrainingStatus.SCHEDULED, TrainingStatus.ONGOING] }, // Check confirmed ones
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                ],
                _id: { $ne: training._id } // Exclude self
            });

            if (conflictingTraining) {
                res.status(409).json({ message: 'Hall is blocked by another confirmed training.' });
                return;
            }

            // 2. Check blocks
            const conflictingBlock = await HallBlock.findOne({
                hallId: request.hallId,
                date: { $gte: startOfDay, $lte: endOfDay },
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                ]
            });

            if (conflictingBlock) {
                res.status(409).json({ message: 'Hall is blocked by an admin block.' });
                return;
            }

            // Approve: Update Training Status and Request Status
            await Training.findByIdAndUpdate(training._id, { status: TrainingStatus.SCHEDULED });
            request.status = 'approved';
            await request.save();

            // Notify User
            try {
                await createAndSendNotification({
                    userId: training.createdById, // Notify the creator
                    title: 'Hall Request Approved',
                    message: `Your request for hall "${(request.hallId as any).name}" for training "${training.title}" has been approved.`,
                    type: 'success',
                });
            } catch (err) {
                console.error("Error sending notification", err);
            }

        } else if (status === 'rejected') {
            request.status = 'rejected';
            await request.save();

            // Notify User
            try {
                const training = request.trainingId as any;
                await createAndSendNotification({
                    userId: training.createdById,
                    title: 'Hall Request Rejected',
                    message: `Your request for hall "${(request.hallId as any).name}" for training "${training.title}" has been rejected.`,
                    type: 'error',
                });
            } catch (err) {
                console.error("Error sending notification", err);
            }
        }

        res.json(request);
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating request status', error: error.message });
    }
};
