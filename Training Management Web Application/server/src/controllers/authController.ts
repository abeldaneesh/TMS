import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import PendingUser from '../models/PendingUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../utils/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role, institutionId, designation, phone, department } = req.body;

        // Validation
        if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
            res.status(400).json({ message: 'Only Google (@gmail.com) email addresses are allowed.' });
            return;
        }

        if (!password || password.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters long.' });
            return;
        }

        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Generate 6-digit OTPs
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Email OTP
        const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Mobile OTP

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Remove old pending user if exists
        await PendingUser.deleteMany({ email });

        // Save to Pending storage
        await PendingUser.create({
            email,
            passwordHash: hashedPassword,
            name,
            role: role || 'participant',
            institutionId,
            designation,
            otp,
            phone,
            mobileOtp
        });

        // MOCK SMS LOGGING
        console.log('\n=============================================');
        console.log(`[SMS MOCK] Sending OTP ${mobileOtp} to ${phone}`);
        console.log('=============================================\n');

        // Send OTP via Email
        const emailSent = await sendOTP(email, otp, name);

        if (!emailSent) {
            res.status(500).json({ message: 'Failed to send verification email. Please check server email configs.' });
            return;
        }

        res.status(200).json({
            message: 'An OTP has been sent to your email. Please verify to complete registration.',
            requireVerification: true
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, mobileOtp } = req.body;

        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            res.status(400).json({ message: 'Registration session expired or email not found. Please register again.' });
            return;
        }

        if (pendingUser.otp !== otp) {
            res.status(400).json({ message: 'Invalid Email OTP.' });
            return;
        }

        if (pendingUser.mobileOtp !== mobileOtp) {
            res.status(400).json({ message: 'Invalid Mobile OTP.' });
            return;
        }

        // Create the actual user
        const user = await User.create({
            email: pendingUser.email,
            password: pendingUser.passwordHash,
            name: pendingUser.name,
            role: pendingUser.role,
            institutionId: pendingUser.institutionId,
            designation: pendingUser.designation,
            phone: pendingUser.phone,  // Save the verified phone number
            isApproved: false, // Explicitly set to false indicating manual approval is still required
        });

        // Delete the pending record
        await PendingUser.deleteMany({ email: pendingUser.email });

        res.status(201).json({
            message: 'Email verified successfully! Your account is pending admin approval.',
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Error verifying email' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Check if user is approved
        if (!user.isApproved) {
            res.status(403).json({
                message: 'Your account is pending admin approval. Please contact the administrator.',
                isPending: true
            });
            return;
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role, institutionId: user.institutionId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPassword } = user.toObject();
        // @ts-ignore
        userWithoutPassword.id = user._id;

        res.status(200).json({
            message: 'Login successful',
            token,
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).populate('institutionId').lean() as any;

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Map institutionId to institution to match legacy API structure if needed
        // Prisma: user.institution
        // Mongoose with populate: user.institutionId is the object
        if (user.institutionId) {
            user.institution = user.institutionId;
        }

        const { password, ...userWithoutPassword } = user;
        // Ensure id field is present (Mongoose has _id)
        userWithoutPassword.id = user._id;

        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
};

export const updateDeviceToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { token } = req.body;

        if (!token) {
            res.status(400).json({ message: 'Token is required' });
            return;
        }

        await User.findByIdAndUpdate(userId, { fcmToken: token });

        res.status(200).json({ message: 'Device token registered successfully' });
    } catch (error) {
        console.error('Error updating device token:', error);
        res.status(500).json({ message: 'Error updating device token' });
    }
};
