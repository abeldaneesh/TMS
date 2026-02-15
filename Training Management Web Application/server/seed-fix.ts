
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // 1. Create Institutions
    const hospital1 = await prisma.institution.upsert({
        where: { id: 'inst-1' },
        update: {},
        create: {
            id: 'inst-1',
            name: 'District General Hospital',
            type: 'Hospital',
            location: 'Main City Center',
        },
    });

    const hospital2 = await prisma.institution.upsert({
        where: { id: 'inst-2' },
        update: {},
        create: {
            id: 'inst-2',
            name: 'Community Health Center - North',
            type: 'CHC',
            location: 'North Zone',
        },
    });

    console.log('Institutions seeded.');

    // 2. Create Users
    const password = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    const officerPassword = await bcrypt.hash('officer123', 10);
    const instPassword = await bcrypt.hash('inst123', 10);
    const partPassword = await bcrypt.hash('part123', 10);

    // Admin
    await prisma.user.upsert({
        where: { email: 'admin@dmo.gov' },
        update: { password: adminPassword },
        create: {
            id: 'user-1',
            email: 'admin@dmo.gov',
            name: 'Dr. Admin Kumar',
            password: adminPassword,
            role: 'master_admin',
        },
    });

    // Program Officer
    await prisma.user.upsert({
        where: { email: 'priya@dmo.gov' },
        update: { password: officerPassword },
        create: {
            id: 'user-2',
            email: 'priya@dmo.gov',
            name: 'Dr. Priya Sharma',
            password: officerPassword,
            role: 'program_officer',
        },
    });

    // Institutional Admin
    await prisma.user.upsert({
        where: { email: 'anjali@hospital1.gov' },
        update: { password: instPassword },
        create: {
            id: 'user-4',
            email: 'anjali@hospital1.gov',
            name: 'Dr. Anjali Patel',
            password: instPassword,
            role: 'institutional_admin',
            institutionId: 'inst-1',
            designation: 'Medical Superintendent',
        },
    });

    // Participant - Kavita
    await prisma.user.upsert({
        where: { email: 'kavita@hospital1.gov' },
        update: { password: partPassword },
        create: {
            id: 'user-6',
            email: 'kavita@hospital1.gov',
            name: 'Nurse Kavita Singh',
            password: partPassword,
            role: 'participant',
            institutionId: 'inst-1',
            designation: 'Staff Nurse',
        },
    });

    console.log('Users seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
