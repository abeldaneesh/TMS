
const http = require('http');

function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Request failed: ${res.statusCode} ${body}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function getRequest(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Request failed: ${res.statusCode} ${body}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in...');
        const loginData = await postRequest('/auth/login', JSON.stringify({
            email: 'admin@dmo.gov',
            password: 'password123'
        }));
        const token = loginData.token;
        console.log('Login successful.');

        console.log('Fetching nominations...');
        const nominations = await getRequest('/nominations', token);
        console.log(`Fetched ${nominations.length} nominations.`);

        if (nominations.length > 0) {
            const first = nominations[0];
            console.log('Sample:', JSON.stringify(first, null, 2));

            if (typeof first.participantId === 'string' &&
                typeof first.trainingId === 'string' &&
                typeof first.institutionId === 'string') {
                console.log('SUCCESS: IDs are strings.');
            } else {
                console.log('FAILURE: IDs are objects (populated) or missing.');
                console.log('participantId type:', typeof first.participantId);
            }

            // Check if populated data is also there
            if (first.participant && first.participant.name) {
                console.log('SUCCESS: Populated data (participant) is present.');
            } else {
                console.log('FAILURE: Populated data is missing.');
            }

        } else {
            console.log('No nominations to check.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
