import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role, institutionId, designation, phone, department } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            role: role || 'participant',
            institutionId,
            designation,
            phone,
            department,
            isApproved: false, // Explicitly set to false (also default)
        });

        res.status(201).json({
            message: 'Registration successful! Your account is pending admin approval.',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isApproved: user.isApproved,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
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

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
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
