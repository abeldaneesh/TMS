const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dmo.gov',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Fetching trainings to get an ID...');
        const trainingsRes = await axios.get(`${API_URL}/trainings`, { headers });
        if (trainingsRes.data.length === 0) {
            console.log('No trainings found to test with.');
            return;
        }
        const trainingId = trainingsRes.data[0].id;
        console.log(`Testing with Training ID: ${trainingId}`);

        console.log('3. Testing Analytics API...');
        try {
            const analytics = await axios.get(`${API_URL}/analytics/training/${trainingId}`, { headers });
            console.log('Analytics: OK');
        } catch (e) {
            console.error('Analytics Failed:', e.response?.status, e.response?.data);
        }

        console.log('4. Testing Nominations API...');
        try {
            const nominations = await axios.get(`${API_URL}/nominations?trainingId=${trainingId}`, { headers });
            console.log('Nominations: OK');
        } catch (e) {
            console.error('Nominations Failed:', e.response?.status, e.response?.data);
        }

        console.log('5. Testing Attendance API...');
        try {
            const attendance = await axios.get(`${API_URL}/attendance?trainingId=${trainingId}`, { headers });
            console.log('Attendance: OK');
        } catch (e) {
            console.error('Attendance Failed:', e.response?.status, e.response?.data);
        }

        console.log('6. Testing Users API...');
        try {
            const users = await axios.get(`${API_URL}/users`, { headers });
            console.log('Users: OK');
        } catch (e) {
            console.error('Users Failed:', e.response?.status, e.response?.data);
        }

        console.log('7. Testing Halls API...');
        try {
            const halls = await axios.get(`${API_URL}/halls`, { headers });
            console.log('Halls: OK');
        } catch (e) {
            console.error('Halls Failed:', e.response?.status, e.response?.data);
        }

    } catch (error) {
        console.error('Setup failed:', error.message);
    }
}

verify();
