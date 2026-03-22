import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import User from './src/models/User';
import Training from './src/models/Training';
import Nomination from './src/models/Nomination';
import Notification from './src/models/Notification';
import Institution from './src/models/Institution';
import Attendance from './src/models/Attendance';

dotenv.config();

const API_URL = 'http://localhost:3000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/training_db';

async function verifyNotifications() {
    console.log('Starting Notification System Verification...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Setup: Ensure we have a Training, a Creator (PO), a Master Admin, and a Participant
        console.log('Setting up test data...');

        // Find users
        const admin = await User.findOne({ role: 'master_admin' });
        const programOfficer = await User.findOne({ role: 'program_officer' });
        const institution = await Institution.findOne();

        if (!admin || !programOfficer || !institution) {
            throw new Error('Required data (admin, PO, institution) not found. Run seed script first.');
        }

        console.log(`Admin: ${admin.email}, PO: ${programOfficer.email}, Inst: ${institution.name}`);

        // Create a dedicated test user to avoid credential issues
        const testEmail = `test-notif-${Date.now()}@example.com`;
        const testPassword = 'password123';

        // Register via API
        console.log('Registering test participant via API...');
        await axios.post(`${API_URL}/auth/register`, {
            email: testEmail,
            password: testPassword,
            name: 'Test Notification User',
            role: 'participant',
            institutionId: institution._id,
            phone: '1234567890',
            designation: 'Tester',
            department: 'Testing'
        });

        // Approve via DB
        const testParticipant = await User.findOneAndUpdate(
            { email: testEmail },
            { isApproved: true },
            { new: true }
        );

        if (!testParticipant) throw new Error('Test participant not found after registration');
        console.log(`Created and approved test participant: ${testParticipant.email}`);

        // Create a test training
        const training = await Training.create({
            title: 'Notification Test Training',
            description: 'Test Description',
            program: 'Test Program',
            date: new Date(),
            startTime: '10:00',
            endTime: '11:00',
            hallId: 'hall-1', // Assuming hall-1 exists or string is accepted
            capacity: 10,
            trainerId: programOfficer._id,
            createdById: programOfficer._id,
            status: 'scheduled'
        });
        console.log(`Created training: ${training.title} (${training._id})`);

        // Create a nomination
        await Nomination.create({
            trainingId: training._id,
            participantId: testParticipant._id,
            institutionId: institution._id,
            status: 'approved',
            nominatedBy: admin._id
        });

        // 2. Simulate QR Scan (Mark Attendance)
        console.log('Simulating QR scan...');

        // Login as test participant
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: testEmail,
            password: 'password123'
        });
        const token = loginRes.data.token;

        const qrData = JSON.stringify({
            trainingId: training._id,
            sessionId: 'session-1',
            expiryTimestamp: Date.now() + 100000,
            signature: 'dummy'
        });

        const attendanceRes = await axios.post(
            `${API_URL}/attendance`,
            {
                trainingId: training._id,
                method: 'qr',
                qrData
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('Attendance marked successfully:', attendanceRes.status);

        // 3. Verify Notifications
        console.log('Verifying notifications...');

        // Check for Program Officer notification
        const poNotification = await Notification.findOne({
            userId: programOfficer._id,
            title: 'Attendance Marked',
            message: { $regex: testParticipant.name }
        });

        if (poNotification) {
            console.log('✅ Program Officer notification created:', poNotification.message);
        } else {
            console.error('❌ Program Officer notification NOT found!');
        }

        // Check for Admin notification
        const adminNotification = await Notification.findOne({
            userId: admin._id,
            title: 'Attendance Marked',
            message: { $regex: testParticipant.name }
        });

        if (adminNotification) {
            console.log('✅ Admin notification created:', adminNotification.message);
        } else {
            console.error('❌ Admin notification NOT found!');
        }

        // 4. Clean up
        console.log('Cleaning up...');
        await Attendance.deleteMany({ trainingId: training._id });
        await Nomination.deleteMany({ trainingId: training._id });
        await Notification.deleteMany({ message: { $regex: testParticipant.name } });
        await Training.findByIdAndDelete(training._id);
        await User.findByIdAndDelete(testParticipant._id);

        console.log('Verification Complete!');

    } catch (error: any) {
        console.error('Verification Failed:', error.message);
        if (error.response) {
            console.error('API Status:', error.response.status);
            console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('No response received or setup error.');
        }
    } finally {
        await mongoose.disconnect();
    }
}

verifyNotifications();
