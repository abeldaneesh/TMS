import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IHallBlock extends Omit<Document, '_id'> {
    _id: string;
    hallId: string;
    date: Date;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    reason: string;
    createdBy: string; // User ID
    createdAt: Date;
}

const HallBlockSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    hallId: { type: String, ref: 'Hall', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String, default: 'Admin Block' },
    createdBy: { type: String, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient querying of blocks by hall and date
HallBlockSchema.index({ hallId: 1, date: 1 });

export default mongoose.model<IHallBlock>('HallBlock', HallBlockSchema);
