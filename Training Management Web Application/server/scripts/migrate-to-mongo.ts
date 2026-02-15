
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';
import Institution from '../src/models/Institution';
import Hall from '../src/models/Hall';
import Training from '../src/models/Training';
import Nomination from '../src/models/Nomination';
import Attendance from '../src/models/Attendance';
import Notification from '../src/models/Notification';

dotenv.config();

const prisma = new PrismaClient();

const migrate = async () => {
    try {
        console.log('Connecting to databases...');
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/training_db';
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // 1. Migrate Institutions
        console.log('Migrating Institutions...');
        const institutions = await prisma.institution.findMany();
        for (const inst of institutions) {
            await Institution.create({
                _id: inst.id,
                name: inst.name,
                type: inst.type,
                location: inst.location,
                createdAt: inst.createdAt
            });
        }
        console.log(`Migrated ${institutions.length} institutions.`);

        // 2. Migrate Users
        console.log('Migrating Users...');
        const users = await prisma.user.findMany();
        for (const user of users) {
            const userData: any = {
                _id: user.id,
                email: user.email,
                password: user.password,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
                isApproved: user.isApproved,
                designation: user.designation || undefined,
                phone: user.phone || undefined,
                department: user.department || undefined
            };
            if (user.institutionId) {
                userData.institutionId = user.institutionId;
            }
            await User.create(userData);
        }
        console.log(`Migrated ${users.length} users.`);

        // 3. Migrate Halls
        console.log('Migrating Halls...');
        const halls = await prisma.hall.findMany({
            include: { availability: true }
        });
        for (const hall of halls) {
            await Hall.create({
                _id: hall.id,
                name: hall.name,
                location: hall.location,
                capacity: hall.capacity,
                createdAt: hall.createdAt,
                availability: hall.availability.map(a => ({
                    dayOfWeek: a.dayOfWeek ?? undefined,
                    specificDate: a.specificDate ?? undefined,
                    startTime: a.startTime,
                    endTime: a.endTime
                }))
            });
        }
        console.log(`Migrated ${halls.length} halls.`);

        // 4. Migrate Trainings
        console.log('Migrating Trainings...');
        const trainings = await prisma.training.findMany();
        for (const training of trainings) {
            // Need to cast JSON to string array safely
            let requiredInstitutions: string[] = [];
            if (Array.isArray(training.requiredInstitutions)) {
                requiredInstitutions = training.requiredInstitutions as string[];
            }

            await Training.create({
                _id: training.id,
                title: training.title,
                description: training.description,
                program: training.program,
                date: training.date,
                startTime: training.startTime,
                endTime: training.endTime,
                hallId: training.hallId,
                capacity: training.capacity,
                trainerId: training.trainerId,
                createdById: training.createdById,
                status: training.status,
                requiredInstitutions: requiredInstitutions,
                createdAt: training.createdAt
            });
        }
        console.log(`Migrated ${trainings.length} trainings.`);

        // 5. Migrate Nominations
        console.log('Migrating Nominations...');
        const nominations = await prisma.nomination.findMany();
        for (const nom of nominations) {
            await Nomination.create({
                _id: nom.id,
                trainingId: nom.trainingId,
                participantId: nom.participantId,
                institutionId: nom.institutionId,
                status: nom.status,
                nominatedBy: nom.nominatedBy,
                nominatedAt: nom.nominatedAt,
                approvedBy: nom.approvedBy || undefined,
                approvedAt: nom.approvedAt || undefined,
                rejectionReason: nom.rejectionReason || undefined
            });
        }
        console.log(`Migrated ${nominations.length} nominations.`);

        // 6. Migrate Attendance
        console.log('Migrating Attendance...');
        const attendance = await prisma.attendance.findMany();
        for (const att of attendance) {
            await Attendance.create({
                _id: att.id,
                trainingId: att.trainingId,
                participantId: att.participantId,
                timestamp: att.timestamp,
                method: att.method,
                qrData: att.qrData || undefined
            });
        }
        console.log(`Migrated ${attendance.length} attendance records.`);

        // 7. Migrate Notifications
        console.log('Migrating Notifications...');
        const notifications = await prisma.notification.findMany();
        for (const notif of notifications) {
            await Notification.create({
                _id: notif.id,
                userId: notif.userId,
                title: notif.title,
                message: notif.message,
                read: notif.read,
                type: notif.type,
                createdAt: notif.createdAt
            });
        }
        console.log(`Migrated ${notifications.length} notifications.`);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
        await mongoose.disconnect();
    }
};

migrate();
