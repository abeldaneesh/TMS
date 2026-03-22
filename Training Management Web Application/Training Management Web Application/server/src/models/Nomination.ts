
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IParticipantSnapshot, ParticipantSnapshotSchema } from './shared/participantSnapshot';

export enum NominationStatus {
    NOMINATED = 'nominated',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    ATTENDED = 'attended'
}

export interface INomination extends Omit<Document, '_id'> {
    _id: string;
    trainingId: string;
    participantId: string;
    institutionId: string;
    status: NominationStatus;
    nominatedBy: string;
    nominatedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    participantSnapshot?: IParticipantSnapshot;
}

const NominationSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    trainingId: { type: String, ref: 'Training', required: true },
    participantId: { type: String, ref: 'User', required: true },
    institutionId: { type: String, ref: 'Institution', required: true },
    status: {
        type: String,
        enum: Object.values(NominationStatus),
        default: NominationStatus.NOMINATED
    },
    nominatedBy: { type: String, required: true }, // User ID
    nominatedAt: { type: Date, default: Date.now },
    approvedBy: { type: String }, // User ID
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    participantSnapshot: { type: ParticipantSnapshotSchema }
});

export default mongoose.model<INomination>('Nomination', NominationSchema);
