
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IParticipantSnapshot, ParticipantSnapshotSchema } from './shared/participantSnapshot';

export interface IAttendance extends Omit<Document, '_id'> {
    _id: string;
    trainingId: string;
    participantId: string;
    timestamp: Date;
    method: string;
    status?: 'present';
    attendanceType?: 'on_time' | 'late';
    markedBy?: string;
    markedByName?: string;
    qrData?: string;
    participantSnapshot?: IParticipantSnapshot;
}

const AttendanceSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    trainingId: { type: String, ref: 'Training', required: true },
    participantId: { type: String, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    method: { type: String, required: true },
    status: { type: String, default: 'present' },
    attendanceType: { type: String, enum: ['on_time', 'late'], default: 'on_time' },
    markedBy: { type: String, ref: 'User' },
    markedByName: { type: String },
    qrData: { type: String },
    participantSnapshot: { type: ParticipantSnapshotSchema }
});

AttendanceSchema.index({ trainingId: 1, participantId: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
