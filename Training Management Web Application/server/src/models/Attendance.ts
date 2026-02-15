
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAttendance extends Omit<Document, '_id'> {
    _id: string;
    trainingId: string;
    participantId: string;
    timestamp: Date;
    method: string;
    qrData?: string;
}

const AttendanceSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    trainingId: { type: String, ref: 'Training', required: true },
    participantId: { type: String, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    method: { type: String, required: true },
    qrData: { type: String }
});

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
