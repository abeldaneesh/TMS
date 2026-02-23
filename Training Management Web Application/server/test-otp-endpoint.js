const axios = require('axios');

async function test() {
    console.log('Testing OTP Endpoint on Render...');
    try {
        const res = await axios.post('https://dmo-training-api.onrender.com/api/auth/send-otp', {
            email: 'abeldaneesh3@gmail.com'
        });
        console.log('Response:', res.status, res.data);
    } catch (err) {
        if (err.response) {
            console.error('Error Status:', err.response.status, 'Data:', err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
}
test();
