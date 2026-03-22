import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Prisma verification...');

    // 1. Create Hall
    const hall = await prisma.hall.create({
        data: { name: 'Direct Test Hall', location: 'Direct Loc', capacity: 10 }
    });
    console.log('Created Hall:', hall.id);

    // 2. Add Availability
    try {
        if (!prisma.hallAvailability) {
            throw new Error('prisma.hallAvailability is undefined!');
        }

        const availability = await prisma.hallAvailability.create({
            data: {
                hallId: hall.id,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00'
            }
        });
        console.log('Created Availability:', availability);
    } catch (e) {
        console.error('Prisma Error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
