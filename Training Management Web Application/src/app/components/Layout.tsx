import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api, { BASE_URL } from '../../services/api';
import BottomNav from './BottomNav';
import {
  LayoutDashboard, Calendar, Users, Building2, DoorOpen,
  FileText, Settings, Bell, Menu, X, LogOut, QrCode,
  ClipboardList, BarChart3, Sun, Moon
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/ notifications / ${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getNavigationItems = () => {
    const commonItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ];

    switch (user.role) {
      case 'master_admin':
        return [
          ...commonItems,
          { icon: Calendar, label: 'Trainings', path: '/trainings' },
          { icon: Users, label: 'Program Officers', path: '/officers' },
          { icon: Users, label: 'Participants', path: '/participants' },
          { icon: Building2, label: 'Institutions', path: '/institutions' },
          { icon: DoorOpen, label: 'Halls', path: '/halls' },
          { icon: ClipboardList, label: 'Nominations', path: '/nominations' },
          { icon: BarChart3, label: 'Analytics', path: '/analytics' },
          { icon: FileText, label: 'Reports', path: '/reports' },
          { icon: Users, label: 'User Approvals', path: '/admin/approvals' },
        ];

      case 'program_officer':
        return [
          ...commonItems,
          { icon: Calendar, label: 'My Trainings', path: '/trainings' },
          { icon: Calendar, label: 'Create Training', path: '/trainings/create' },
          { icon: DoorOpen, label: 'Hall Availability', path: '/hall-availability' },
          { icon: ClipboardList, label: 'Nominations', path: '/nominations' },
          { icon: BarChart3, label: 'Analytics', path: '/analytics' },

          { icon: FileText, label: 'Reports', path: '/reports' },
        ];

      case 'institutional_admin':
        return [
          ...commonItems,
          { icon: Calendar, label: 'Trainings', path: '/trainings' },
          { icon: Users, label: 'Staff', path: '/staff' },
          { icon: ClipboardList, label: 'Nominations', path: '/nominations' },
          { icon: BarChart3, label: 'Analytics', path: '/analytics' },
          { icon: FileText, label: 'Reports', path: '/reports' },
        ];

      case 'participant':
        return [
          ...commonItems,
          { icon: Calendar, label: 'My Trainings', path: '/trainings' },
          { icon: QrCode, label: 'Scan QR', path: '/scan-qr' },
          { icon: ClipboardList, label: 'My Attendance', path: '/my-attendance' },
        ];

      default:
        return commonItems;
    }
  };

  const navigationItems = getNavigationItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    const roleColors: Record<string, string> = {
      master_admin: 'bg-purple-500',
      program_officer: 'bg-blue-500',
      institutional_admin: 'bg-green-500',
      participant: 'bg-orange-500',
    };

    const roleLabels: Record<string, string> = {
      master_admin: 'Admin',
      program_officer: 'Officer',
      institutional_admin: 'Inst Admin',
      participant: 'Participant',
    };

    return (
      <Badge className={`${roleColors[user.role]} text-white`}>
        {roleLabels[user.role]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 cyber-grid pointer-events-none z-0" />

      {/* Top Navigation */}
      <nav className="glass fixed w-full z-40 top-0 border-b border-primary/20 shadow-lg shadow-primary/5">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2 text-primary hover:bg-primary/10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_15px_rgba(0,236,255,0.4)]">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-foreground tracking-tight">DMO <span className="text-secondary">SYSTEMS</span></h1>
                  <p className="text-[10px] text-primary font-mono uppercase tracking-[0.2em] opacity-80 whitespace-nowrap hidden xs:block">Mission Control Center</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTheme()}
                className="text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full size-4 flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(0,236,255,0.6)]">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-80 max-h-96 overflow-y-auto border-primary/20">
                  <DropdownMenuLabel className="flex justify-between items-center text-primary">
                    <span className="font-bold">SYSTEM FEEDS</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 hover:bg-primary/10" onClick={handleMarkAllAsRead}>
                        ACKNOWLEDGE ALL
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground italic">
                      No active feeds
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-white/5'}`}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div className="font-bold text-sm flex justify-between w-full text-foreground">
                          <span>{notification.title}</span>
                          {!notification.read && <span className="size-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,236,255,1)]" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 font-light">
                          {notification.message}
                        </p>
                        <span className="text-[10px] text-primary/40 font-mono">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-xl transition-all group shrink-0">
                    <div className="relative">
                      <Avatar className="size-8 border border-primary/20 group-hover:border-primary/50 transition-colors">
                        {user.profilePicture ? (
                          <AvatarImage src={user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`} alt={user.name} crossOrigin="anonymous" />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-white text-sm font-bold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-bold text-foreground leading-none mb-0.5">{user.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{user.email}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-56 border-primary/20">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground">{user.name}</p>
                        {getRoleBadge()}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <DropdownMenuItem className="hover:bg-primary/10 text-white/80 focus:text-white" onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 size-4 text-primary" />
                    SETTINGS
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <DropdownMenuItem className="hover:bg-destructive/10 text-red-400 focus:text-red-300" onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    TERMINATE SESSION
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 glass border-r border-primary/20 transform transition-transform duration-300 ease-out pt-16 shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 bg-black/40`}
      >
        <nav className="flex flex-col h-full px-4 py-8 overflow-y-auto">
          <div className="space-y-1.5 flex-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-[inset_0_0_10px_rgba(0,236,255,0.05)]'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <Icon className={`size-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-sm tracking-wide">{item.label.toUpperCase()}</span>

                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,236,255,1)]" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-6 mt-auto border-t border-primary/10">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full gap-3 px-4 py-3 text-muted-foreground hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/5 font-bold tracking-widest text-xs"
            >
              <LogOut className="size-5 transition-transform group-hover:-translate-x-1" />
              <span>TERMINATE</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 relative z-10 transition-all duration-300 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-10 pb-24 lg:pb-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

export default Layout;
