import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const NotificationsMobile: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                setNotifications(data);
            } catch (error) {
                console.error('Failed to fetch notifications', error);
            }
        };
        fetchNotifications();
    }, []);

    const navigate = useNavigate();

    const handleMarkAsRead = async (notification: any) => {
        try {
            await api.patch(`/notifications/${notification.id}/read`);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
            if (notification.actionUrl) {
                navigate(notification.actionUrl);
            }
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    if (!user) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('notificationsPage.title', 'Alerts')}</h1>
                    <p className="text-muted-foreground mt-1">{t('notificationsPage.subtitle', 'Updates and notifications')}</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
                        {t('notificationsPage.markAllAsRead', 'Mark all as read')}
                    </Button>
                )}
            </div>

            {notifications.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent text-center py-12">
                    <CardContent className="flex flex-col items-center justify-center h-full pt-6">
                        <CheckCircle2 className="size-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">{t('notificationsPage.noFeeds', 'You have no active feeds')}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`border transition-colors cursor-pointer ${!notification.read ? 'border-primary shadow-sm bg-primary/5' : 'bg-card'}`}
                            onClick={() => handleMarkAsRead(notification)}
                        >
                            <CardContent className="p-4 flex gap-4">
                                <div className={`p-2 rounded-full h-fit flex-shrink-0 ${!notification.read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <Bell className="size-5" />
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <h4 className={`text-sm font-semibold truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {notification.title}
                                    </h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground/50 pt-1">
                                        {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsMobile;
