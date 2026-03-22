const axios = require('axios');

async function testLoop() {
    console.log('Waiting for Render deployment to finish and testing OTP Endpoint...');
    let attempts = 0;
    while (attempts < 20) {
        try {
            const res = await axios.post('https://dmo-training-api.onrender.com/api/auth/send-otp', {
                email: 'abeldaneesh@gmail.com'
            });
            console.log('Success!', res.status, res.data);
            break;
        } catch (err) {
            if (err.response) {
                const msg = err.response.data.message || '';
                console.log(`Attempt ${attempts}: ${msg}`);
                if (msg.includes('Resend Error') || msg.includes('Missing API key')) {
                    console.log('Found explicit Error:', msg);
                    break;
                }
            } else {
                console.error('Error:', err.message);
            }
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
testLoop();
