const axios = require('axios');

async function checkLiveAPI() {
    const url = 'https://dmo-training-api.onrender.com/api/auth/send-otp';
    console.log('Checking Live API:', url);

    try {
        const res = await axios.post(url, {
            email: 'test-check@gmail.com'
        });
        console.log('Response Status:', res.status);
        console.log('Response Data:', res.data);
    } catch (err) {
        if (err.response) {
            console.log('Error Status:', err.response.status);
            console.log('Error Data:', err.response.data);
            console.log('Error Content-Type:', err.response.headers['content-type']);
        } else {
            console.log('Error Message:', err.message);
        }
    }
}

checkLiveAPI();
