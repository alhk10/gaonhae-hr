
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
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Starting authentication initialization...');
        
        // Shorter timeout for initialization
        initializationTimeout = setTimeout(() => {
          console.warn('AuthContext: Initialization timeout, clearing loading states');
          if (mounted) {
            setIsLoading(false);
            setShowProgressiveLoading(false);
            setIsInitialized(true);
          }
        }, 10000); // Increased to 10 seconds to give more time
        
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
        console.log('AuthContext: Checking for existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
          authProgress.setStageError('session', 'Session error');
          throw sessionError;
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
          clearTimeout(initializationTimeout);
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
          clearTimeout(initializationTimeout);
          setIsInitialized(true);
          setIsLoading(false);
          setShowProgressiveLoading(false);
          toast.error('Authentication initialization failed. Please refresh the page.');
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, []);

  const handleUserSession = async (session: any) => {
    try {
      if (session?.user?.email) {
        const normalizedEmail = session.user.email.toLowerCase();
        console.log('AuthContext: Processing session for:', normalizedEmail);
        
        authProgress.completeStage('session');
        
        // Simple employee lookup with better timeout handling
        console.log('AuthContext: Calling getCurrentUserEmployee...');
        
        // Add a race condition with timeout to prevent hanging
        const employeePromise = getCurrentUserEmployee(normalizedEmail);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Employee lookup timeout')), 8000);
        });
        
        const employee = await Promise.race([employeePromise, timeoutPromise]) as any;
        console.log('AuthContext: getCurrentUserEmployee returned:', employee ? 'Employee found' : 'No employee');
        
        if (employee) {
          console.log('AuthContext: Employee found in database:', employee.name);
          authProgress.completeStage('employee');
          
          // Check superadmin status with timeout
          console.log('AuthContext: Checking superadmin status...');
          const superadminPromise = checkSuperadminStatusCached(normalizedEmail);
          const superadminTimeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(false), 3000); // Default to false if timeout
          });
          
          const isSuperadmin = await Promise.race([superadminPromise, superadminTimeoutPromise]) as boolean;
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
          
          console.log('AuthContext: User authentication successful');
          
          // Clear progressive loading after successful auth
          setTimeout(() => {
            setShowProgressiveLoading(false);
            setIsLoading(false);
          }, 500);
          
        } else {
          console.warn('AuthContext: User email not found in employees table:', normalizedEmail);
          authProgress.setStageError('employee', 'Employee not found');
          setUser(null);
          await supabase.auth.signOut();
          toast.error("Access denied: User not found in employee system. Please contact administrator.");
          setShowProgressiveLoading(false);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in handleUserSession:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load user data. Please try again.';
      if (error instanceof Error) {
        console.error('AuthContext: Detailed error info:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        if (error.message.includes('timeout') || error.message.includes('Employee lookup timeout')) {
          errorMessage = 'Connection timeout. Please check your internet connection and try again.';
        } else if (error.message.includes('Employee not found')) {
          errorMessage = 'Employee record not found. Please contact administrator.';
        } else if (error.message.includes('Database connection failed')) {
          errorMessage = 'Database connection failed. Please try again later.';
        }
      }
      
      authProgress.setStageError('employee', errorMessage);
      setUser(null);
      setShowProgressiveLoading(false);
      setIsLoading(false);
      toast.error(errorMessage);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    let loginTimeout: NodeJS.Timeout;
    
    try {
      console.log('AuthContext: Starting login for:', email);
      setIsLoading(true);
      setShowProgressiveLoading(true);
      loginProgress.startLoading();

      // Shorter timeout for login
      loginTimeout = setTimeout(() => {
        console.warn('AuthContext: Login timeout, clearing loading states');
        setIsLoading(false);
        setShowProgressiveLoading(false);
        loginProgress.setStageError('validate', 'Login timeout - please try again');
        toast.error('Login timeout. Please try again.');
      }, 15000); // Increased to 15 seconds

      const normalizedEmail = email.toLowerCase().trim();
      console.log('AuthContext: Normalized email for login:', normalizedEmail);
      loginProgress.completeStage('validate');

      console.log('AuthContext: Checking if employee exists...');
      
      try {
        // Add timeout to employee check
        const employeePromise = getCurrentUserEmployee(normalizedEmail);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Employee check timeout')), 10000);
        });
        
        const employee = await Promise.race([employeePromise, timeoutPromise]);
        
        if (!employee) {
          clearTimeout(loginTimeout);
          console.error('AuthContext: Employee not found in database:', normalizedEmail);
          loginProgress.setStageError('employee', 'Employee not found');
          toast.error("Access denied: Employee not found in system. Please contact administrator.");
          setIsLoading(false);
          setShowProgressiveLoading(false);
          return false;
        }

        console.log('AuthContext: Employee found in database:', (employee as any).name);
        loginProgress.completeStage('employee');
      } catch (employeeError) {
        clearTimeout(loginTimeout);
        console.error('AuthContext: Error checking employee:', employeeError);
        
        let errorMessage = 'Failed to verify employee record. Please try again.';
        if (employeeError instanceof Error) {
          if (employeeError.message.includes('timeout') || employeeError.message.includes('Employee check timeout')) {
            errorMessage = 'Database connection timeout. Please check your internet connection and try again.';
          } else if (employeeError.message.includes('Database connection failed')) {
            errorMessage = 'Database connection failed. Please try again later.';
          }
        }
        
        loginProgress.setStageError('employee', errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        setShowProgressiveLoading(false);
        return false;
      }

      console.log('AuthContext: Attempting Supabase sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        clearTimeout(loginTimeout);
        console.log('AuthContext: Sign in failed:', error.message);
        loginProgress.setStageError('auth', error.message);
        
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Invalid email or password. If this is your first login, please check your email for a password reset link.");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Please confirm your email address before signing in. Check your email for the confirmation link.");
        } else if (error.message.includes('Too many requests')) {
          toast.error("Too many login attempts. Please wait a moment before trying again.");
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
        
        setIsLoading(false);
        setShowProgressiveLoading(false);
        return false;
      }

      if (data.user) {
        clearTimeout(loginTimeout);
        console.log('AuthContext: Login successful for:', normalizedEmail);
        loginProgress.completeStage('auth');
        loginProgress.completeStage('permissions');
        loginProgress.completeStage('complete');
        toast.success("Login successful!");
        
        // The auth state change handler will take care of the rest
        return true;
      }

      clearTimeout(loginTimeout);
      console.error('AuthContext: Login failed - no user returned');
      loginProgress.setStageError('auth', 'No user returned');
      setIsLoading(false);
      setShowProgressiveLoading(false);
      return false;
    } catch (error) {
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
      console.error('AuthContext: Login exception:', error);
      loginProgress.setStageError('validate', 'Login failed');
      toast.error("Login failed. Please try again.");
      setIsLoading(false);
      setShowProgressiveLoading(false);
      return false;
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
        toast.error("Failed to update password. Please try again.");
        return false;
      }

      setRequiresPasswordChange(false);
      toast.success("Password updated successfully!");
      return true;
    } catch (error) {
      console.error('AuthContext: Password update exception:', error);
      toast.error("Failed to update password. Please try again.");
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
        toast.error("Error during logout, but you have been logged out locally.");
      } else {
        console.log('AuthContext: Logout successful');
        toast.success("Logged out successfully");
      }
      
      // Navigate to home page after logout
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      toast.error("Error during logout, but you have been logged out locally.");
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
