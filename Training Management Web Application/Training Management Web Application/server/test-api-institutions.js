const axios = require('axios');

async function testApi() {
    try {
        console.log('Testing /api/institutions...');
        const response = await axios.get('http://localhost:3000/api/institutions');
        console.log('Status:', response.status);
        console.log('Data Type:', typeof response.data);
        console.log('Is Array:', Array.isArray(response.data));
        console.log('Count:', response.data.length);
        console.log('First Item:', JSON.stringify(response.data[0], null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

testApi();
