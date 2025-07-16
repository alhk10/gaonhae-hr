
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserEmployee, checkSuperadminStatusCached } from '@/services/authOptimizationService';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  // Handle user session from Supabase auth state
  const handleUserSession = async (session: any) => {
    console.log('AuthContext: Handling user session:', !!session);
    
    if (!session?.user?.email) {
      console.log('AuthContext: No valid session, clearing user state');
      setUser(null);
      setRequiresPasswordChange(false);
      setIsLoading(false);
      return;
    }

    try {
      const email = session.user.email;
      console.log('AuthContext: Processing user session for:', email);

      // Check if user is superadmin (this uses its own 30s timeout)
      const isSuperadmin = await checkSuperadminStatusCached(email);
      console.log('AuthContext: Superadmin status:', isSuperadmin);

      if (isSuperadmin) {
        // Create superadmin user directly
        const superadminUser: User = {
          id: session.user.id,
          email: email,
          name: 'System Administrator',
          role: 'superadmin',
          department: 'Administration',
          employeeId: 'ADMIN001'
        };

        console.log('AuthContext: Setting superadmin user');
        setUser(superadminUser);
        setRequiresPasswordChange(false);
        setIsLoading(false);
        return;
      }

      // For non-superadmin users, get employee data (this uses 60s timeout)
      console.log('AuthContext: Fetching employee data for regular user');
      const employeeData = await getCurrentUserEmployee(email);

      if (!employeeData) {
        console.log('AuthContext: No employee data found, clearing user state');
        setUser(null);
        setRequiresPasswordChange(false);
        setIsLoading(false);
        return;
      }

      // Create user based on employee data and admin access
      const hasAnyAdminAccess = Object.values(employeeData.adminAccess).some(access => access === true);
      
      const userData: User = {
        id: employeeData.id,
        email: employeeData.email,
        name: employeeData.name,
        role: hasAnyAdminAccess ? 'manager' : 'employee',
        department: employeeData.department,
        employeeId: employeeData.id
      };

      console.log('AuthContext: Setting regular user with role:', userData.role);
      setUser(userData);
      setRequiresPasswordChange(false);

    } catch (error) {
      console.error('AuthContext: Error in handleUserSession:', {
        _type: typeof error,
        value: error
      });
      
      if (error instanceof Error) {
        console.error('AuthContext: Detailed error info:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

      // On error, clear user state
      setUser(null);
      setRequiresPasswordChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthContext: Initializing auth state...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session:', !!session);
      handleUserSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out, clearing state');
        setUser(null);
        setRequiresPasswordChange(false);
        setIsLoading(false);
      } else {
        await handleUserSession(session);
      }
    });

    return () => {
      console.log('AuthContext: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Login function - returns boolean to indicate success
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Login attempt for:', email);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        setIsLoading(false);
        return false;
      }

      if (!data.user) {
        console.error('AuthContext: No user data returned from login');
        setIsLoading(false);
        return false;
      }

      console.log('AuthContext: Login successful for:', email);
      // User state will be updated via the auth state change listener
      return true;
      
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Logout function - clears all state
  const logout = async (): Promise<void> => {
    console.log('AuthContext: Logout initiated');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Logout error:', error);
      }
      
      // Clear all state
      setUser(null);
      setRequiresPasswordChange(false);
      setIsLoading(false);
      
      console.log('AuthContext: Logout completed');
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setRequiresPasswordChange(false);
      setIsLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (newPassword: string): Promise<boolean> => {
    console.log('AuthContext: Password update initiated');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('AuthContext: Password update error:', error);
        throw error;
      }

      setRequiresPasswordChange(false);
      console.log('AuthContext: Password updated successfully');
      return true;
      
    } catch (error) {
      console.error('AuthContext: Password update failed:', error);
      return false;
    }
  };

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    requiresPasswordChange,
    updatePassword
  };

  console.log('AuthContext: Provider rendered with user:', {
    _type: typeof user,
    value: user ? 'user object' : 'undefined'
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
