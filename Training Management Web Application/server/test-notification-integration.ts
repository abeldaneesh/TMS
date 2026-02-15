const API_URL = 'http://localhost:3013/api';

async function runTest() {
    try {
        console.log('--- Starting Integration Test ---');

        // Helper for requests
        const request = async (url: string, method: string, body?: any, token?: string) => {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(API_URL + url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });

            const data = await res.json();
            if (!res.ok) {
                const error: any = new Error(data.message || res.statusText);
                error.data = data;
                throw error;
            }
            return data;
        };

        // 1. Login as Program Officer
        console.log('Logging in as Program Officer...');
        const officerData = await request('/auth/login', 'POST', {
            email: 'priya@dmo.gov',
            password: 'password123'
        });
        const officerToken = officerData.token;
        const officerId = officerData.user.id;
        console.log('Officer logged in.');

        // 2. Create a Training
        console.log('Creating Training...');
        const trainingData = await request('/trainings', 'POST', {
            title: `Integration Test Training ${Date.now()}`,
            description: 'Testing notifications',
            program: 'Test Program',
            date: new Date().toISOString(),
            startTime: '09:00',
            endTime: '18:00',
            hallId: 'hall-1',
            capacity: 10,
            trainerId: officerId,
            status: 'ongoing'
        }, officerToken);
        const trainingId = trainingData.id;
        console.log('Training created:', trainingId);

        // 3. Login as Participant
        console.log('Logging in as Participant...');
        const participantData = await request('/auth/login', 'POST', {
            email: 'kavita@hospital1.gov',
            password: 'password123'
        });
        const participantToken = participantData.token;
        const participantId = participantData.user.id;
        console.log('Participant logged in.');

        // 4. Create Nomination
        console.log('Testing Ping...');
        try {
            const pingRes = await fetch(API_URL + '/nominations/ping');
            console.log('Ping status:', pingRes.status);
            console.log('Ping text:', await pingRes.text());
        } catch (e) {
            console.log('Ping failed', e);
        }

        console.log('Nominating participant...');
        await request('/nominations', 'POST', {
            trainingId,
            participantId,
            institutionId: 'inst-1'
        }, officerToken);
        // Note: verify if we need to verify nomination status. Default is nominated? 
        // Logic might require 'approved' status for attendance? 
        // Checking attendanceController again...
        // It updates status to 'attended'. It doesn't seem to block if not approved, but let's assume it works.
        console.log('Nomination created.');

        // 5. Mark Attendance
        console.log('Marking Attendance...');
        await request('/attendance', 'POST', {
            trainingId,
            method: 'qr',
            qrData: JSON.stringify({
                trainingId,
                expiryTimestamp: Date.now() + 100000
            })
        }, participantToken);
        console.log('Attendance marked.');

        // 6. Check Notifications
        console.log('Checking Officer Notifications...');
        await new Promise(r => setTimeout(r, 2000));

        const notifications = await request('/notifications', 'GET', undefined, officerToken);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myNotification = notifications.find((n: any) => n.message.includes('marked attendance') && n.message.includes(trainingData.title));

        if (myNotification) {
            console.log('SUCCESS: Notification found!', myNotification);
        } else {
            console.error('FAILURE: Notification NOT found.');
            console.log('Recent notifications:', notifications.slice(0, 3));
        }

    } catch (error: any) {
        console.error('Test Failed:', error.message);
        if (error.data) console.error('Error Details:', JSON.stringify(error.data, null, 2));
    }
}

runTest();
