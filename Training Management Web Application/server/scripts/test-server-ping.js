const axios = require('axios');

const checkHealth = async () => {
    console.log('Checking server health...');
    try {
        const res = await axios.get('http://localhost:3000/api/health', { timeout: 2000 });
        console.log('Server is UP:', res.status, res.data);
    } catch (e) {
        console.log('Server is DOWN:', e.message);
    }
};

setInterval(checkHealth, 2000);
