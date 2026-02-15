const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3000/api';

const login = async (email, password) => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        return res.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        throw error;
    }
};

const run = async () => {
    try {
        console.log('1. Logging in...');
        const token = await login('admin@dmo.gov', 'password123');

        console.log('2. Fetching Halls...');
        const hallsRes = await axios.get(`${API_URL}/halls`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const hall = hallsRes.data[0];
        console.log(`Using hall: ${hall.name} (${hall.id})`);

        console.log('3. Creating a Training...');
        const date = new Date();
        date.setDate(date.getDate() + 15); // Future date

        const createRes = await axios.post(`${API_URL}/trainings`, {
            title: 'Verification Training',
            description: 'Testing details page API',
            program: 'Test Program',
            date: date.toISOString().split('T')[0],
            startTime: '10:00',
            endTime: '12:00',
            hallId: hall.id,
            capacity: 20,
            trainerId: 'user-123',
            status: 'scheduled'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const trainingId = createRes.data.id;
        console.log(`Training created with ID: ${trainingId}`);

        console.log(`4. Fetching Training Details (GET /trainings/${trainingId})...`);
        const detailRes = await axios.get(`${API_URL}/trainings/${trainingId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const training = detailRes.data;
        console.log('Training Details:', {
            id: training.id,
            title: training.title,
            hall: training.hall || training.hallId, // Check how it matches
            creator: training.creator || training.createdById // Check how it matches
        });

        if (training.title === 'Verification Training' && training.id === trainingId) {
            console.log('✅ Fetched correct training details.');
        } else {
            console.error('❌ Mismatch in fetched details.');
        }

        if (training.hall?.name || training.hallId?.name) {
            console.log('✅ Hall details populated.');
        } else {
            console.error('❌ Hall details NOT populated (only ID?).');
        }

        console.log('5. Deleting Training...');
        await axios.delete(`${API_URL}/trainings/${trainingId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Training deleted.');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
};

run();
