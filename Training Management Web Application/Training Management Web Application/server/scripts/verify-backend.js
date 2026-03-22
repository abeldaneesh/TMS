const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('1. Attempting login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dmo.gov',
            password: 'password123'
        });

        if (loginRes.status === 200 && loginRes.data.token) {
            console.log('Login successful. Token received.');
            const token = loginRes.data.token;

            console.log('2. Fetching trainings...');
            const trainingsRes = await axios.get(`${API_URL}/trainings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Trainings status: ${trainingsRes.status}`);
            console.log(`Trainings count: ${trainingsRes.data.length}`);

            console.log('3. Fetching halls...');
            const hallsRes = await axios.get(`${API_URL}/halls`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Halls status: ${hallsRes.status}`);
            console.log(`Halls count: ${hallsRes.data.length}`);

        } else {
            console.log('Login failed (no token or wrong status).', loginRes.status, loginRes.data);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

verify();
