
const fetch = global.fetch || require('node-fetch');

async function verifyNominations() {
    const API_URL = 'http://localhost:3000/api';

    try {
        // 1. Login
        console.log('Logging in as admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@dmo.gov',
                password: 'admin123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token received.');

        // 2. Get Nominations
        console.log('Fetching nominations...');
        const nominationsRes = await fetch(`${API_URL}/nominations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!nominationsRes.ok) {
            throw new Error(`Fetch nominations failed: ${nominationsRes.status} ${nominationsRes.statusText}`);
        }

        const nominations = await nominationsRes.json();
        console.log(`Fetched ${nominations.length} nominations.`);

        if (nominations.length > 0) {
            const firstNom = nominations[0];
            console.log('First nomination sample (keys):', Object.keys(firstNom));
            console.log('participantId:', firstNom.participantId, typeof firstNom.participantId);
            console.log('trainingId:', firstNom.trainingId, typeof firstNom.trainingId);
            console.log('institutionId:', firstNom.institutionId, typeof firstNom.institutionId);

            let success = true;
            if (typeof firstNom.participantId !== 'string') {
                console.error('ERROR: participantId is NOT a string');
                success = false;
            }
            if (typeof firstNom.trainingId !== 'string') {
                console.error('ERROR: trainingId is NOT a string');
                success = false;
            }
            if (typeof firstNom.institutionId !== 'string') {
                console.error('ERROR: institutionId is NOT a string');
                success = false;
            }

            if (success) {
                console.log('VERIFICATION SUCCESS: All IDs are strings.');
            } else {
                console.log('VERIFICATION FAILED: Some IDs are objects or incorrect types.');
            }
        } else {
            console.log('WARNING: No nominations found. Cannot verify data structure.');
        }

    } catch (error) {
        console.error('Verification Error:', error);
    }
}

verifyNominations();
