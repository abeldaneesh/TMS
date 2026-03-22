import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating existing users to isApproved: true...');
    const result = await prisma.user.updateMany({
        where: {
            isApproved: false // Since they were just created with default false
        },
        data: {
            isApproved: true
        }
    });
    console.log(`Updated ${result.count} users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
