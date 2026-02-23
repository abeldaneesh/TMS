import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { authApi } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const loggedInUser = await authApi.login(email, password);
      setUser(loggedInUser);
      localStorage.setItem('dmo_user', JSON.stringify(loggedInUser));
      return loggedInUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  if (loading) {
    return <LoadingScreen />;
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
