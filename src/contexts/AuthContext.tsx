import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
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
    // Check if user is already logged in from Supabase sessions or OAuth
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        
        // First check for Supabase Auth sessions (OAuth users)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('AuthContext: Found Supabase OAuth session:', session.user);
          await handleOAuthUser(session.user);
          setIsLoading(false);
          return;
        }

        // Then check for custom sessions in database (password users)
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
          
          const userData = sessionData.session_data as unknown as User;
          setUser(userData);
          
          // Only check password change requirement for password-based logins
          const { data: passwordData } = await supabase
            .from('user_passwords')
            .select('requires_change')
            .eq('email', sessionData.email)
            .single();
          
          const needsPasswordChange = passwordData?.requires_change === true;
          console.log('AuthContext: Password change required on init:', needsPasswordChange);
          setRequiresPasswordChange(needsPasswordChange);
        } else {
          console.log('AuthContext: No active session found');
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up OAuth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await handleOAuthUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRequiresPasswordChange(false);
        }
      }
    );

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleOAuthUser = async (oauthUser: any) => {
    try {
      console.log('AuthContext: Processing OAuth user:', oauthUser);
      
      // Define system admin users that can use OAuth
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

      // Check if OAuth user is a system admin
      if (systemUsers[oauthUser.email]) {
        console.log('AuthContext: OAuth system user login:', systemUsers[oauthUser.email]);
        setUser(systemUsers[oauthUser.email]);
        setRequiresPasswordChange(false); // OAuth users don't need password changes
        return;
      }

      // Check if OAuth user matches an employee
      const employees = await getEmployees();
      const employee = employees.find(emp => emp.email === oauthUser.email);
      
      if (employee) {
        console.log('AuthContext: OAuth employee found:', employee);
        
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: 'employee',
          department: employee.branch,
          employeeId: employee.id
        };
        
        setUser(userRecord);
        setRequiresPasswordChange(false); // OAuth users don't need password changes
      } else {
        console.log('AuthContext: OAuth user not found in system:', oauthUser.email);
        // Sign out the OAuth user if they're not in our system
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('AuthContext: Error handling OAuth user:', error);
      await supabase.auth.signOut();
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      console.log('AuthContext: Starting Google OAuth login');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('AuthContext: Google OAuth error:', error);
        return false;
      }

      console.log('AuthContext: Google OAuth initiated successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Google OAuth exception:', error);
      return false;
    }
  };

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
            password_hash: btoa(password + userData.email),
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
    console.log('AuthContext: Starting password update for user:', user?.email);
    
    if (!user?.email) {
      console.error('AuthContext: No user email found');
      return false;
    }
    
    try {
      // Save new password to Supabase with proper encoding
      const passwordHash = btoa(newPassword + user.email);
      
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
      
      // Update session with new password info - this will persist the change
      await saveUserSession(user, newPassword);
      
      console.log('AuthContext: Password update completed successfully');
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

    let passwordValid = false;
    let needsPasswordChange = false;

    if (passwordData) {
      const storedHash = passwordData.password_hash;
      const testHash = btoa(password + email);
      
      if (storedHash === testHash || storedHash === btoa(password)) {
        console.log('AuthContext: Using stored password for login');
        passwordValid = true;
        needsPasswordChange = passwordData.requires_change === true;
      } else if (password !== 'password') {
        console.log('AuthContext: Invalid password');
        return false;
      }
    }
    
    // If no stored password, only allow default password
    if (!passwordValid && password !== 'password') {
      console.log('AuthContext: Invalid password - no stored password found');
      return false;
    }
    
    // If using default password and no stored password, require change
    if (password === 'password' && !passwordData) {
      needsPasswordChange = true;
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
      
      // Set password change requirement based on analysis above
      if (needsPasswordChange) {
        console.log('AuthContext: Setting password change requirement for system user');
        await supabase
          .from('user_passwords')
          .upsert({
            email: foundUser.email,
            password_hash: btoa(password),
            requires_change: true
          });
      }
      
      setRequiresPasswordChange(needsPasswordChange);
      console.log('AuthContext: Password change required:', needsPasswordChange);
      
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
        
        // Set password change requirement based on analysis above
        if (needsPasswordChange) {
          console.log('AuthContext: Setting password change requirement for employee');
          await supabase
            .from('user_passwords')
            .upsert({
              email: userRecord.email,
              password_hash: btoa(password),
              requires_change: true
            });
        }
        
        setRequiresPasswordChange(needsPasswordChange);
        console.log('AuthContext: Password change required:', needsPasswordChange);
        
        return true;
      }
      
      console.log('AuthContext: No matching employee found for email:', email);
      
    } catch (error) {
      console.error('AuthContext: Error loading employees:', error);
    }

    console.log('AuthContext: Login failed for email:', email);
    return false;
  };

  const logout = async () => {
    console.log('AuthContext: Logging out user:', user);
    
    // Sign out from Supabase Auth (for OAuth users)
    await supabase.auth.signOut();
    
    if (user?.email) {
      // Remove custom session from database (for password users)
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
      loginWithGoogle,
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
