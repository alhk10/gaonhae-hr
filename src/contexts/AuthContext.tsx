import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserEmployee, checkSuperadminStatusCached, clearAuthCache } from '@/services/authOptimizationService';
import { createSingleSupabaseAuthUser } from '@/services/bulkUserCreationService';
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';
import { ProgressiveLoading } from '@/components/ui/progressive-loading';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  managerId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AUTH_STAGES = [
  { id: 'init', label: 'Initializing authentication...' },
  { id: 'session', label: 'Checking existing session...' },
  { id: 'employee', label: 'Loading employee data...' },
  { id: 'permissions', label: 'Setting up permissions...' },
  { id: 'complete', label: 'Authentication complete' }
];

const LOGIN_STAGES = [
  { id: 'validate', label: 'Validating credentials...' },
  { id: 'employee', label: 'Verifying employee record...' },
  { id: 'auth', label: 'Authenticating with Supabase...' },
  { id: 'permissions', label: 'Loading permissions...' },
  { id: 'complete', label: 'Login successful' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false);
  const navigate = useNavigate();

  const authProgress = useProgressiveLoading(AUTH_STAGES);
  const loginProgress = useProgressiveLoading(LOGIN_STAGES);

  console.log('AuthContext: Provider rendered with user:', user?.email);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Starting optimized authentication initialization...');
        authProgress.startLoading();
        setShowProgressiveLoading(true);
        
        authProgress.completeStage('init');
        
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('AuthContext: Auth state changed:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session) {
            await handleUserSession(session);
          } else if (event === 'SIGNED_OUT' || !session) {
            console.log('AuthContext: User signed out or no session, clearing state');
            setUser(null);
            setRequiresPasswordChange(false);
            clearAuthCache();
            setIsLoading(false);
            setShowProgressiveLoading(false);
            setIsInitialized(true);
          }
        });

        authProgress.completeStage('session');

        // Then check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
          authProgress.setStageError('session', 'Session error');
        } else if (session && mounted) {
          console.log('AuthContext: Found existing session for:', session.user?.email);
          await handleUserSession(session);
        } else {
          console.log('AuthContext: No active session found');
          setUser(null);
          authProgress.completeStage('employee');
          authProgress.completeStage('permissions');
          authProgress.completeStage('complete');
        }

        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
          setShowProgressiveLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('AuthContext: Error during initialization:', error);
        authProgress.setStageError('init', 'Initialization failed');
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
          setShowProgressiveLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const handleUserSession = async (session: any) => {
    try {
      if (session?.user?.email) {
        const normalizedEmail = session.user.email.toLowerCase();
        console.log('AuthContext: Processing session with optimized employee lookup:', normalizedEmail);
        
        authProgress.completeStage('session');
        
        // Use optimized employee lookup
        const employee = await getCurrentUserEmployee(normalizedEmail);
        
        if (employee) {
          console.log('AuthContext: Employee found in database:', employee.name);
          authProgress.completeStage('employee');
          
          // Check superadmin status with caching
          const isSuperadmin = await checkSuperadminStatusCached(normalizedEmail);
          const userRole = isSuperadmin ? 'superadmin' : 'employee';
          
          console.log('AuthContext: Setting user with role:', userRole);
          setUser({ 
            id: employee.id,
            email: normalizedEmail,
            name: employee.name,
            role: userRole,
            employeeId: employee.id,
            department: employee.department
          });
          
          setRequiresPasswordChange(false);
          authProgress.completeStage('permissions');
          authProgress.completeStage('complete');
          
          console.log('AuthContext: Optimized user authentication successful');
          
          // Hide progressive loading after successful auth
          setTimeout(() => {
            setShowProgressiveLoading(false);
            setIsLoading(false);
          }, 1000);
          
        } else {
          console.warn('AuthContext: User email not found in employees table:', normalizedEmail);
          authProgress.setStageError('employee', 'Employee not found');
          setUser(null);
          await supabase.auth.signOut();
          toast("Access denied: User not found in employee system. Please contact administrator.");
          setShowProgressiveLoading(false);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in handleUserSession:', error);
      authProgress.setStageError('employee', 'Failed to load user data');
      setUser(null);
      setShowProgressiveLoading(false);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Starting optimized login for:', email);
      setIsLoading(true);
      setShowProgressiveLoading(true);
      loginProgress.startLoading();

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      loginProgress.completeStage('validate');

      // Optimized employee check - only get essential data
      console.log('AuthContext: Checking if employee exists with minimal query...');
      const employee = await getCurrentUserEmployee(normalizedEmail);
      
      if (!employee) {
        console.error('AuthContext: Employee not found in database:', normalizedEmail);
        loginProgress.setStageError('employee', 'Employee not found');
        toast("Access denied: Employee not found in system. Please contact administrator.");
        return false;
      }

      console.log('AuthContext: Employee found in database:', employee.name);
      loginProgress.completeStage('employee');

      // Try to sign in
      console.log('AuthContext: Attempting Supabase sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.log('AuthContext: Sign in failed:', error.message);
        loginProgress.setStageError('auth', error.message);
        
        // Handle specific error cases without heavy operations
        if (error.message.includes('Invalid login credentials')) {
          toast("Invalid email or password. If this is your first login, please check your email for a password reset link.");
        } else if (error.message.includes('Email not confirmed')) {
          toast("Please confirm your email address before signing in. Check your email for the confirmation link.");
        } else if (error.message.includes('Too many requests')) {
          toast("Too many login attempts. Please wait a moment before trying again.");
        } else {
          toast(`Login failed: ${error.message}`);
        }
        return false;
      }

      if (data.user) {
        console.log('AuthContext: Login successful for:', normalizedEmail);
        loginProgress.completeStage('auth');
        loginProgress.completeStage('permissions');
        loginProgress.completeStage('complete');
        toast("Login successful!");
        return true;
      }

      console.error('AuthContext: Login failed - no user returned');
      loginProgress.setStageError('auth', 'No user returned');
      return false;
    } catch (error) {
      console.error('AuthContext: Login exception:', error);
      loginProgress.setStageError('validate', 'Login failed');
      toast("Login failed. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
      setShowProgressiveLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('AuthContext: Password update error:', error);
        toast("Failed to update password. Please try again.");
        return false;
      }

      setRequiresPasswordChange(false);
      toast("Password updated successfully!");
      return true;
    } catch (error) {
      console.error('AuthContext: Password update exception:', error);
      toast("Failed to update password. Please try again.");
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout process');
      setIsLoading(true);
      
      // Clear user state immediately to prevent showing authenticated content
      setUser(null);
      setRequiresPasswordChange(false);
      clearAuthCache();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Logout error:', error);
        toast("Error during logout, but you have been logged out locally.");
      } else {
        console.log('AuthContext: Logout successful');
        toast("Logged out successfully");
      }
      
      // Navigate to home page after logout
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      toast("Error during logout, but you have been logged out locally.");
    } finally {
      // Ensure we always clear the loading state and user data
      setUser(null);
      setRequiresPasswordChange(false);
      clearAuthCache();
      setIsLoading(false);
      navigate('/', { replace: true });
    }
  };

  // Show progressive loading during authentication
  if (showProgressiveLoading) {
    const currentProgress = isLoading && !user ? loginProgress : authProgress;
    return (
      <ProgressiveLoading
        stages={currentProgress.loadingStages}
        currentStage={currentProgress.currentStage}
        progress={currentProgress.progress}
        title={isLoading && !user ? "Signing In..." : "Initializing..."}
      />
    );
  }

  // Show simple loading for quick operations
  if (!isInitialized || (isLoading && !showProgressiveLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    requiresPasswordChange,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
