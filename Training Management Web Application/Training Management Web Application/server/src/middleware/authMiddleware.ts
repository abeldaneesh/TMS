import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
        institutionId?: string | null;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
        if (err) {
            res.sendStatus(403);
            return;
        }

        try {
            const activeUser = await User.findOne({ _id: user.userId, isDeleted: { $ne: true } })
                .select('_id email role institutionId')
                .lean();

            if (!activeUser) {
                res.status(403).json({ message: 'User account is no longer active' });
                return;
            }

            req.user = {
                userId: String(activeUser._id),
                email: String(activeUser.email),
                role: String(activeUser.role),
                institutionId: activeUser.institutionId ? String(activeUser.institutionId) : null,
            };
            next();
        } catch (lookupError) {
            res.status(500).json({ message: 'Authentication lookup failed' });
        }
    });
};

export const authorizeRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.sendStatus(403);
            return;
        }

        next();
    };
};
