
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IHallAvailabilityData {
    dayOfWeek?: number;
    specificDate?: Date;
    startTime: string;
    endTime: string;
}

export interface IHall extends Omit<Document, '_id'> {
    _id: string;
    name: string;
    location: string;
    capacity: number;
    availability: IHallAvailabilityData[];
    createdAt: Date;
}

const HallSchema: Schema = new Schema({
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    availability: [{
        dayOfWeek: { type: Number }, // 0-6 for recurring
        specificDate: { type: Date }, // For specific date slots
        startTime: { type: String, required: true }, // HH:mm
        endTime: { type: String, required: true } // HH:mm
    }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IHall>('Hall', HallSchema);
