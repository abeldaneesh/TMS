import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, QrCode, ClipboardList, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from './ui/use-mobile';
interface BottomNavProps {
    unreadCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount = 0 }) => {
    const { user } = useAuth();
    const isMobile = useIsMobile();

    if (!isMobile || !user) return null;

    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: Calendar, label: 'Trainings', path: '/trainings' },
        {
            icon: user.role === 'participant' ? QrCode : ClipboardList,
            label: user.role === 'participant' ? 'Scan' : 'Library',
            path: user.role === 'participant' ? '/scan-qr' : '/nominations'
        },
        { icon: Bell, label: 'Alerts', path: '/notifications-mobile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border flex justify-around items-center h-16 px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 transition-all flex-1 h-full relative
                            ${isActive ? 'text-primary' : 'text-muted-foreground opacity-60'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-lg transition-all relative`}>
                                    <item.icon className="size-5" />
                                    {item.label === 'Alerts' && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full size-4 flex items-center justify-center border-2 border-background">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {/* Active Indicator Bar */}
                                <div
                                    className={`
                                        absolute top-0 w-8 h-0.5 bg-primary rounded-full transition-all duration-300
                                        ${isActive ? 'opacity-100' : 'opacity-0'}
                                    `}
                                />
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
            {/* Handle notch/bottom bar on iOS/Android */}
            <div className="h-[env(safe-area-inset-bottom)] bg-background" />
        </div>
    );
};

export default BottomNav;
