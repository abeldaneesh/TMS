import { Request, Response } from 'express';
import Hall from '../models/Hall';
import Training from '../models/Training';
import HallBlock from '../models/HallBlock';
import { v4 as uuidv4 } from 'uuid';

export const getHalls = async (req: Request, res: Response): Promise<void> => {
    try {
        const halls = await Hall.find()
            .sort({ name: 1 });

        const formattedHalls = halls.map((hall: any) => ({
            ...hall.toObject(),
            id: hall._id
        }));

        res.status(200).json(formattedHalls);
    } catch (error) {
        console.error('Error fetching halls:', error);
        res.status(500).json({ message: 'Error fetching halls' });
    }
};

export const createHall = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, capacity, location, programOfficerId } = req.body;

        const newHall = await Hall.create({
            name,
            capacity,
            location,
            programOfficerId
        });

        res.status(201).json({
            ...newHall.toObject(),
            id: newHall._id
        });
    } catch (error) {
        console.error('Error creating hall:', error);
        res.status(500).json({ message: 'Error creating hall' });
    }
};

export const getAvailableHalls = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, startTime, endTime, excludeTrainingId } = req.query;

        if (!date || !startTime || !endTime) {
            res.status(400).json({ message: 'Date, start time, and end time are required' });
            return;
        }

        const checkDate = new Date(date as string);
        const dayOfWeek = checkDate.getDay();

        // Define start and end of day in UTC to be robust against local timezone shifts
        const dateStr = date as string;
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

        // 1. Find conflicting trainings
        const trainingQuery: any = {
            date: { $gte: startOfDay, $lte: endOfDay },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime as string } }, // strict overlap: start < end
                        { endTime: { $gt: startTime as string } }, // strict overlap: end > start
                    ],
                }
            ],
            status: { $in: ['scheduled', 'ongoing', 'completed'] } // Exclude drafts from blocking
        };

        if (excludeTrainingId) {
            trainingQuery._id = { $ne: excludeTrainingId as string };
        }

        const conflictingTrainings = await Training.find(trainingQuery).select('hallId');

        // 2. Find conflicting blocks
        const conflictingBlocks = await HallBlock.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime as string } },
                        { endTime: { $gt: startTime as string } },
                    ],
                }
            ]
        }).select('hallId');

        const occupiedHallIds = new Set([
            ...conflictingTrainings.map((t: any) => t.hallId),
            ...conflictingBlocks.map((b: any) => b.hallId)
        ].map((id: any) => id?.toString()));

        // 3. Find ALL halls
        const allHalls = await Hall.find();

        // 4. Filter by Availability Whitelist AND Occupation
        const availableHalls = allHalls.filter(hall => {
            // Check if occupied
            if (occupiedHallIds.has(hall._id.toString())) return false;

            // Check if hall has ANY availability defined
            if (hall.availability && hall.availability.length > 0) {
                // If availability is defined, the requested time MUST fall within at least one slot
                const hasMatchingSlot = hall.availability.some(slot => {
                    // Check specific date slot
                    if (slot.specificDate) {
                        const slotDate = new Date(slot.specificDate).toISOString().split('T')[0];
                        const reqDate = new Date(date as string).toISOString().split('T')[0];

                        if (slotDate === reqDate) {
                            return slot.startTime <= (startTime as string) &&
                                slot.endTime >= (endTime as string);
                        }
                        return false;
                    }

                    // Check recurring weekly slot
                    if (slot.dayOfWeek !== undefined && slot.dayOfWeek !== null) {
                        return slot.dayOfWeek === dayOfWeek &&
                            slot.startTime <= (startTime as string) &&
                            slot.endTime >= (endTime as string);
                    }

                    return false;
                });
                return hasMatchingSlot;
            }

            // If NO availability defined, assume OPEN (Default behavior)
            return true;
        });

        // Sort by name
        availableHalls.sort((a, b) => a.name.localeCompare(b.name));

        const formattedAvailableHalls = availableHalls.map((hall: any) => ({
            ...hall.toObject(),
            id: hall._id
        }));

        res.status(200).json(formattedAvailableHalls);
    } catch (error) {
        console.error('Error fetching available halls:', error);
        res.status(500).json({ message: 'Error fetching available halls' });
    }
};

export const addAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const hallId = req.params.hallId as string;
        const { dayOfWeek, specificDate, startTime, endTime } = req.body;

        if ((dayOfWeek === undefined && !specificDate) || !startTime || !endTime) {
            res.status(400).json({ message: 'Either Day of week or Specific Date, plus start/end time are required' });
            return;
        }

        const hall = await Hall.findById(hallId);
        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        const newAvailability = {
            dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
            specificDate: specificDate ? new Date(specificDate) : undefined,
            startTime,
            endTime
        };

        hall.availability.push(newAvailability);
        await hall.save();

        res.status(201).json(newAvailability);
    } catch (error) {
        console.error('Error adding availability:', error);
        res.status(500).json({ message: 'Error adding availability' });
    }
};

export const removeAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const availabilityId = req.params.availabilityId as string;
        const hall = await Hall.findOne({ "availability._id": availabilityId });

        if (!hall) {
            res.status(404).json({ message: 'Availability not found' });
            return;
        }

        hall.availability = hall.availability.filter((a: any) => a._id.toString() !== availabilityId);
        await hall.save();

        res.status(200).json({ message: 'Availability removed successfully' });
    } catch (error) {
        console.error('Error removing availability:', error);
        res.status(500).json({ message: 'Error removing availability' });
    }
};

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const hallId = req.params.hallId as string;

        const hall = await Hall.findById(hallId);
        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        const availability = hall.availability.sort((a: any, b: any) => {
            if (a.dayOfWeek !== b.dayOfWeek) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        res.status(200).json(availability);
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ message: 'Error fetching availability' });
    }
};

export const getHallAvailabilityDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const hallId = req.params.hallId;
        const { date, startTime, endTime, excludeTrainingId } = req.query;

        if (!date || !startTime || !endTime) {
            res.status(400).json({ message: 'Date, start time, and end time are required' });
            return;
        }

        const checkDate = new Date(date as string);
        const dayOfWeek = checkDate.getDay();
        const dateStr = date as string; // Expecting YYYY-MM-DD from frontend now
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

        // 1. Check Admin Blocks
        const conflictingBlock = await HallBlock.findOne({
            hallId,
            date: { $gte: startOfDay, $lte: endOfDay },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime as string } },
                        { endTime: { $gt: startTime as string } },
                    ],
                }
            ]
        });

        if (conflictingBlock) {
            res.json({
                isAvailable: false,
                reason: conflictingBlock.reason || 'Admin Block',
                type: 'block'
            });
            return;
        }

        // 2. Check Confirmed Trainings
        const trainingQuery: any = {
            hallId,
            date: { $gte: startOfDay, $lte: endOfDay },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime as string } },
                        { endTime: { $gt: startTime as string } },
                    ],
                }
            ],
            status: { $in: ['scheduled', 'ongoing', 'completed'] }
        };

        if (excludeTrainingId) {
            trainingQuery._id = { $ne: excludeTrainingId as string };
        }

        const conflictingTraining = await Training.findOne(trainingQuery).populate('createdById', 'name');

        if (conflictingTraining) {
            res.json({
                isAvailable: false,
                reason: `Booked for training: ${conflictingTraining.title}`,
                type: 'training',
                // @ts-ignore
                bookedBy: conflictingTraining.createdById?.name
            });
            return;
        }

        // 3. Check General Availability (Opening Hours)
        const hall = await Hall.findById(hallId);
        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        // If availability is defined, check if request matches any slot
        if (hall.availability && hall.availability.length > 0) {
            const hasMatchingSlot = hall.availability.some(slot => {
                if (slot.specificDate) {
                    const slotDate = new Date(slot.specificDate).toISOString().split('T')[0];
                    const reqDate = new Date(date as string).toISOString().split('T')[0];

                    if (slotDate === reqDate) {
                        return slot.startTime <= (startTime as string) &&
                            slot.endTime >= (endTime as string);
                    }
                    return false;
                }

                if (slot.dayOfWeek !== undefined && slot.dayOfWeek !== null) {
                    return slot.dayOfWeek === dayOfWeek &&
                        slot.startTime <= (startTime as string) &&
                        slot.endTime >= (endTime as string);
                }
                return false;
            });

            if (!hasMatchingSlot) {
                res.json({
                    isAvailable: false,
                    reason: 'Hall is closed at this time',
                    type: 'closed'
                });
                return;
            }
        } else {
            // If no availability defined, assume OPEN
            // Do nothing, proceed to send isAvailable: true
        }

        res.json({ isAvailable: true });

    } catch (error) {
        console.error('Error checking availability details:', error);
        res.status(500).json({ message: 'Error checking availability details' });
    }
};

export const updateHall = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hallId } = req.params;
        const { name, capacity, location, programOfficerId } = req.body;

        const hall = await Hall.findById(hallId);
        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        if (name) hall.name = name;
        if (capacity !== undefined) hall.capacity = capacity;
        if (location) hall.location = location;
        if (programOfficerId !== undefined) hall.programOfficerId = programOfficerId;

        await hall.save();

        res.json({
            ...hall.toObject(),
            id: hall._id
        });
    } catch (error) {
        console.error('Error updating hall:', error);
        res.status(500).json({ message: 'Error updating hall' });
    }
};

export const deleteHall = async (req: Request, res: Response): Promise<void> => {
    try {
        const { hallId } = req.params;
        const hall = await Hall.findByIdAndDelete(hallId);

        if (!hall) {
            res.status(404).json({ message: 'Hall not found' });
            return;
        }

        res.status(200).json({ message: 'Hall deleted successfully' });
    } catch (error) {
        console.error('Error deleting hall:', error);
        res.status(500).json({ message: 'Error deleting hall' });
    }
};


