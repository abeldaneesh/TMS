import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, QrCode, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from './ui/use-mobile';

const BottomNav: React.FC = () => {
    const { user } = useAuth();
    const isMobile = useIsMobile();

    if (!isMobile || !user) return null;

    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: Calendar, label: 'Trainings', path: '/trainings' },
        {
            icon: user.role === 'participant' ? QrCode : ClipboardList,
            label: user.role === 'participant' ? 'Scan' : 'Nominations',
            path: user.role === 'participant' ? '/scan-qr' : '/nominations'
        },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            <div className="glass border-t border-primary/20 flex justify-around items-center h-16 px-2 bg-black/80 backdrop-blur-xl">
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
                                <div className={`p-1 rounded-lg transition-all ${item.path === '/dashboard' ? 'group-hover:animate-pulse' : ''}`}>
                                    <item.icon className="size-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
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
            <div className="h-[env(safe-area-inset-bottom)] bg-black/80" />
        </div>
    );
};

export default BottomNav;
