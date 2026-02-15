
async function testLogin() {
    try {
        console.log('Attempting login with admin@dmo.gov...');
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@dmo.gov',
                password: 'admin123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login Successful:', data);
        } else {
            console.log('Login Failed Status:', response.status);
            console.log('Login Failed Data:', data);
        }
    } catch (error) {
        console.error('Login Error:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testLogin();
