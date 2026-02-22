import Notification from '../models/Notification';
import User from '../models/User';
import admin from '../config/firebase';

interface CreateNotificationParams {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
}

export const createAndSendNotification = async (params: CreateNotificationParams) => {
    try {
        // 1. Save to MongoDB
        const newNotification = await Notification.create({
            userId: params.userId,
            title: params.title,
            message: params.message,
            type: params.type,
            read: false,
        });

        // 2. Fetch the user's FCM device token
        const user = await User.findById(params.userId).select('fcmToken');

        // 3. If they have a token, push the notification via Firebase
        if (user && user.fcmToken) {
            const message = {
                notification: {
                    title: params.title,
                    body: params.message,
                },
                android: {
                    priority: 'high' as const,
                    notification: {
                        channelId: 'dmo_alerts',
                        sound: 'default',
                        priority: 'high' as const,
                        visibility: 'public' as const,
                        clickAction: 'FCM_PLUGIN_ACTIVITY', // Standard Capacitor action
                    }
                },
                data: {
                    type: params.type,
                    relatedId: params.relatedId || '',
                    title: params.title, // Also send in data for foreground handling
                    message: params.message,
                },
                token: user.fcmToken,
            };

            try {
                const response = await admin.messaging().send(message);
                console.log(`[FCM] Successfully pushed notification to ${user.fcmToken}:`, response);
            } catch (fcmError) {
                console.error(`[FCM] Failed to push notification to ${user.fcmToken}:`, fcmError);
            }
        }

        return newNotification;
    } catch (dbError) {
        console.error('Error creating notification:', dbError);
        throw dbError; // Rethrow to let caller handle it
    }
};
