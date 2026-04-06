/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { authService } from '../services/authService.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getStoredUser();
      const token = authService.getToken();
      
      if (storedUser && token) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      setUser(response.data);
      setIsAuthenticated(true);
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  }, []);

  // Update user data
  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const next = { ...prev, ...updatedData };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Keep user role/profile in sync with server while logged in.
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshUser();

    const intervalId = setInterval(() => {
      refreshUser();
    }, 15000);

    const handleWindowFocus = () => {
      refreshUser();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, refreshUser]);

  // Check if user has role
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const currentRole = String(user.appRole || user.role || '').trim().toLowerCase();
    if (Array.isArray(roles)) {
      return roles.map(r => String(r).toLowerCase()).includes(currentRole);
    }
    return currentRole === String(roles).toLowerCase();
  }, [user]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    const currentRole = String(user?.appRole || user?.role || '').trim().toLowerCase();
    return currentRole === 'admin';
  }, [user]);

  // Check if user is captain
  const isCaptain = useCallback(() => {
    const currentRole = String(user?.appRole || user?.role || '').trim().toLowerCase();
    return currentRole === 'captain';
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUser,
    hasRole,
    isAdmin,
    isCaptain
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
