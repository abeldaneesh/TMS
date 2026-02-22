import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    designation: string;
    institutionId?: string;
    role: string;
    otp: string;
    createdAt: Date;
}

const PendingUserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    designation: { type: String, required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    role: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 } // Document expires after 10 minutes
});

export default mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);
