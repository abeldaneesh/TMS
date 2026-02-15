import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const sqlPath = path.join(__dirname, 'full_database_dump.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Basic comments removal
    const lines = sqlContent.split('\n').filter(line => !line.trim().startsWith('--'));
    const cleanedSql = lines.join('\n');

    const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (const [index, statement] of statements.entries()) {
        try {
            // console.log(`Executing statement ${index + 1}: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
            console.log(`Statement ${index + 1} Success`);
        } catch (error) {
            console.error(`Error executing statement ${index + 1}:`);
            console.error(statement);
            console.error('Error details:', error);
        }
    }

    console.log('Database restoration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
