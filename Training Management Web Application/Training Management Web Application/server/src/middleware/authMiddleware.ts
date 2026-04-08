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
        sessionId?: string | null;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Authentication token is required', code: 'AUTH_TOKEN_REQUIRED' });
        return;
    }

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
        if (err) {
            res.status(401).json({ message: 'Session expired. Please sign in again.', code: 'SESSION_EXPIRED' });
            return;
        }

        try {
            const activeUser = await User.findOne({ _id: user.userId, isDeleted: { $ne: true } })
                .select('_id email role institutionId activeSessionId activeSessionExpiresAt')
                .lean();

            if (!activeUser) {
                res.status(401).json({ message: 'User account is no longer active', code: 'ACCOUNT_INACTIVE' });
                return;
            }

            const sessionExpired = !activeUser.activeSessionExpiresAt || new Date(activeUser.activeSessionExpiresAt) <= new Date();
            if (!user.sessionId || !activeUser.activeSessionId || activeUser.activeSessionId !== user.sessionId || sessionExpired) {
                res.status(401).json({
                    message: 'Your session is no longer active. Please sign in again.',
                    code: 'SESSION_INVALIDATED'
                });
                return;
            }

            req.user = {
                userId: String(activeUser._id),
                email: String(activeUser.email),
                role: String(activeUser.role),
                institutionId: activeUser.institutionId ? String(activeUser.institutionId) : null,
                sessionId: activeUser.activeSessionId ? String(activeUser.activeSessionId) : null,
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
