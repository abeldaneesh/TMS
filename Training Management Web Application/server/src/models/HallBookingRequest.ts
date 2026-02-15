import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IHallBookingRequest extends Omit<Document, '_id'> {
    _id: string;
    trainingId: string;
    hallId: string;
    requestedBy: string;
    status: 'pending' | 'approved' | 'rejected';
    priority: 'normal' | 'urgent';
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const HallBookingRequestSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    trainingId: { type: String, ref: 'Training', required: true },
    hallId: { type: String, ref: 'Hall', required: true },
    requestedBy: { type: String, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['normal', 'urgent'],
        default: 'normal'
    },
    remarks: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// HallBookingRequestSchema.pre('save', function (next) {
//     this.updatedAt = new Date();
//     next();
// });

export default mongoose.model<IHallBookingRequest>('HallBookingRequest', HallBookingRequestSchema);
