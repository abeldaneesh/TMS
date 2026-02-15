import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

// Get notifications for the authenticated user
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;

        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 notifications

        const formattedNotifications = notifications.map(n => ({
            ...n.toObject(),
            id: n._id
        }));

        res.json(formattedNotifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark a notification as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.userId;

        await Notification.updateMany(
            {
                _id: id,
                userId // Ensure user owns the notification
            },
            { read: true }
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;

        await Notification.updateMany(
            { userId, read: false },
            { read: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
};
