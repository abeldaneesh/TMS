const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        // 1. Login as Program Officer (assuming one exists or using admin for test)
        // Ideally we need a program officer user. Let's try logging in as admin first which also has rights.
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dmo.gov',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create a test training
        console.log('2. Creating a test training...');
        const trainingRes = await axios.post(`${API_URL}/trainings`, {
            title: 'Test Training for Status Update',
            description: 'Testing status changes',
            program: 'Test Program',
            date: new Date().toISOString(),
            startTime: '10:00',
            endTime: '12:00',
            hallId: 'hall-1', // Assuming a hall exists, mock or real
            capacity: 20,
            trainerId: loginRes.data.user.id
        }, { headers });

        const trainingId = trainingRes.data.id;
        console.log(`Created Training ID: ${trainingId} with Status: ${trainingRes.data.status}`);

        // 3. Mark as Completed
        console.log('3. Marking as Completed...');
        const completeRes = await axios.patch(`${API_URL}/trainings/${trainingId}/status`, {
            status: 'completed'
        }, { headers });
        console.log(`New Status: ${completeRes.data.status}`);

        if (completeRes.data.status !== 'completed') {
            console.error('Failed to mark as completed');
        }

        // 4. Create another training to cancel
        console.log('4. Creating another test training for cancellation...');
        const training2Res = await axios.post(`${API_URL}/trainings`, {
            title: 'Test Training for Cancellation',
            description: 'Testing cancellation',
            program: 'Test Program',
            date: new Date().toISOString(),
            startTime: '14:00',
            endTime: '16:00',
            hallId: 'hall-1',
            capacity: 20,
            trainerId: loginRes.data.user.id
        }, { headers });
        const trainingId2 = training2Res.data.id;

        // 5. Cancel Training
        console.log('5. Cancelling Training...');
        const cancelRes = await axios.patch(`${API_URL}/trainings/${trainingId2}/status`, {
            status: 'cancelled'
        }, { headers });
        console.log(`New Status: ${cancelRes.data.status}`);

        if (cancelRes.data.status !== 'cancelled') {
            console.error('Failed to cancel');
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
}

verify();
