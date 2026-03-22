
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import Institution from './src/models/Institution';
import Hall from './src/models/Hall';
import Training from './src/models/Training';
import Nomination from './src/models/Nomination';
import Attendance from './src/models/Attendance';
import Notification from './src/models/Notification';

dotenv.config();

async function seed() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/training_db';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Institution.deleteMany({}),
            Hall.deleteMany({}),
            Training.deleteMany({}),
            Nomination.deleteMany({}),
            Attendance.deleteMany({}),
            Notification.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // 1. Institutions
        const institutions = [
            { _id: 'inst-1', name: 'District General Hospital', type: 'Hospital', location: 'Main City Center' },
            { _id: 'inst-2', name: 'Community Health Center - North', type: 'CHC', location: 'North Zone' },
            { _id: 'inst-3', name: 'Primary Health Center - East', type: 'PHC', location: 'East Zone' },
            { _id: 'inst-4', name: 'Primary Health Center - West', type: 'PHC', location: 'West Zone' },
            { _id: 'inst-5', name: 'Urban Health Center - South', type: 'UHC', location: 'South Zone' }
        ];
        await Institution.insertMany(institutions);
        console.log(`Inserted ${institutions.length} institutions`);

        // 2. Users (Password hash: $2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy)
        const passwordHash = '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy';
        const users = [
            { _id: 'user-1', name: 'Dr. Admin Kumar', email: 'admin@dmo.gov', password: passwordHash, role: 'master_admin', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg' },
            { _id: 'user-2', name: 'Dr. Priya Sharma', email: 'priya@dmo.gov', password: passwordHash, role: 'program_officer', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/women/1.jpg' },
            { _id: 'user-3', name: 'Dr. Rajesh Verma', email: 'rajesh@dmo.gov', password: passwordHash, role: 'program_officer', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg' },
            { _id: 'user-4', name: 'Dr. Anjali Patel', email: 'anjali@hospital1.gov', password: passwordHash, role: 'institutional_admin', institutionId: 'inst-1', designation: 'Medical Superintendent', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg' },
            { _id: 'user-5', name: 'Dr. Suresh Reddy', email: 'suresh@hospital2.gov', password: passwordHash, role: 'institutional_admin', institutionId: 'inst-2', designation: 'Hospital Administrator', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/men/3.jpg' },
            { _id: 'user-6', name: 'Nurse Kavita Singh', email: 'kavita@hospital1.gov', password: passwordHash, role: 'participant', institutionId: 'inst-1', designation: 'Staff Nurse', department: 'General Ward', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/women/3.jpg' },
            { _id: 'user-7', name: 'Dr. Amit Desai', email: 'amit@hospital1.gov', password: passwordHash, role: 'participant', institutionId: 'inst-1', designation: 'Medical Officer', department: 'Emergency', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/men/4.jpg' },
            { _id: 'user-8', name: 'Pharmacist Meera Nair', email: 'meera@hospital2.gov', password: passwordHash, role: 'participant', institutionId: 'inst-2', designation: 'Pharmacist', department: 'Pharmacy', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/women/4.jpg' },
            { _id: 'user-9', name: 'Lab Technician Ramesh', email: 'ramesh@phc1.gov', password: passwordHash, role: 'participant', institutionId: 'inst-3', designation: 'Lab Technician', department: 'Laboratory', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/men/5.jpg' },
            { _id: 'user-10', name: 'Dr. Lakshmi Iyer', email: 'lakshmi@hospital1.gov', password: passwordHash, role: 'participant', institutionId: 'inst-1', designation: 'Senior Medical Officer', department: 'Pediatrics', isApproved: true, profilePicture: 'https://randomuser.me/api/portraits/women/5.jpg' }
        ];
        await User.insertMany(users);
        console.log(`Inserted ${users.length} users`);

        // 3. Halls
        const halls = [
            { _id: 'hall-1', name: 'Main Conference Hall', location: 'DMO Building - Ground Floor', capacity: 100 },
            { _id: 'hall-2', name: 'Training Room A', location: 'DMO Building - First Floor', capacity: 50 },
            { _id: 'hall-3', name: 'Training Room B', location: 'DMO Building - First Floor', capacity: 40 },
            { _id: 'hall-4', name: 'Auditorium', location: 'District Hospital Campus', capacity: 200 },
            { _id: 'hall-5', name: 'Community Hall', location: 'CHC North Campus', capacity: 75 }
        ];
        await Hall.insertMany(halls);
        console.log(`Inserted ${halls.length} halls`);

        // 4. Trainings
        const trainings = [
            { _id: 'train-1', title: 'Emergency Response & First Aid', description: 'Comprehensive training on emergency medical response and first aid procedures.', program: 'Emergency Medicine', date: new Date('2026-02-15T00:00:00Z'), startTime: '09:00', endTime: '17:00', hallId: 'hall-1', capacity: 80, trainerId: 'user-2', createdById: 'user-2', status: 'scheduled' },
            { _id: 'train-2', title: 'Infection Control & Prevention', description: 'Training on hospital infection control practices.', program: 'Infection Control', date: new Date('2026-02-20T00:00:00Z'), startTime: '10:00', endTime: '16:00', hallId: 'hall-2', capacity: 45, trainerId: 'user-3', createdById: 'user-3', status: 'scheduled' },
            { _id: 'train-3', title: 'Maternal & Child Health Care', description: 'Best practices in maternal and child healthcare.', program: 'MCH Program', date: new Date('2026-02-10T00:00:00Z'), startTime: '09:30', endTime: '15:30', hallId: 'hall-4', capacity: 150, trainerId: 'user-2', createdById: 'user-2', status: 'scheduled' },
            { _id: 'train-4', title: 'Digital Health Records Management', description: 'Training on electronic health records systems.', program: 'Digital Health', date: new Date('2026-01-25T00:00:00Z'), startTime: '10:00', endTime: '14:00', hallId: 'hall-3', capacity: 30, trainerId: 'user-3', createdById: 'user-3', status: 'completed' },
            { _id: 'train-5', title: 'Tuberculosis Management & DOTS', description: 'Training on TB diagnosis and DOTS implementation.', program: 'TB Control Program', date: new Date('2026-03-05T00:00:00Z'), startTime: '09:00', endTime: '16:00', hallId: 'hall-2', capacity: 40, trainerId: 'user-2', createdById: 'user-2', status: 'scheduled' },
            { _id: 'train-6', title: 'Mental Health First Aid', description: 'Recognizing mental health issues and providing support.', program: 'Mental Health', date: new Date('2026-02-25T00:00:00Z'), startTime: '10:00', endTime: '15:00', hallId: 'hall-5', capacity: 60, trainerId: 'user-3', createdById: 'user-3', status: 'scheduled' }
        ];
        await Training.insertMany(trainings);
        console.log(`Inserted ${trainings.length} trainings`);

        // 5. Nominations
        const nominations = [
            { _id: 'nom-1', trainingId: 'train-1', participantId: 'user-6', institutionId: 'inst-1', status: 'approved', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date() },
            { _id: 'nom-2', trainingId: 'train-1', participantId: 'user-7', institutionId: 'inst-1', status: 'approved', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date() },
            { _id: 'nom-3', trainingId: 'train-1', participantId: 'user-8', institutionId: 'inst-2', status: 'approved', nominatedBy: 'user-5', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date() },
            { _id: 'nom-4', trainingId: 'train-2', participantId: 'user-6', institutionId: 'inst-1', status: 'nominated', nominatedBy: 'user-4', nominatedAt: new Date() },
            { _id: 'nom-5', trainingId: 'train-2', participantId: 'user-10', institutionId: 'inst-1', status: 'approved', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-3', approvedAt: new Date() },
            { _id: 'nom-6', trainingId: 'train-3', participantId: 'user-6', institutionId: 'inst-1', status: 'approved', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date() },
            { _id: 'nom-7', trainingId: 'train-3', participantId: 'user-7', institutionId: 'inst-1', status: 'approved', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date() },
            { _id: 'nom-8', trainingId: 'train-3', participantId: 'user-8', institutionId: 'inst-2', status: 'rejected', nominatedBy: 'user-5', nominatedAt: new Date(), approvedBy: 'user-2', approvedAt: new Date(), rejectionReason: 'Capacity full' },
            { _id: 'nom-9', trainingId: 'train-4', participantId: 'user-7', institutionId: 'inst-1', status: 'attended', nominatedBy: 'user-4', nominatedAt: new Date(), approvedBy: 'user-3', approvedAt: new Date() },
            { _id: 'nom-10', trainingId: 'train-4', participantId: 'user-8', institutionId: 'inst-2', status: 'attended', nominatedBy: 'user-5', nominatedAt: new Date(), approvedBy: 'user-3', approvedAt: new Date() }
        ];
        await Nomination.insertMany(nominations);
        console.log(`Inserted ${nominations.length} nominations`);

        // 6. Attendance
        const attendance = [
            { _id: 'att-1', trainingId: 'train-4', participantId: 'user-7', timestamp: new Date('2026-01-25T10:15:00Z'), method: 'qr', qrData: 'QR_train-4_session-1_user-7' },
            { _id: 'att-2', trainingId: 'train-4', participantId: 'user-8', timestamp: new Date('2026-01-25T10:18:00Z'), method: 'qr', qrData: 'QR_train-4_session-1_user-8' }
        ];
        await Attendance.insertMany(attendance);
        console.log(`Inserted ${attendance.length} attendance records`);

        // 7. Notifications
        const notifications = [
            { _id: 'notif-1', userId: 'user-7', title: 'Training Approved', message: 'Your nomination for Emergency Response training has been approved.', read: false, type: 'success' },
            { _id: 'notif-2', userId: 'user-8', title: 'Training Rejected', message: 'Your nomination for Maternal Health training was rejected due to capacity.', read: false, type: 'error' }
        ];
        await Notification.insertMany(notifications);
        console.log(`Inserted ${notifications.length} notifications`);

        console.log('Seeding complete successfully');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seed();
