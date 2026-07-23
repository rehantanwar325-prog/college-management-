import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';

export interface User {
  id: number;
  email: string;
  role: 'superadmin' | 'admin' | 'faculty' | 'student' | 'parent';
}

interface AuthContextType {
  user: User | null;
  profile: any;
  loading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/auth/profile');
      setProfile(data?.profile || data);
    } catch (err) {
      console.error('Failed to load user profile details:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setProfile(parsedUser);
          // Load profile details from database
          const data = await api.get('/auth/profile');
          if (data) setProfile(data.profile || data);
        } catch (e) {
          console.error('Session restore failed:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setProfile(data.user);
      
      // Fetch profile
      try {
        const prof = await api.get('/auth/profile');
        if (prof) setProfile(prof.profile || prof);
      } catch (e) {
        // Fallback to user metadata in payload
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, theme, toggleTheme, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
