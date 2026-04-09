import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import PendingUser from '../models/PendingUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sendOTP } from '../utils/emailService';
import { normalizeEmail, validateEmailAddress } from '../utils/emailValidation';
import Notification from '../models/Notification';
import { createAndSendNotification } from '../utils/notificationUtils';
import {
    buildSessionLeaseExpiry,
    JWT_SESSION_DURATION_MS,
    SESSION_CLOSE_GRACE_MS,
} from '../utils/sessionLease';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BLOCKED_LOGIN_NOTIFICATION_TITLE = 'Another device tried to sign in';
const BLOCKED_LOGIN_NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
const normalizePhoneNumber = (value?: string) => value ? value.replace(/\D/g, '') : '';
const isValidPhoneNumber = (value?: string) => !value || normalizePhoneNumber(value).length === 10;

const sanitizeUser = (user: any) => {
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    userWithoutPassword.id = user._id;
    return userWithoutPassword;
};

const notifyBlockedLoginAttempt = async (userId: string) => {
    const cooldownThreshold = new Date(Date.now() - BLOCKED_LOGIN_NOTIFICATION_COOLDOWN_MS);
    const recentSimilarNotification = await Notification.findOne({
        userId,
        title: BLOCKED_LOGIN_NOTIFICATION_TITLE,
        type: 'warning',
        createdAt: { $gte: cooldownThreshold },
    })
        .select('_id')
        .lean();

    if (recentSimilarNotification) {
        return;
    }

    await createAndSendNotification({
        userId,
        title: BLOCKED_LOGIN_NOTIFICATION_TITLE,
        message: 'Someone just tried to use this account from another device, but the sign-in was blocked because your session is still active. If this was not you, please log out and change your password.',
        type: 'warning',
        actionUrl: '/dashboard',
    });
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role, institutionId, designation, department, phone } = req.body;
        const emailValidation = await validateEmailAddress(email);
        const normalizedEmail = emailValidation.email;
        const normalizedPhone = normalizePhoneNumber(phone);

        // Validation
        if (!emailValidation.isValid) {
            res.status(400).json({ message: emailValidation.message });
            return;
        }

        if (!password || password.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters long.' });
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
            return;
        }

        // Duplicate check removed (redundant)

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Check if user has already verified their email in the separate inline step
        const verifiedPendingUser = await PendingUser.findOne({ email: normalizedEmail, isVerified: true });

        if (!verifiedPendingUser) {
            res.status(400).json({ message: 'You must verify your email before registering.' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the actual user
        const user = await User.create({
            email: normalizedEmail,
            password: hashedPassword,
            name,
            role: role || 'participant',
            institutionId,
            designation,
            department,
            phone: normalizedPhone,
            isApproved: false, // Explicitly set to false indicating manual approval is still required
        });

        // Delete the pending record
        await PendingUser.deleteMany({ email: normalizedEmail });

        res.status(201).json({
            message: 'Registration complete! Your account is pending admin approval.',
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

export const sendEmailOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const emailValidation = await validateEmailAddress(email);
        const normalizedEmail = emailValidation.email;

        if (!emailValidation.isValid) {
            res.status(400).json({ message: emailValidation.message });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Remove old pending user if exists
        await PendingUser.deleteMany({ email: normalizedEmail });

        // Save to Pending storage (only email and OTP)
        await PendingUser.create({
            email: normalizedEmail,
            otp,
            isVerified: false
        });

        // Send OTP via Email
        const emailSent = await sendOTP(normalizedEmail, otp, 'User');

        if (!emailSent) {
            res.status(500).json({ message: 'Failed to send verification email. Please check server email configs.' });
            return;
        }

        res.status(200).json({ message: 'Verification code sent to your email.' });
    } catch (error: any) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: error.message || 'Error sending verification code' });
    }
};

export const verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            res.status(400).json({ message: 'Email address is required.' });
            return;
        }

        const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

        if (!pendingUser) {
            res.status(400).json({ message: 'Verification session expired. Please send code again.' });
            return;
        }

        if (pendingUser.otp !== otp) {
            res.status(400).json({ message: 'Invalid Verification Code.' });
            return;
        }

        // Mark as verified but do NOT create the user yet
        pendingUser.isVerified = true;
        await pendingUser.save();

        res.status(200).json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Error verifying email' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const deviceId = String(req.body?.deviceId || '').trim();
        const normalizedEmail = normalizeEmail(email);

        if (!deviceId) {
            res.status(400).json({
                message: 'Device identifier is required for login.',
                code: 'DEVICE_ID_REQUIRED'
            });
            return;
        }

        // Find user
        const user = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });

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

        const now = new Date();
        const sessionId = uuidv4();
        const sessionExpiresAt = buildSessionLeaseExpiry();

        const sessionBoundUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                $or: [
                    { activeSessionId: { $exists: false } },
                    { activeSessionId: null },
                    { activeSessionExpiresAt: { $exists: false } },
                    { activeSessionExpiresAt: { $lte: now } },
                    { activeSessionDeviceId: deviceId },
                ],
            },
            {
                $set: {
                    activeSessionId: sessionId,
                    activeSessionDeviceId: deviceId,
                    activeSessionStartedAt: now,
                    activeSessionExpiresAt: sessionExpiresAt,
                },
            },
            { new: true }
        );

        if (!sessionBoundUser) {
            void notifyBlockedLoginAttempt(String(user._id)).catch((notificationError) => {
                console.error('Blocked login notification error:', notificationError);
            });

            res.status(409).json({
                message: 'This account is already signed in on another device. Please log out from that device first.',
                code: 'ACCOUNT_IN_USE'
            });
            return;
        }

        // Generate token
        const token = jwt.sign(
            {
                userId: sessionBoundUser._id,
                email: sessionBoundUser.email,
                role: sessionBoundUser.role,
                institutionId: sessionBoundUser.institutionId,
                sessionId,
            },
            JWT_SECRET,
            { expiresIn: Math.floor(JWT_SESSION_DURATION_MS / 1000) }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: sanitizeUser(sessionBoundUser),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } }).populate('institutionId').lean() as any;

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

        // 1. Remove this token from ANY other user first to ensure uniqueness
        // This prevents multiple users from getting notifications on the same device
        await User.updateMany(
            { fcmToken: token, _id: { $ne: userId } },
            { $unset: { fcmToken: "" } }
        );

        // 2. Assign token to the current user
        await User.findByIdAndUpdate(userId, { fcmToken: token });

        res.status(200).json({ message: 'Device token registered successfully' });
    } catch (error) {
        console.error('Error updating device token:', error);
        res.status(500).json({ message: 'Error updating device token' });
    }
};

export const refreshSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            res.status(401).json({
                message: 'Your session is no longer active. Please sign in again.',
                code: 'SESSION_INVALIDATED',
            });
            return;
        }

        const nextExpiry = buildSessionLeaseExpiry();

        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, activeSessionId: sessionId, isDeleted: { $ne: true } },
            { $set: { activeSessionExpiresAt: nextExpiry } },
            { new: true }
        )
            .select('activeSessionExpiresAt')
            .lean();

        if (!updatedUser?.activeSessionExpiresAt) {
            res.status(401).json({
                message: 'Your session is no longer active. Please sign in again.',
                code: 'SESSION_INVALIDATED',
            });
            return;
        }

        res.status(200).json({
            message: 'Session refreshed',
            expiresAt: updatedUser.activeSessionExpiresAt,
        });
    } catch (error) {
        console.error('Session refresh error:', error);
        res.status(500).json({ message: 'Error refreshing session' });
    }
};

export const markSessionClosing = async (req: Request, res: Response): Promise<void> => {
    try {
        const rawToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

        if (!rawToken) {
            res.status(200).json({ message: 'No session token supplied' });
            return;
        }

        const decoded = jwt.verify(rawToken, JWT_SECRET) as {
            userId?: string;
            sessionId?: string;
        };

        if (!decoded.userId || !decoded.sessionId) {
            res.status(200).json({ message: 'Session closing signal ignored' });
            return;
        }

        await User.findOneAndUpdate(
            {
                _id: decoded.userId,
                activeSessionId: decoded.sessionId,
                isDeleted: { $ne: true },
            },
            {
                $set: {
                    activeSessionExpiresAt: buildSessionLeaseExpiry(Date.now(), SESSION_CLOSE_GRACE_MS),
                }
            }
        );

        res.status(200).json({ message: 'Session marked for graceful close' });
    } catch (error) {
        if ((error as Error).name !== 'JsonWebTokenError' && (error as Error).name !== 'TokenExpiredError') {
            console.error('Session closing signal error:', error);
        }

        res.status(200).json({ message: 'Session closing signal ignored' });
    }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const sessionId = req.user?.sessionId;

        const sessionFilter = sessionId
            ? { _id: userId, activeSessionId: sessionId }
            : { _id: userId };

        // Clear the device token and active session on logout
        await User.findOneAndUpdate(sessionFilter, {
            $unset: {
                fcmToken: "",
                activeSessionId: "",
                activeSessionDeviceId: "",
                activeSessionStartedAt: "",
                activeSessionExpiresAt: "",
            }
        });

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
};

export const debugFcm = async (req: Request, res: Response): Promise<void> => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({ message: 'User not found' }); return;
        }

        if (!user.fcmToken) {
            res.status(400).json({ message: 'User has no FCM Token stored' }); return;
        }

        const admin = require('../config/firebase').default;

        const message = {
            notification: {
                title: 'Test FCM Delivery',
                body: 'If you see this, FCM routing from Render to Firebase to Android is working successfully!',
            },
            android: {
                priority: 'high' as const,
                notification: {
                    channelId: 'dmo_alerts_v3',
                    sound: 'notification',
                    priority: 'high' as const,
                    visibility: 'public' as const,
                    clickAction: 'FCM_PLUGIN_ACTIVITY',
                }
            },
            token: user.fcmToken,
        };

        const response = await admin.messaging().send(message);

        res.status(200).json({
            success: true,
            messageId: response,
            token: user.fcmToken.substring(0, 10) + '...',
            note: 'FCM successfully accepted the payload'
        });
    } catch (error: any) {
        console.error('Debug FCM Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const testEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.query;
        const targetEmail = (email as string) || process.env.EMAIL_USER || 'test@example.com';

        console.log(`[Diagnostic] Attempting SMTP test to ${targetEmail}...`);

        // We use the same sendOTP utility to test the real flow
        const result = await sendOTP(targetEmail, '123456', 'Diagnostic Test');

        res.status(200).json({
            success: true,
            message: 'Diagnostic email sent successfully!',
            target: targetEmail,
            config: {
                user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}...` : 'not set',
                passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
            }
        });
    } catch (error: any) {
        console.error('[Diagnostic] SMTP Test Failed:', error);
        res.status(500).json({
            success: false,
            message: 'SMTP Diagnostic Failed',
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
    }
};
