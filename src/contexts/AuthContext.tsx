
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    // Check if user is already logged in from Supabase sessions
    const initializeAuth = async () => {
      try {
        // Check for active sessions in Supabase
        const { data: sessions, error } = await supabase
          .from('user_sessions')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('AuthContext: Error checking sessions:', error);
          setIsLoading(false);
          return;
        }

        if (sessions && sessions.length > 0) {
          const sessionData = sessions[0];
          console.log('AuthContext: Loading stored user session:', sessionData.session_data);
          // Properly cast the session data to User type
          const userData = sessionData.session_data as unknown as User;
          setUser(userData);
          
          // Check if password change is required
          const { data: passwordData } = await supabase
            .from('user_passwords')
            .select('requires_change')
            .eq('email', sessionData.email)
            .single();
          
          setRequiresPasswordChange(passwordData?.requires_change || false);
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const saveUserSession = async (userData: User, password?: string) => {
    try {
      // Save user session to Supabase
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      const { error: sessionError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: userData.id,
          email: userData.email,
          session_data: userData as any,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) {
        console.error('AuthContext: Error saving session:', sessionError);
        return;
      }

      // Save password if provided and not default
      if (password && password !== 'password') {
        const { error: passwordError } = await supabase
          .from('user_passwords')
          .upsert({
            email: userData.email,
            password_hash: btoa(password + userData.email), // Include email for better uniqueness
            requires_change: false
          });

        if (passwordError) {
          console.error('AuthContext: Error saving password:', passwordError);
        }
      }
      
      console.log('AuthContext: User session saved successfully');
    } catch (error) {
      console.error('AuthContext: Error saving user session:', error);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    console.log('AuthContext: Updating password for user:', user?.email);
    
    if (!user?.email) {
      console.error('AuthContext: No user email found');
      return false;
    }
    
    try {
      // Save new password to Supabase with proper encoding
      const passwordHash = btoa(newPassword + user.email); // Include email for better uniqueness
      
      const { error } = await supabase
        .from('user_passwords')
        .upsert({
          email: user.email,
          password_hash: passwordHash,
          requires_change: false
        });

      if (error) {
        console.error('AuthContext: Error updating password:', error);
        return false;
      }
      
      console.log('AuthContext: Password updated in database successfully');
      
      // Clear password change requirement immediately
      setRequiresPasswordChange(false);
      
      // Update session with new password info
      await saveUserSession(user, newPassword);
      
      console.log('AuthContext: Password updated and session refreshed successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Error updating password:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login with:', email);
    
    // Check stored passwords first
    const { data: passwordData } = await supabase
      .from('user_passwords')
      .select('password_hash, requires_change')
      .eq('email', email)
      .single();

    if (passwordData) {
      const storedHash = passwordData.password_hash;
      const testHash = btoa(password + email); // Match the encoding used in updatePassword
      
      if (storedHash === testHash || storedHash === btoa(password)) {
        console.log('AuthContext: Using stored password for login');
      } else if (password !== 'password') {
        console.log('AuthContext: Invalid password');
        return false;
      }
    } else if (password !== 'password') {
      // If no stored password and not default password
      console.log('AuthContext: Invalid password - no stored password found');
      return false;
    }
    
    // Define system admin users
    const systemUsers: { [key: string]: User } = {
      'alhk10@gmail.com': {
        id: 'ADMIN001',
        name: 'System Administrator',
        email: 'alhk10@gmail.com',
        role: 'superadmin'
      },
      'manager@company.sg': {
        id: 'MANAGER001', 
        name: 'Department Manager',
        email: 'manager@company.sg',
        role: 'manager'
      },
    };

    // Check system users first
    if (systemUsers[email]) {
      console.log('AuthContext: System user login successful:', systemUsers[email]);
      const foundUser = systemUsers[email];
      
      setUser(foundUser);
      await saveUserSession(foundUser, password);
      
      if (password === 'password' && !passwordData) {
        console.log('AuthContext: Setting password change requirement');
        await supabase
          .from('user_passwords')
          .upsert({
            email: foundUser.email,
            password_hash: btoa(password),
            requires_change: true
          });
        setRequiresPasswordChange(true);
      } else {
        console.log('AuthContext: No password change required');
        setRequiresPasswordChange(passwordData?.requires_change || false);
      }
      
      return true;
    }

    // Load all employees from database for regular employee login
    try {
      console.log('AuthContext: Loading employees from database...');
      const employees = await getEmployees();
      console.log('AuthContext: Loaded employees:', employees.length);
      
      // Find employee with matching email
      const employee = employees.find(emp => emp.email === email);
      
      if (employee) {
        console.log('AuthContext: Employee found:', employee);
        
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: 'employee',
          department: employee.branch,
          employeeId: employee.id
        };
        
        setUser(userRecord);
        await saveUserSession(userRecord, password);
        
        if (password === 'password' && !passwordData) {
          console.log('AuthContext: Setting password change requirement for employee');
          await supabase
            .from('user_passwords')
            .upsert({
              email: userRecord.email,
              password_hash: btoa(password),
              requires_change: true
            });
          setRequiresPasswordChange(true);
        } else {
          console.log('AuthContext: No password change required for employee');
          setRequiresPasswordChange(passwordData?.requires_change || false);
        }
        
        return true;
      }
      
      console.log('AuthContext: No matching employee found for email:', email);
      console.log('AuthContext: Available employee emails:', employees.map(emp => emp.email).filter(Boolean));
      
    } catch (error) {
      console.error('AuthContext: Error loading employees:', error);
    }

    console.log('AuthContext: Login failed for email:', email);
    return false;
  };

  const logout = async () => {
    console.log('AuthContext: Logging out user:', user);
    
    if (user?.email) {
      // Remove session from Supabase
      await supabase
        .from('user_sessions')
        .delete()
        .eq('email', user.email);
    }
    
    setUser(null);
    setRequiresPasswordChange(false);
  };

  // Debug log current user state
  useEffect(() => {
    console.log('AuthContext: Current user state changed:', user);
    console.log('AuthContext: requiresPasswordChange state:', requiresPasswordChange);
    if (user) {
      console.log('AuthContext: Current user role:', user.role);
    }
  }, [user, requiresPasswordChange]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      requiresPasswordChange, 
      updatePassword 
    }}>
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
