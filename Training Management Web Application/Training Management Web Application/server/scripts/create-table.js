const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Creating HallAvailability table...');
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS HallAvailability (
                id VARCHAR(191) NOT NULL,
                hallId VARCHAR(191) NOT NULL,
                dayOfWeek INTEGER NULL,
                specificDate DATETIME(3) NULL,
                startTime VARCHAR(191) NOT NULL,
                endTime VARCHAR(191) NOT NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                PRIMARY KEY (id),
                INDEX HallAvailability_hallId_fkey(hallId),
                CONSTRAINT HallAvailability_hallId_fkey FOREIGN KEY (hallId) REFERENCES Hall(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `;
        console.log('Table created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
