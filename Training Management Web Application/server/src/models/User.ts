
import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
    MASTER_ADMIN = 'master_admin',
    PROGRAM_OFFICER = 'program_officer',
    INSTITUTIONAL_ADMIN = 'institutional_admin',
    PARTICIPANT = 'participant'
}

export interface IUser extends Omit<Document, '_id'> {
    _id: string; // Using string to match UUID from existing system
    email: string;
    password: string;
    name: string;
    role: UserRole;
    institutionId?: string;
    designation?: string;
    phone?: string;
    department?: string;
    profilePicture?: string;
    fcmToken?: string;
    createdAt: Date;
    isApproved: boolean;
}

import { v4 as uuidv4 } from 'uuid';

const UserSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(UserRole),
        required: true
    },
    institutionId: { type: String, ref: 'Institution' },
    designation: { type: String },
    phone: { type: String },
    department: { type: String },
    profilePicture: { type: String },
    fcmToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: false }
});

// Need to handle _id generation if not provided. 
// For migration, we will insert _id explicitly. 
// For new cretions, we should probably use UUID to maintain consistency or switch to ObjectId.
// Given the prompt says "without any loss of data", keeping UUID as string for _id is safest for migration.
// But for new records, we might want to generate UUIDs. 
// Let's use 'uuid' package for default function if feasible, or just rely on controller to generate it.
// For now, let's keep it simple.

export default mongoose.model<IUser>('User', UserSchema);
