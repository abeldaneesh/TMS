import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
    name?: string;
    email: string;
    passwordHash?: string;
    designation?: string;
    institutionId?: string;
    role?: string;
    otp: string;
    isVerified: boolean;
    createdAt: Date;
}

const PendingUserSchema: Schema = new Schema({
    name: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: false },
    designation: { type: String, required: false },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    role: { type: String, required: false },
    otp: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 600 } // Document expires after 10 minutes
});

export default mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);
