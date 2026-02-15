const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking HallAvailability table schema...');
        const result = await prisma.$queryRaw`DESCRIBE HallAvailability`;
        console.log(result);

        const encoding = JSON.stringify(result);
        if (!encoding.includes('specificDate')) {
            console.log('Column specificDate missing. Adding it...');
            await prisma.$executeRaw`ALTER TABLE HallAvailability ADD COLUMN specificDate DATETIME(3) NULL`;
            console.log('Column specificDate added.');
        } else {
            console.log('Column specificDate already exists.');
        }

        // Modify dayOfWeek to be nullable
        console.log('Modifying dayOfWeek to be nullable...');
        await prisma.$executeRaw`ALTER TABLE HallAvailability MODIFY COLUMN dayOfWeek INTEGER NULL`;
        console.log('dayOfWeek modified.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
