
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IInstitution extends Omit<Document, '_id'> {
    _id: string;
    name: string;
    type: string;
    location: string;
    createdAt: Date;
}

const InstitutionSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    type: { type: String, required: true }, // e.g., 'college', 'school', etc.
    location: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
