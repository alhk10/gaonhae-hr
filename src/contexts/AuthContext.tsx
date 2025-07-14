import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from '@/services/employeeService';
import { checkEmployeeAuthStatus, createSingleSupabaseAuthUser } from '@/services/bulkUserCreationService';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('AuthContext: Provider rendered with user:', user?.email);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('AuthContext: Auth state changed:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session) {
            await handleUserSession(session);
          } else if (event === 'SIGNED_OUT') {
            console.log('AuthContext: User signed out, clearing state');
            setUser(null);
            setIsLoading(false);
          }
        });

        // Then check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
        } else if (session && mounted) {
          console.log('AuthContext: Found existing session for:', session.user?.email);
          await handleUserSession(session);
        } else {
          console.log('AuthContext: No active session found');
          setUser(null);
        }

        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('AuthContext: Error during initialization:', error);
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
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
        console.log('AuthContext: Processing session for user:', normalizedEmail);
        
        // Verify user exists in employees table with case-insensitive matching
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.email?.toLowerCase() === normalizedEmail);
        
        if (employee) {
          console.log('AuthContext: Employee found in database:', employee.name);
          
          // Check if user is superadmin using the database function
          const { data: isSuperadmin, error: superadminError } = await supabase.rpc('is_superadmin', { 
            user_email: normalizedEmail 
          });
          
          if (superadminError) {
            console.error('AuthContext: Error checking superadmin status:', superadminError);
          }
          
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
          
          console.log('AuthContext: User authentication successful');
        } else {
          console.warn('AuthContext: User email not found in employees table:', normalizedEmail);
          setUser(null);
          await supabase.auth.signOut();
          toast("Access denied: User not found in employee system. Please contact administrator.");
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in handleUserSession:', error);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      setIsLoading(true);

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();

      // First verify the user exists in our employees table
      console.log('AuthContext: Checking if employee exists in database...');
      const employees = await getEmployees();
      const employee = employees.find(emp => emp.email?.toLowerCase() === normalizedEmail);
      
      if (!employee) {
        console.error('AuthContext: Employee not found in database:', normalizedEmail);
        toast("Access denied: Employee not found in system. Please contact administrator.");
        return false;
      }

      console.log('AuthContext: Employee found in database:', employee.name);

      // Try to sign in first
      console.log('AuthContext: Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.log('AuthContext: Sign in failed:', error.message);
        
        // If login failed due to invalid credentials, check if user doesn't exist yet
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('User not found')) {
          
          console.log('AuthContext: Checking if employee has auth account...');
          const hasAuthAccount = await checkEmployeeAuthStatus(normalizedEmail);
          
          if (!hasAuthAccount) {
            console.log('AuthContext: Employee has no auth account, creating one...');
            toast("Setting up your authentication account, please wait...");
            
            const authCreated = await createSingleSupabaseAuthUser(normalizedEmail, employee.name);
            
            if (authCreated) {
              console.log('AuthContext: Auth account created successfully');
              toast("Authentication account created! Please check your email for a password reset link to set your password.");
              setIsLoading(false);
              return false; // Don't proceed with login, user needs to set password first
            } else {
              console.error('AuthContext: Failed to create auth account');
              toast("Failed to create authentication account. Please contact administrator.");
              setIsLoading(false);
              return false;
            }
          }
        }
        
        // Provide more specific error messages for other cases
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
        // The session will be handled by the onAuthStateChange listener
        toast("Login successful!");
        return true;
      }

      console.error('AuthContext: Login failed - no user returned');
      return false;
    } catch (error) {
      console.error('AuthContext: Login exception:', error);
      toast("Login failed. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
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
      console.log('AuthContext: Logging out user');
      setIsLoading(true);
      
      await supabase.auth.signOut();
      setUser(null);
      setRequiresPasswordChange(false);
      
      console.log('AuthContext: Logout successful');
      toast("Logged out successfully");
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
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
