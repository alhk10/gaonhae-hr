
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from '@/services/employeeService';
import LoggedOutPage from '@/components/auth/LoggedOutPage';

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
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  console.log('AuthContext: Provider rendered with user:', user?.email);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext: Checking authentication status...');
      setIsLoading(true);
      setHasError(false);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('AuthContext: Session error:', sessionError);
        setHasError(true);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (session?.user?.email) {
        console.log('AuthContext: Found session for user:', session.user.email);
        
        try {
          // Verify user exists in employees table
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === session.user.email);
          
          if (employee) {
            console.log('AuthContext: Employee found, setting user');
            setUser({ 
              id: employee.id,
              email: session.user.email,
              name: employee.name,
              role: employee.type === 'Full-Time' ? 'employee' : 'employee',
              employeeId: employee.id,
              department: employee.department
            });
            
            // Check if password change is required
            // This would typically come from your password management system
            setRequiresPasswordChange(false);
          } else {
            console.warn('AuthContext: User email not found in employees table');
            setHasError(true);
            setUser(null);
          }
        } catch (employeeError) {
          console.error('AuthContext: Error fetching employee data:', employeeError);
          setHasError(true);
          setUser(null);
        }
      } else {
        console.log('AuthContext: No active session found');
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Error in checkAuthStatus:', error);
      setHasError(true);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      setIsLoading(true);
      setHasError(false);
      setIsLoggedOut(false);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        toast(`Login failed: ${error.message}`);
        return false;
      }

      if (data.user?.email) {
        // Verify user exists in employees table
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.email === data.user.email);
        
        if (employee) {
          console.log('AuthContext: Login successful for employee:', employee.name);
          setUser({ 
            id: employee.id,
            email: data.user.email,
            name: employee.name,
            role: employee.type === 'Full-Time' ? 'employee' : 'employee',
            employeeId: employee.id,
            department: employee.department
          });
          toast("Login successful!");
          return true;
        } else {
          console.error('AuthContext: User not found in employees table');
          await supabase.auth.signOut();
          toast("Access denied: User not found in system");
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setHasError(true);
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
        return false;
      }

      setRequiresPasswordChange(false);
      return true;
    } catch (error) {
      console.error('AuthContext: Password update error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out user');
      setIsLoading(true);
      
      await supabase.auth.signOut();
      setUser(null);
      setIsLoggedOut(true);
      setHasError(false);
      setRequiresPasswordChange(false);
      
      console.log('AuthContext: Logout successful');
      toast("Logged out successfully");
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      setUser(null);
      setIsLoggedOut(true);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    setIsLoggedOut(false);
    setHasError(false);
  };

  // Show logged out page if user is logged out or there's an error
  if (isLoggedOut || hasError) {
    return (
      <LoggedOutPage 
        onLoginClick={handleLoginClick}
        hasError={hasError}
      />
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
