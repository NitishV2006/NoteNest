import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import * as api from '../services/api';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuthChange = async (session: any) => {
    setError(null);
    if (session?.user) {
      try {
        const profile = await api.getProfile(session.user.id);
        setUser(profile);
      } catch (e) {
        console.error("Critical error loading user profile:", e);
        
        // WORKAROUND: Instead of logging out, create a partial profile from auth session data.
        // This allows a user to stay logged in if their profile is incomplete (e.g., missing department).
        const sessionUser = session.user;
        const fallbackProfile: User = {
          id: sessionUser.id,
          email: sessionUser.email!,
          name: sessionUser.user_metadata?.name || 'User',
          role: sessionUser.user_metadata?.role || UserRole.STUDENT,
        };
        
        // Special case for admin user to ensure they can log in even if profile fetch fails
        if (fallbackProfile.email === 'deepthipathigulla@gmail.com') {
            fallbackProfile.role = UserRole.ADMIN;
        }

        setUser(fallbackProfile);
        
        setError(`Failed to load full user profile. Some features may be limited. Please try updating your profile information.`);
      }
    } else {
      setUser(null);
    }
  };


  useEffect(() => {
    setLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleAuthChange(session);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.login(email, pass);
      // onAuthStateChange will handle setting the user
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        setLoading(false); // Stop loading on error
        throw err;
    } 
    // Don't setLoading(false) here, onAuthStateChange will do it.
  };

  const register = async (name: string, email: string, pass: string, role: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await api.register(name, email, pass, role);
      if (result.error) {
        throw result.error;
      }
      return result;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        throw err;
    } finally {
        // If registration requires email confirmation, onAuthStateChange may not fire.
        // Therefore, we MUST stop the loading state here to prevent a stuck loader.
        setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    // By setting user to null here, we avoid a race condition where navigation
    // occurs before the onAuthStateChange listener has updated the state.
    setUser(null);
  };
  
  const updateProfile = async (data: Partial<User>) => {
    setError(null);
    if (!user) throw new Error("Not authenticated");
    try {
      const updatedProfileData = await api.updateProfile(user.id, data);
      
      // After a successful update, we merge the new data with the existing user state.
      // This preserves auth-based data (like email) and adds the newly saved profile data.
      const updatedUser = { ...user, ...updatedProfileData };
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
       setError(errorMessage);
       throw err;
    }
  };
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = { user, login, register, logout, updateProfile, loading, error, clearError };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};