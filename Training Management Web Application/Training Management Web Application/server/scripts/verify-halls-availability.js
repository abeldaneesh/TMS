const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function runVerification() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dmo.gov',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Getting a Hall...');
        const hallsRes = await axios.get(`${API_URL}/halls`, { headers });
        const hall = hallsRes.data[0];
        if (!hall) throw new Error('No halls found');
        console.log(`Using Hall: ${hall.name} (${hall.id})`);

        console.log('3. Adding Availability Slot...');
        const addRes = await axios.post(`${API_URL}/halls/${hall.id || hall._id}/availability`, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00'
        }, { headers });
        console.log('Added Slot:', addRes.data);

        console.log('4. Fetching Availability...');
        const availRes = await axios.get(`${API_URL}/halls/${hall.id || hall._id}/availability`, { headers });
        const slots = availRes.data;
        console.log('Fetched Slots Count:', slots.length);
        if (slots.length > 0) {
            console.log('Sample Slot Keys:', Object.keys(slots[0]));
            console.log('Sample Slot ID:', slots[0].id);
            console.log('Sample Slot _ID:', slots[0]._id);
        }

        if (slots.length > 0) {
            const slot = slots[slots.length - 1]; // Use the last one (likely the one we added)
            const slotId = slot.id || slot._id;
            console.log(`Attempting to remove slot with ID: ${slotId}`);

            if (!slotId) {
                console.error('ERROR: Slot ID is missing!');
            } else {
                try {
                    await axios.delete(`${API_URL}/halls/availability/${slotId}`, { headers });
                    console.log('Slot removed successfully.');
                } catch (delErr) {
                    console.error('Error removing slot:', delErr.response?.data || delErr.message);
                }
            }
        } else {
            console.error('No slots found despite adding one.');
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
}

runVerification();
