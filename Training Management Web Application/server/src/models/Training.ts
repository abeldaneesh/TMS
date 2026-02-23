
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum TrainingStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export interface ITraining extends Omit<Document, '_id'> {
    _id: string;
    title: string;
    description: string;
    program: string;
    date: Date;
    startTime: string;
    endTime: string;
    hallId: string;
    capacity: number;
    trainerId: string;
    targetAudience?: string;
    createdById: string;
    status: TrainingStatus;
    requiredInstitutions?: string[];
    attendanceSession?: {
        isActive: boolean;
        startTime?: Date;
        endTime?: Date;
        startedBy?: string;
        qrCodeToken?: string;
    };
    certificatesGenerated: boolean;
    createdAt: Date;
}

const TrainingSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    description: { type: String, required: true },
    program: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    hallId: { type: String, ref: 'Hall', required: true },
    capacity: { type: Number, required: true },
    trainerId: { type: String, required: true }, // Assuming this refers to a User or external entity? Using String for now.
    targetAudience: { type: String },
    createdById: { type: String, ref: 'User', required: true },
    status: {
        type: String,
        enum: Object.values(TrainingStatus),
        default: TrainingStatus.SCHEDULED
    },
    requiredInstitutions: [{ type: String }], // Array of institution IDs
    attendanceSession: {
        isActive: { type: Boolean, default: false },
        startTime: { type: Date },
        endTime: { type: Date },
        startedBy: { type: String, ref: 'User' },
        qrCodeToken: { type: String }
    },
    certificatesGenerated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ITraining>('Training', TrainingSchema);
