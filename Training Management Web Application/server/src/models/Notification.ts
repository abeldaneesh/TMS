
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface INotification extends Omit<Document, '_id'> {
    _id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    type: string;
    createdAt: Date;
    actionUrl?: string;
}

const NotificationSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    userId: { type: String, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, default: 'info' }, // info, success, warning, error
    createdAt: { type: Date, default: Date.now },
    actionUrl: { type: String, required: false }, // Store url ref
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
