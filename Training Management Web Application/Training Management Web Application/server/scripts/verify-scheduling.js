const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function runVerification() {
    try {
        console.log('1. Logging in as Admin...');
        // Assuming there's an admin user seeded. If not, this might fail.
        // I'll try with a known admin email from seed or previous context.
        // "admin@dmo.gov" / "admin123" is common.
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dmo.gov',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Getting a Hall ID...');
        const hallsRes = await axios.get(`${API_URL}/halls`, { headers });
        const hall = hallsRes.data[0];
        if (!hall) throw new Error('No halls found');
        const hallId = hall.id || hall._id;
        console.log(`Using Hall: ${hall.name} (${hallId})`);

        // Date for testing: Tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        console.log(`Testing for date: ${dateStr}`);

        // 3. Create a Block (10:00 - 12:00)
        console.log('3. Creating Admin Block (10:00 - 12:00)...');
        try {
            await axios.post(`${API_URL}/hall-blocks`, {
                hallId,
                date: dateStr,
                startTime: '10:00',
                endTime: '12:00',
                reason: 'Maintenance'
            }, { headers });
            console.log('Block created successfully.');
        } catch (e) {
            console.log('Block creation failed (might already exist):', e.response?.data?.message || e.message);
            // Verify if exists?
        }

        // 4. Try to Create Overlapping Training (11:00 - 13:00) -> Should Fail
        console.log('4. Attempting Overlapping Training (11:00 - 13:00)...');
        try {
            await axios.post(`${API_URL}/trainings`, {
                title: 'Test Training',
                description: 'Should fail',
                program: 'Test',
                date: dateStr,
                startTime: '11:00',
                endTime: '13:00',
                hallId,
                capacity: 10,
                trainerId: 'some-trainer-id-mock', // Validation might generic
                requiredInstitutions: []
            }, { headers });
            console.error('ERROR: Training creation SUCCEEDED but should have FAILED.');
        } catch (e) {
            if (e.response && (e.response.status === 409 || e.response.status === 403 || e.response.status === 400)) {
                console.log('Training creation failed as expected:', e.response.data.message);
            } else {
                console.error('Training creation failed with unexpected error:', e.message);
            }
        }

        // 5. Try to Create Overlapping Block (09:00 - 11:00) -> Should Fail
        console.log('5. Attempting Overlapping Block (09:00 - 11:00)...');
        try {
            await axios.post(`${API_URL}/hall-blocks`, {
                hallId,
                date: dateStr,
                startTime: '09:00',
                endTime: '11:00',
                reason: 'Overlap Test'
            }, { headers });
            console.error('ERROR: Block creation SUCCEEDED but should have FAILED.');
        } catch (e) {
            if (e.response && (e.response.status === 409 || e.response.status === 403 || e.response.status === 400)) {
                console.log('Block creation failed as expected:', e.response.data.message);
            } else {
                console.error('Block creation failed with unexpected error:', e.message);
            }
        }

        // 6. Check Availability API (10:00 - 12:00) -> Should NOT return this hall
        console.log('6. Checking Availability API (10:00 - 12:00)...');
        const availRes = await axios.get(`${API_URL}/halls/available`, {
            params: {
                date: dateStr,
                startTime: '10:00',
                endTime: '12:00'
            },
            headers
        });
        const availableHalls = availRes.data;
        const isAvailable = availableHalls.some(h => h.id === hallId || h._id === hallId);
        if (isAvailable) {
            console.error('ERROR: Hall is listed as AVAILABLE but should be BLOCKED.');
        } else {
            console.log('Hall correctly NOT listed in available halls.');
        }

        // Cleanup: Delete the block?
        // Need block ID.
        // Fetch blocks first
        console.log('7. Cleaning up...');
        const blocksRes = await axios.get(`${API_URL}/hall-blocks/${hallId}?date=${dateStr}`, { headers });
        const blocks = blocksRes.data;
        if (blocks.length > 0) {
            const blockId = blocks[0].id || blocks[0]._id;
            await axios.delete(`${API_URL}/hall-blocks/${blockId}`, { headers });
            console.log('Block deleted.');
        }

        console.log('Verification Complete.');

    } catch (error) {
        console.error('Verification failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

runVerification();
