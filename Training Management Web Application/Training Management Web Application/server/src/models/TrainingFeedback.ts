import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITrainingFeedback extends Omit<Document, '_id'> {
    _id: string;
    trainingId: string;
    participantId: string;
    suggestions: string;
    futureTrainingRequests: string;
    arrangementsFeedback: string;
    rating?: number;
    overallExperience?: string;
    anonymous: boolean;
    submittedAt: Date;
}

const TrainingFeedbackSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    trainingId: { type: String, ref: 'Training', required: true },
    participantId: { type: String, ref: 'User', required: true },
    suggestions: { type: String, required: true, trim: true },
    futureTrainingRequests: { type: String, required: true, trim: true },
    arrangementsFeedback: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    overallExperience: { type: String, trim: true },
    anonymous: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
});

TrainingFeedbackSchema.index({ trainingId: 1, participantId: 1 }, { unique: true });

export default mongoose.model<ITrainingFeedback>('TrainingFeedback', TrainingFeedbackSchema);
