const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load .env file

const API_URL = 'http://localhost:3000/api';
// Using the predefined admin credentials from seed script
const ADMIN_EMAIL = 'admin@dmo.gov';
const ADMIN_PASSWORD = 'password123';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/training-app';

async function verifyHallRequestFlow() {
    console.log('🚀 Starting Hall Request Flow Verification...');
    let client;

    try {
        // 1. connect to mongo to get a hall and user
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db();
        let halls = await db.collection('halls').find().toArray();
        let users = await db.collection('users').find().toArray();

        // Create Hall if missing
        if (halls.length === 0) {
            console.log('⚠️ No halls found. Creating one...');
            const newHall = {
                name: 'Conference Hall',
                capacity: 100,
                location: 'Ground Floor',
                institutionId: 'inst1', // dummy
                availability: true
            };
            const res = await db.collection('halls').insertOne(newHall);
            halls = [{ ...newHall, _id: res.insertedId }];
        }

        // Create Program Officer if missing
        let officer = users.find(u => u.role === 'program_officer');
        if (!officer) {
            console.log('⚠️ No program officer found. Creating one...');
            // Need to verify User model for required fields, but usually:
            const newOfficer = {
                name: 'Test Officer',
                email: 'officer@test.com',
                password: 'password123', // plain text for now if no hash hook in direct db insert, but auth middleware might need hash. 
                // Actually, if I login as admin, I don't need officer login. I just need an officer ID to assign to the request.
                role: 'program_officer',
                institutionId: 'inst1'
            };
            const res = await db.collection('users').insertOne(newOfficer);
            officer = { ...newOfficer, _id: res.insertedId };
        }

        const hall = halls[0];
        console.log(`ℹ️ Using Hall: ${hall.name} (${hall._id})`);
        console.log(`ℹ️ Using User: ${officer.name} (${officer._id})`);

        // 2. Login as Admin to get token
        console.log('\n🔐 Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in.');

        // 3. Create a Confirmed Training to Block the Hall
        console.log('\n📅 Creating a conflicting confirmed training...');
        const date = new Date();
        date.setDate(date.getDate() + 5); // 5 days from now
        const dateStr = date.toISOString().split('T')[0];
        const startTime = '10:00';
        const endTime = '12:00';

        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        // Clean up any existing trainings for this slot
        await db.collection('trainings').deleteMany({
            hallId: hall._id.toString(),
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // Check what's left
        const existingTrainings = await db.collection('trainings').find({
            hallId: hall._id.toString(),
            date: { $gte: startOfDay, $lte: endOfDay }
        }).toArray();
        console.log('👀 Existing Trainings after cleanup:', existingTrainings.length);
        if (existingTrainings.length > 0) console.log(existingTrainings);

        const existingBlocks = await db.collection('hallblocks').find({
            hallId: hall._id.toString(),
            date: { $gte: startOfDay, $lte: endOfDay }
        }).toArray();
        console.log('👀 Existing Blocks:', existingBlocks.length);

        try {
            await axios.post(`${API_URL}/trainings`, {
                title: 'Conflicting Training',
                description: 'This blocks the hall',
                program: 'Test',
                trainingType: 'Test', // some fields might be optional/required depending on model, checking minimal
                targetAudience: 'Test',
                date: dateStr,
                startTime,
                endTime,
                hallId: hall._id,
                capacity: 10,
                trainerId: officer._id // Required field
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Conflicting training created.');
        } catch (e) {
            console.error('❌ Failed to create conflicting training:');
            console.error('Message:', e.response?.data?.message);
            console.error('Error Details:', e.response?.data?.error);
            return;
        }

        // 4. Create a Hall Request (which involves creating a Draft Training first)
        console.log('\n📝 Creating a Draft Training (should succeed despite conflict)...');
        // We'll use the SAME time slot to trigger the "unavailable" logic in frontend, 
        // but here we just directly call the API as the frontend would.

        let draftTraining;
        try {
            const draftRes = await axios.post(`${API_URL}/trainings`, {
                title: 'Requested Training',
                description: 'Need approval',
                program: 'Test',
                targetAudience: 'Test',
                date: dateStr,
                startTime,
                endTime,
                hallId: hall._id,
                capacity: 10,
                trainerId: officer._id, // Required field
                status: 'draft' // Crucial!
            }, {
                headers: { Authorization: `Bearer ${token}` } // Acting as admin/user
            });
            draftTraining = draftRes.data;
            console.log('✅ Draft training created:', draftTraining.id);
        } catch (e) {
            console.error('❌ Failed to create draft training:', e.response?.data || e.message);
            return;
        }

        // 5. Check Availability (Draft should NOT block if we were to check, but we skip this for now to focus on request flow)

        // 6. Create Hall Booking Request
        console.log('\n📨 Creating Hall Booking Request...');
        let request;
        try {
            const reqRes = await axios.post(`${API_URL}/hall-requests`, {
                trainingId: draftTraining.id,
                hallId: hall._id,
                priority: 'urgent',
                remarks: 'Please approve'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            request = reqRes.data;
            console.log('✅ Request created:', request._id);
        } catch (e) {
            console.error('❌ Failed to create request:', e.response?.data || e.message);
            return;
        }

        // 7. Try to Approve Request (Should FAIL because of the Conflicting Training from step 3)
        console.log('\n👮 Admin trying to approve request (Should FAIL due to conflict)...');
        try {
            await axios.patch(`${API_URL}/hall-requests/${request._id}/status`, {
                status: 'approved'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.error('❌ Error: Request was approved but should have failed due to conflict!');
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('✅ Request approval correctly rejected with 409 Conflict.');
            } else {
                console.error('❌ Unexpected error during approval:', e.response?.status, e.response?.data);
            }
        }

        // 8. Delete the Conflicting Training
        console.log('\n🗑️ Deleting the conflicting training...');
        // Find the conflicting training ID first (not the draft)
        const conflict = await db.collection('trainings').findOne({
            title: 'Conflicting Training',
            hallId: hall._id.toString()
        });
        if (conflict) {
            await axios.delete(`${API_URL}/trainings/${conflict._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Conflicting training deleted.');
        } else {
            console.warn('⚠️ Could not find conflicting training to delete.');
        }

        // 9. Approve Request again (Should SUCCEED now)
        console.log('\n👮 Admin approving request again (Should SUCCEED)...');
        try {
            const approveRes = await axios.patch(`${API_URL}/hall-requests/${request._id}/status`, {
                status: 'approved'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Request approved:', approveRes.data.status);

            // Verify Training Status is now Scheduled
            const updatedTraining = await db.collection('trainings').findOne({ _id: draftTraining.id });
            if (updatedTraining.status === 'scheduled') {
                console.log('✅ Associated training status updated to SCHEDULED.');
            } else {
                console.error('❌ Training status mismatch:', updatedTraining.status);
            }

            // Verify Notification
            const notification = await db.collection('notifications').findOne({
                userId: token ? (JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())).userId : null,
                title: 'Hall Request Approved'
            });
            if (notification) {
                console.log('✅ Notification created.');
            } else {
                console.warn('⚠️ Notification not found (check user ID match).');
            }

        } catch (e) {
            console.error('❌ Failed to approve request:', e.response?.data || e.message);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    } finally {
        if (client) await client.close();
    }
}

verifyHallRequestFlow();
