const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'user-1', role: 'master_admin' }, 'your-super-secret-key', { expiresIn: '1h' });
const axios = require('axios');

async function test() {
    try {
        console.log('Testing GET...');
        const getRes = await axios.get('http://localhost:3000/api/trainings/train-1', { headers: { Authorization: `Bearer ${token}` } });
        console.log('GET OK');

        console.log('Testing PUT...');
        const putRes = await axios.put('http://localhost:3000/api/trainings/train-1',
            { title: 'Updated Title', status: 'scheduled' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('PUT Response:', putRes.status);
    } catch (err) {
        if (err.response) console.error('Error Status:', err.response.status, 'Data:', err.response.data);
        else console.error(err.message);
    }
}
test();
