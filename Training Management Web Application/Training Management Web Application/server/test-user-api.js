const axios = require('axios');

async function testApi() {
    try {
        const userId = "3b2ceab5-8364-402a-af6a-33dbce605de4"; // Aaron Roy
        // First, let's login to get a token
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@dmo.gov',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log("Got token");

        // Fetch user details
        const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("User:", userRes.data);

        // Fetch nominations
        const nomsRes = await axios.get(`http://localhost:5000/api/nominations?participantId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Nominations:", nomsRes.data);

        // Fetch attendance
        const attRes = await axios.get(`http://localhost:5000/api/attendance?participantId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Attendance:", attRes.data);

    } catch (err) {
        if (err.response) {
            console.error("API Error:", err.response.status, err.response.data);
        } else {
            console.error("Error:", err.message);
        }
    }
}

testApi();
