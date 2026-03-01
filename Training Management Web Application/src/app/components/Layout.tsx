import React, { useState, useEffect, useRef } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import api, { BASE_URL } from '../../services/api';
import BottomNav from './BottomNav';
import {
  LayoutDashboard, Calendar, Users, Building2, DoorOpen,
  FileText, Settings, Bell, Menu, X, LogOut, QrCode,
  ClipboardList, BarChart3, Search, AppWindowMac, Cast, UserCheck, Sun, Moon, Globe
} from 'lucide-react';
import DoctorLogo from './DoctorLogo';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';

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
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  if (!user) return null;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');

    // Request native Push Notification permissions and register (Only on actual devices)
    const registerPush = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }

        // Listen for new FCM token
        PushNotifications.addListener('registration', (token: Token) => {
          console.log('Push registration success, token: ' + token.value);
          // Send token to backend
          api.post('/auth/device-token', { token: token.value }).catch(e => console.error('Token save failed', e));
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on push registration: ', error);
        });

        // Listen for incoming pushes while the app is OPEN
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('Push received: ', notification);
          // Play the sound manually since we're in the foreground
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio prevented', e));
          }
          fetchNotifications(); // Update UI badges

          // Trigger Local Notification for foreground popups
          LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title || 'New Notification',
                body: notification.body || '',
                id: new Date().getTime(),
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'notification',
                actionTypeId: '',
                extra: null,
                channelId: 'dmo_alerts_v3', // Match backend channel
              }
            ]
          });
        });

        // Listen for when a user TAPS the push notification from Android system menu
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
          console.log('Push action performed: ', notification);
        });

        // Create the default channel (Required for Android 8+)
        // v3 bypasses Android cached channel states that might be silencing the app
        await PushNotifications.createChannel({
          id: 'dmo_alerts_v3',
          name: 'DMO Alerts (Urgent)',
          description: 'Important notifications from the system',
          importance: 5,
          visibility: 1,
          sound: 'notification'
        });

        // Also create channel for LocalNotifications
        await LocalNotifications.createChannel({
          id: 'dmo_alerts_v3',
          name: 'DMO Alerts (Urgent)',
          description: 'Important notifications from the system',
          importance: 5,
          visibility: 1,
          sound: 'notification'
        });
      } catch (e) {
        console.log('Push setup failed (likely not on device)', e);
      }
    };
    registerPush();

    return () => {
      // Cleanup listeners on unmount
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    }
  }, []);

  const getActionUrl = (notification: any) => {
    if (notification.actionUrl) return notification.actionUrl;

    // Fallback for older notifications
    const title = notification.title || '';

    if (title.includes('Certificate Ready') || title.includes('New Training') || title.includes('Attendance Marked') || title.includes('Hall Request Approved')) {
      return `/trainings/${notification.relatedId}`;
    } else if (title.includes('Nomination Approved')) {
      return '/my-attendance';
    } else if (title.includes('Nomination Rejected')) {
      return '/nominations';
    } else if (title.includes('Session Started')) {
      return `/scan-qr`;
    } else if (title.includes('Hall Request Rejected')) {
      return `/hall-availability`;
    }

    return `/dashboard`;
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      const currentUnread = data.filter((n: any) => !n.read).length;
      setUnreadCount(currentUnread);

      // Only play the fallback web sound if unread count increased while in foreground on the web
      // (The Push Notification listener handles actual pushes on mobile)
      if (currentUnread > prevUnreadCountRef.current && !Capacitor.isNativePlatform()) {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play prevented', e));
        }
      }
      prevUnreadCountRef.current = currentUnread;
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s instead of 60s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
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
      { icon: LayoutDashboard, label: t('nav.home', 'Home'), path: '/dashboard' },
    ];

    switch (user.role) {
      case 'master_admin':
        return [
          ...commonItems,
          { icon: UserCheck, label: t('nav.userApprovals', 'Approvals'), path: '/admin/approvals' },
          { icon: AppWindowMac, label: t('nav.explore', 'Explore (Trainings)'), path: '/trainings' },
          { icon: Users, label: t('nav.officers', 'Officers'), path: '/officers' },
          { icon: Users, label: t('nav.participants', 'Participants'), path: '/participants' },
          { icon: Building2, label: t('nav.institutions', 'Institutions'), path: '/institutions' },
          { icon: DoorOpen, label: t('nav.halls', 'Halls'), path: '/halls' },
          { icon: ClipboardList, label: t('nav.nominations', 'Library (Noms)'), path: '/nominations' },
          { icon: BarChart3, label: t('nav.analytics', 'Analytics'), path: '/analytics' },
          { icon: FileText, label: t('nav.reports', 'Reports'), path: '/reports' },
        ];

      case 'program_officer':
        return [
          ...commonItems,
          { icon: AppWindowMac, label: t('nav.explore', 'Explore (Trainings)'), path: '/trainings' },
          { icon: Calendar, label: t('nav.createTraining', 'Create Training'), path: '/trainings/create' },
          { icon: DoorOpen, label: t('nav.hallAvailability', 'Hall Availability'), path: '/hall-availability' },
          { icon: ClipboardList, label: t('nav.nominations', 'Library (Noms)'), path: '/nominations' },
          { icon: BarChart3, label: t('nav.analytics', 'Analytics'), path: '/analytics' },
          { icon: FileText, label: t('nav.reports', 'Reports'), path: '/reports' },
        ];

      case 'institutional_admin':
        return [
          ...commonItems,
          { icon: AppWindowMac, label: t('nav.explore', 'Explore (Trainings)'), path: '/trainings' },
          { icon: Users, label: t('nav.staff', 'Staff'), path: '/staff' },
          { icon: ClipboardList, label: t('nav.nominations', 'Library (Noms)'), path: '/nominations' },
          { icon: BarChart3, label: t('nav.analytics', 'Analytics'), path: '/analytics' },
          { icon: FileText, label: t('nav.reports', 'Reports'), path: '/reports' },
        ];

      case 'participant':
        return [
          ...commonItems,
          { icon: AppWindowMac, label: t('nav.explore', 'Explore'), path: '/trainings' },
          { icon: QrCode, label: t('nav.scanQr', 'Scan QR'), path: '/scan-qr' },
          { icon: ClipboardList, label: t('nav.myLibrary', 'My Library'), path: '/my-attendance' },
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('ml') ? 'en' : 'ml';
    i18n.changeLanguage(nextLang);
  };

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalSearchTerm.trim()) {
      navigate(`/trainings?search=${encodeURIComponent(globalSearchTerm.trim())}`);
      setGlobalSearchTerm('');
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Top Navigation */}
      <nav className="fixed w-full z-40 top-0 bg-background h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2 text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer mr-6">
            <div className="text-primary bg-background rounded-full p-1 border border-primary/20">
              <DoctorLogo className="size-6 text-primary" />
            </div>
            <h1 className="font-bold text-xl text-foreground tracking-tighter">
              DMO <span className="text-primary font-semibold tracking-normal">TMS</span>
            </h1>
          </Link>
        </div>

        {/* Center Search Bar */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-4 items-center">
          <div className={`flex w-full items-center bg-secondary/30 border border-transparent rounded-full px-4 py-2 transition-all ${searchFocused ? 'bg-secondary/50 border-[#3d3d3d]' : 'hover:bg-secondary/40'} `}>
            <Search className="size-5 text-muted-foreground mr-3" />
            <input
              type="text"
              placeholder="Search trainings, users, reports"
              className="bg-transparent border-none outline-none text-foreground w-full placeholder:text-muted-foreground text-sm font-medium"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              onKeyDown={handleGlobalSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent hover:text-accent-foreground hidden sm:flex">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-popover border-border">
              <DropdownMenuLabel className="flex justify-between items-center text-foreground">
                <span className="font-semibold">{t('nav.notifications', 'Notifications')}</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-primary" onClick={handleMarkAllAsRead}>
                    Mark all as read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground italic">
                  No active feeds
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground ${!notification.read ? 'bg-muted/50 border-l-2 border-primary' : ''}`}
                    onClick={() => {
                      handleMarkAsRead(notification.id);
                      const targetUrl = getActionUrl(notification);
                      if (targetUrl) {
                        navigate(targetUrl);
                      }
                    }}
                  >
                    <div className="font-medium text-sm flex justify-between w-full text-foreground">
                      <span>{notification.title}</span>
                      {!notification.read && <span className="size-2 bg-primary rounded-full" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground rounded-full transition-all group shrink-0 size-9">
                <Avatar className="size-8 transition-colors border border-border">
                  {user.profilePicture ? (
                    <AvatarImage src={user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <Badge className="bg-primary/20 text-primary shadow-none capitalize hover:bg-primary/30">{user.role.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer" onClick={(e) => { e.preventDefault(); toggleLanguage(); }}>
                <Globe className="mr-2 size-4 text-muted-foreground" />
                {i18n.language.startsWith('ml') ? 'Switch to English' : 'മലയാളത്തിലേക്ക് മാറ്റുക (Malayalam)'}
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer" onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
                {theme === 'dark' ? <Sun className="mr-2 size-4 text-muted-foreground" /> : <Moon className="mr-2 size-4 text-muted-foreground" />}
                {theme === 'dark' ? t('nav.lightMode', 'Light Mode') : t('nav.darkMode', 'Dark Mode')}
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 size-4 text-muted-foreground" />
                {t('nav.settings', 'Settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                {t('nav.logout', 'Sign Out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <div className="flex flex-1 pt-[calc(4rem+env(safe-area-inset-top))] h-full">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-background transform transition-transform duration-300 ease-out pt-[calc(4rem+env(safe-area-inset-top))] overflow-y-auto hide-scroll ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 lg:w-60 lg:flex lg:flex-col lg:border-r border-transparent`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <nav className="flex flex-col h-full px-3 py-4">
            <div className="space-y-1 flex-1">
              {navigationItems.slice(0, 3).map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all relative group ${isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <Icon className={`size-6 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-4 h-[1px] bg-border mx-2" />

              {navigationItems.slice(3).map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all relative group ${isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <Icon className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-60 relative z-10 min-h-[calc(100vh-64px)] overflow-x-hidden pt-4 sm:pt-6">
          <div className="px-4 sm:px-6 lg:px-10 pb-24 lg:pb-12 h-full">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Bottom Navigation for Mobile */}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
};

export default Layout;
