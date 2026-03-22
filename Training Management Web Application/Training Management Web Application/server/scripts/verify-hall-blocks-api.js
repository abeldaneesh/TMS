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

        console.log('3. Creating a Block...');
        const date = new Date();
        date.setDate(date.getDate() + 10);
        const dateStr = date.toISOString().split('T')[0];

        const createRes = await axios.post(`${API_URL}/hall-blocks`, {
            hallId: hall.id,
            date: dateStr,
            startTime: '14:00',
            endTime: '15:00',
            reason: 'API Test Block'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Create Response:', createRes.data);
        if (!createRes.data.id) {
            console.error('❌ Create response missing `id` field!');
        } else {
            console.log('✅ Create response has `id`.');
        }

        console.log('4. Fetching Blocks...');
        const listRes = await axios.get(`${API_URL}/hall-blocks/${hall.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const myBlock = listRes.data.find(b => b.id === createRes.data.id);
        if (myBlock) {
            console.log('✅ Found block in list with matching `id`.');
            console.log('Block:', myBlock);
        } else {
            console.error('❌ Could not find block with `id` in list.');
            console.log('List:', listRes.data);
        }

        console.log('5. Deleting Block...');
        await axios.delete(`${API_URL}/hall-blocks/${createRes.data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Block deleted.');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
};

run();
