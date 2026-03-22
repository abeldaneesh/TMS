const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3000/api';

const run = async () => {
    try {
        console.log('1. Logging in as a participant...');
        // Assuming a participant user exists, or we use admin for testing since logic is based on req.user.userId
        // Let's use the admin account I know works, as admins can also attend trainings technically (or at least have attendance records)
        // Ideally we should use a participant account. 
        // I'll try to register one quickly or just use admin.
        // Let's use the admin for simplicity as I have credentials.
        const loginRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@dmo.gov', password: 'password123' });
        const token = loginRes.data.token;
        const userId = loginRes.data.user.id;
        console.log(`Logged in as ${userId}`);

        console.log('2. Creating a dummy training...');
        const hallsRes = await axios.get(`${API_URL}/halls`, { headers: { Authorization: `Bearer ${token}` } });
        const hallId = hallsRes.data[0].id;

        const trainingRes = await axios.post(`${API_URL}/trainings`, {
            title: 'Attendance Test Training',
            description: 'Testing my attendance',
            program: 'Test Program',
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '11:00',
            hallId: hallId,
            capacity: 10,
            status: 'ongoing',
            trainerId: userId // Self-taught
        }, { headers: { Authorization: `Bearer ${token}` } });

        const trainingId = trainingRes.data.id;
        console.log(`Created training ${trainingId}`);

        console.log('3. Marking attendance...');
        try {
            await axios.post(`${API_URL}/attendance`, {
                trainingId: trainingId,
                method: 'manual'
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log('Attendance marked.');
        } catch (e) {
            if (e.response?.data?.message === 'Attendance already marked') {
                console.log('Attendance was already marked.');
            } else {
                throw e;
            }
        }

        console.log('4. Fetching My Attendance (GET /attendance/my)...');
        const myAttendanceRes = await axios.get(`${API_URL}/attendance/my`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const myAttendance = myAttendanceRes.data;
        console.log(`Found ${myAttendance.length} records.`);

        const record = myAttendance.find(a => a.trainingId?._id === trainingId || a.training?.id === trainingId);

        if (record) {
            console.log('✅ Found the test training in attendance history.');
            console.log('Record details:', {
                id: record.id,
                trainingTitle: record.training?.title,
                method: record.method
            });
        } else {
            console.error('❌ Test training NOT found in attendance history.');
            console.log('Full history:', JSON.stringify(myAttendance, null, 2));
        }

        console.log('5. Cleanup...');
        await axios.delete(`${API_URL}/trainings/${trainingId}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
};

run();
