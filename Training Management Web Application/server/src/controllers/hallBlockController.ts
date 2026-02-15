import { Request, Response } from 'express';
import HallBlock from '../models/HallBlock';
import Training from '../models/Training';
import Hall from '../models/Hall';

// Helper to check for overlaps
const checkOverlap = async (hallId: string, date: Date, startTime: string, endTime: string) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check against existing trainings
    // Overlap rule: newStart < existingEnd AND newEnd > existingStart
    // In our case, strings "HH:mm" can be compared lexicographically if format is consistent (which it is).
    // Actually simpler logic for Mongoose query:
    // Find any training on same date where NOT (end <= newStart OR start >= newEnd)
    // Which is equivalent to: end > newStart AND start < newEnd

    const conflictingTraining = await Training.findOne({
        hallId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
        $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
        ]
    });

    if (conflictingTraining) {
        return { conflict: true, type: 'training', details: conflictingTraining };
    }

    // Check against existing blocks
    const conflictingBlock = await HallBlock.findOne({
        hallId,
        date: { $gte: startOfDay, $lte: endOfDay },
        $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
        ]
    });

    if (conflictingBlock) {
        return { conflict: true, type: 'block', details: conflictingBlock };
    }

    return { conflict: false };
};

export const createBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hallId, date, startTime, endTime, reason } = req.body;
        // User ID from auth middleware (assuming extended Request interface or similar, generally req.user.userId)
        // For now, let's assume valid auth logic places user in req.user
        // If strict TS, might need casting or custom interface. 
        // Using 'any' for req.user to avoid TS issues if types aren't fully set up yet.
        const userId = (req as any).user?.userId;

        if (!hallId || !date || !startTime || !endTime) {
            res.status(400).json({ message: 'Hall ID, date, start time, and end time are required' });
            return;
        }

        // 1. Verify Hall exists
        const hall = await Hall.findById(hallId);
        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        // 2. Strict Conflict Check
        const overlap = await checkOverlap(hallId, new Date(date), startTime, endTime);
        if (overlap.conflict) {
            const msg = overlap.type === 'training'
                ? 'Hall is already booked by a training in this slot.'
                : 'Hall is already blocked by an admin in this slot.';
            res.status(409).json({ message: msg, details: overlap.details });
            return;
        }

        // 3. Create Block
        const newBlock = new HallBlock({
            hallId,
            date: new Date(date),
            startTime,
            endTime,
            reason: reason || 'Admin Block',
            createdBy: userId
        });

        await newBlock.save();
        res.status(201).json({
            ...newBlock.toObject(),
            id: newBlock._id
        });

    } catch (error) {
        console.error('Error creating hall block:', error);
        res.status(500).json({ message: 'Error creating hall block' });
    }
};

export const deleteBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const block = await HallBlock.findByIdAndDelete(id);

        if (!block) {
            res.status(404).json({ message: 'Block not found' });
            return;
        }

        res.status(200).json({ message: 'Block removed successfully' });
    } catch (error) {
        console.error('Error deleting hall block:', error);
        res.status(500).json({ message: 'Error deleting hall block' });
    }
};

export const getBlocks = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hallId } = req.params;
        const { date } = req.query;

        const query: any = { hallId };
        if (date) {
            const startOfDay = new Date(date as string);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date as string);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const blocks = await HallBlock.find(query).sort({ startTime: 1 });
        const formattedBlocks = blocks.map(block => ({
            ...block.toObject(),
            id: block._id
        }));
        res.status(200).json(formattedBlocks);
    } catch (error) {
        console.error('Error fetching hall blocks:', error);
        res.status(500).json({ message: 'Error fetching hall blocks' });
    }
};
