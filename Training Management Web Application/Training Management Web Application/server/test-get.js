const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'user-1', role: 'program_officer' }, 'your-super-secret-key', { expiresIn: '1h' });
const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:3000/api/nominations/busy-participants?date=2024-05-15', { headers: { Authorization: `Bearer ${token}` } });
        console.log('GET Response:', res.status, res.data);
    } catch (err) {
        if (err.response) console.error('Error Status:', err.response.status, 'Data:', err.response.data);
        else console.error(err.message);
    }
}
test();
