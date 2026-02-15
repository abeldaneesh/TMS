const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3000/api';
// let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/training-management';

const login = async (email, password) => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        return res.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        throw error;
    }
};

const runVerification = async () => {
    try {
        console.log('1. Logging in as Master Admin...');
        const adminToken = await login('admin@dmo.gov', 'password123');
        console.log('✅ Admin logged in.');

        console.log('2. Fetching Halls...');
        const hallsRes = await axios.get(`${API_URL}/halls`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!hallsRes.data || hallsRes.data.length === 0) {
            throw new Error('No halls found. Please seed data first.');
        }

        const hall = hallsRes.data[0];
        console.log(`✅ Found hall: ${hall.name} (${hall.id})`);

        // Define block details
        const date = new Date();
        date.setDate(date.getDate() + 5);
        const dateStr = date.toISOString().split('T')[0];
        const startTime = '10:00';
        const endTime = '12:00';
        const reason = 'Maintenance / Repair';

        console.log(`3. Blocking Hall for ${reason} on ${dateStr} ${startTime}-${endTime}...`);

        // Use existing HallBlocking API or creating a block directly?
        // Wait, did I check if POST /api/blocks exists?
        // Step 881 showed `hallBlocksApi.create` calls `/api/blocks`.
        // Let's assume the endpoint is correct (I implemented it in a previous task).
        // Actually, let me verify the route for blocks.
        // It was likely implemented in "Implement Strict Hall Scheduling".
        // Let's double check if I have a route for POST /api/blocks or similar.
        // Step 881 used `hallBlocksApi.create`.
        // Let's check `api.ts` again if needed, but I recall it being there.
        // Actually, looking at `api.ts` (Step 873 view), `hallBlocksApi` uses `/hall-blocks`.
        // Wait, usually it's plural.
        // Let's check `server/src/routes/index.ts` or `app.ts` to see the base path.
        // Or check `server/src/routes/hallBlockRoutes.ts`.

        // I'll try `/hall-blocks` based on standard naming, or verify first.

        await axios.post(`${API_URL}/hall-blocks`, {
            hallId: hall.id,
            date: dateStr,
            startTime,
            endTime,
            reason
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Hall blocked successfully.');

        console.log('4. Checking Hall Availability (Generic Check)...');
        const availRes = await axios.get(`${API_URL}/halls/available`, {
            params: { date: dateStr, startTime, endTime },
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const isAvailableInList = availRes.data.some(h => h.id === hall.id);
        if (isAvailableInList) {
            console.error('❌ Hall should NOT be in available list.');
        } else {
            console.log('✅ Hall is correctly missing from available list.');
        }

        console.log('5. Checking Hall Availability details (Specific Check)...');
        const detailsRes = await axios.get(`${API_URL}/halls/${hall.id}/details`, {
            params: { date: dateStr, startTime, endTime },
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('Details Response:', detailsRes.data);

        if (detailsRes.data.isAvailable === false && detailsRes.data.reason === reason && detailsRes.data.type === 'block') {
            console.log('✅ Specific reason returned correctly!');
        } else {
            console.error('❌ Failed to get specific reason.');
            console.log('Expected:', { isAvailable: false, reason, type: 'block' });
            console.log('Got:', detailsRes.data);
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            console.log('Check your API routes. Maybe /hall-blocks or /blocks is incorrect.');
        }
    }
};

runVerification();
