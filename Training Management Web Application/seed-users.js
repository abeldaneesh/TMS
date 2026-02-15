
const axios = require('axios');

const users = [
    {
        email: 'admin@dmo.gov',
        password: 'admin123',
        name: 'Dr. Admin Kumar',
        role: 'master_admin',
        institutionId: null
    },
    {
        email: 'priya@dmo.gov',
        password: 'officer123',
        name: 'Dr. Priya Sharma',
        role: 'program_officer',
        institutionId: null
    },
    {
        email: 'anjali@hospital1.gov',
        password: 'inst123',
        name: 'Dr. Anjali Patel',
        role: 'institutional_admin',
        institutionId: 'inst-1'
    },
    {
        email: 'kavita@hospital1.gov',
        password: 'part123',
        name: 'Nurse Kavita Singh',
        role: 'participant',
        institutionId: 'inst-1'
    }
];

const institutions = [
    {
        id: 'inst-1',
        name: 'District General Hospital',
        type: 'Hospital',
        location: 'Main City Center'
    }
    // Add more if needed, but we need at least one for the institutional admin/participant
];

async function seed() {
    console.log('Starting seed...');

    // 1. Create Institution (if endpoints exist, otherwise we might need to rely on direct DB or just nullable institutionId)
    // The current authController register endpoint accepts institutionId but doesn't check if it exists in DB? 
    // Prisma schema probably has a foreign key. 
    // Wait, the API doesn't have an endpoint to create institutions exposed heavily.
    // Let's check if we can register users without institutionId first or if it fails.

    // Actually, let's try to just register the Admin first.
    try {
        console.log('Registering Admin...');
        await axios.post('http://localhost:3000/api/auth/register', users[0]);
        console.log('Admin Registered');
    } catch (e) {
        console.log('Admin registration failed (maybe already exists):', e.response?.data?.message || e.message);
    }

    try {
        console.log('Registering Program Officer...');
        await axios.post('http://localhost:3000/api/auth/register', users[1]);
        console.log('Program Officer Registered');
    } catch (e) {
        console.log('PO registration failed:', e.response?.data?.message || e.message);
    }

    // We can't register inst-admin or participant if institution doesn't exist and FK is enforced.
    // But let's try.

    try {
        console.log('Registering Participant...');
        await axios.post('http://localhost:3000/api/auth/register', users[3]);
        console.log('Participant Registered');
    } catch (e) {
        console.log('Participant registration failed:', e.response?.data?.message || e.message);
    }
}

seed();
