import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AuthContextType } from '../types';
import { authApi } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_HEARTBEAT_INTERVAL_MS = 20 * 1000;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

import LoadingScreen from '../app/components/LoadingScreen';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const closingSignalSentRef = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Validate token and get fresh user data
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          localStorage.setItem('dmo_user', JSON.stringify(userData));
        } catch (error) {
          console.error('Session expired or invalid:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('dmo_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      setUser(null);
    };

    window.addEventListener('dmo-auth-invalidated', handleAuthInvalidated);
    return () => window.removeEventListener('dmo-auth-invalidated', handleAuthInvalidated);
  }, []);

  useEffect(() => {
    if (!user) {
      closingSignalSentRef.current = false;
      return;
    }

    let disposed = false;

    const sendHeartbeat = async () => {
      if (disposed) return;

      try {
        await authApi.heartbeat();
      } catch (error) {
        console.error('Session heartbeat failed:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat();
      }
    };

    const handleFocus = () => {
      void sendHeartbeat();
    };

    const handleOnline = () => {
      void sendHeartbeat();
    };

    const handlePageClosing = () => {
      if (closingSignalSentRef.current) {
        return;
      }

      closingSignalSentRef.current = true;
      authApi.notifySessionClosing();
    };

    closingSignalSentRef.current = false;
    void sendHeartbeat();

    const heartbeatInterval = window.setInterval(() => {
      void sendHeartbeat();
    }, SESSION_HEARTBEAT_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', handlePageClosing);
    window.addEventListener('beforeunload', handlePageClosing);

    return () => {
      disposed = true;
      window.clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', handlePageClosing);
      window.removeEventListener('beforeunload', handlePageClosing);
    };
  }, [user]);

  const login = async (email: string, password: string, allowedRoles?: string[]): Promise<User> => {
    try {
      const { user: loggedInUser, token } = await authApi.login(email, password);

      if (allowedRoles && !allowedRoles.includes(loggedInUser.role)) {
        throw new Error('UNAUTHORIZED_ROLE');
      }

      if (token) {
        localStorage.setItem('token', token);
      }
      setUser(loggedInUser);
      localStorage.setItem('dmo_user', JSON.stringify(loggedInUser));
      return loggedInUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authApi.logout();
    closingSignalSentRef.current = false;
    setUser(null);
  };

  if (loading) {
    return <LoadingScreen fullscreen />;
  }

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('dmo_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
