import { Request, Response } from 'express';
import Institution from '../models/Institution';

export const getInstitutions = async (req: Request, res: Response): Promise<void> => {
    try {
        const institutions = await Institution.find().sort({ name: 1 });

        // Map _id to id for frontend compatibility if needed, 
        // though Mongoose documents usually have _id. 
        // Let's keep it standard or use a transform if strictly needed.
        // For now, sending the document as is. 
        // If frontend breaks on 'id' vs '_id', we might need a transform.
        // Given existing Prisma usage returned 'id', let's map it.
        const formattedInstitutions = institutions.map(inst => ({
            ...inst.toObject(),
            id: inst._id
        }));

        res.status(200).json(formattedInstitutions);
    } catch (error) {
        console.error('Error fetching institutions:', error);
        res.status(500).json({ message: 'Error fetching institutions' });
    }
};

export const createInstitution = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, type, location } = req.body;

        const newInstitution = await Institution.create({
            name,
            type,
            location
        });

        res.status(201).json({
            ...newInstitution.toObject(),
            id: newInstitution._id
        });
    } catch (error) {
        console.error('Error creating institution:', error);
        res.status(500).json({ message: 'Error creating institution' });
    }
};

export const deleteInstitution = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const institution = await Institution.findByIdAndDelete(id);

        if (!institution) {
            res.status(404).json({ message: 'Institution not found' });
            return;
        }

        res.status(200).json({ message: 'Institution deleted successfully' });
    } catch (error) {
        console.error('Error deleting institution:', error);
        res.status(500).json({ message: 'Error deleting institution' });
    }
};
