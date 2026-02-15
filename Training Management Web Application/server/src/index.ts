import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import { PrismaClient } from '@prisma/client';

dotenv.config();

import authRoutes from './routes/authRoutes';
import trainingRoutes from './routes/trainingRoutes';
import nominationRoutes from './routes/nominationRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import hallBlockRoutes from './routes/hallBlockRoutes';
import hallRequestRoutes from './routes/hallRequestRoutes';

import institutionRoutes from './routes/institutionRoutes';
import hallRoutes from './routes/hallRoutes';
import uploadRoutes from './routes/uploadRoutes';
import path from 'path';
import fs from 'fs';

const app = express();
// const prisma = new PrismaClient(); // Removed Prisma

const PORT = parseInt(process.env.PORT || '3000', 10);

const allowedOrigins = [
    'http://localhost',
    'http://localhost:5173',
    'http://192.168.1.36:5173',
    'http://127.0.0.1:5173',
    'http://10.0.2.2'
];

const corsOptions: cors.CorsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'bypass-tunnel-reminder'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Enhanced logging to debug CORS/Preflight
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url} | Origin: ${req.headers.origin} | Bypass-Header: ${req.headers['bypass-tunnel-reminder']}`);
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/nominations', nominationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/hall-blocks', hallBlockRoutes);
app.use('/api/hall-requests', hallRequestRoutes);
app.use('/api/uploads', uploadRoutes);

// Static files serving
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

import connectDB from './config/db';

async function main() {
    try {
        await connectDB();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
