const BACKEND_URL = 'http://localhost:3000/api';

async function test() {
    console.log('--- Starting Registration Flow Verification ---');

    const testUser = {
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test Verifier',
        institutionId: 'inst-1'
    };

    try {
        // 1. Register
        console.log(`1. Registering user: ${testUser.email}...`);
        const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        const regData = await regRes.json();
        console.log('Registration Response Status:', regRes.status);
        console.log('Registration Response Body:', regData);

        if (regRes.status !== 201) throw new Error('Registration failed');

        // 2. Attempt Login (should fail)
        console.log('2. Attempting login before approval...');
        const loginRes1 = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });

        const loginData1 = await loginRes1.json();
        console.log('Login 1 Result Status:', loginRes1.status);
        console.log('Login 1 Result Body:', loginData1);

        if (loginRes1.status !== 403 || !loginData1.isPending) {
            throw new Error('Login should have been blocked with 403 Pending');
        }

        // 3. Admin Approval
        console.log('3. Fetching pending users...');
        const pendingRes = await fetch(`${BACKEND_URL}/users/pending`);
        const pendingUsers = await pendingRes.json();
        const userToApprove = pendingUsers.find((u: any) => u.email === testUser.email);

        if (!userToApprove) throw new Error('Registered user not found in pending list');

        console.log(`Approving user ${userToApprove.id}...`);
        const approveRes = await fetch(`${BACKEND_URL}/users/${userToApprove.id}/approve`, {
            method: 'POST'
        });
        const approveData = await approveRes.json();
        console.log('Approval Response Status:', approveRes.status);
        console.log('Approval Response Body:', approveData);

        // 4. Attempt Login (should succeed)
        console.log('4. Attempting login after approval...');
        const loginRes2 = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });

        const loginData2 = await loginRes2.json();
        console.log('Login 2 Result Status:', loginRes2.status);
        console.log('Login 2 Result Body:', loginData2);

        if (loginRes2.status === 200 && loginData2.token) {
            console.log('--- Verification SUCCESSFUL ---');
        } else {
            throw new Error('Login failed after approval');
        }
    } catch (err: any) {
        console.error('--- Verification FAILED ---');
        console.error(err.message);
    }
}

test();
