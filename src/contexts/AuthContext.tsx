
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  checkPasswordComplexity,
  isSuperadmin,
  logSecurityEvent,
  checkPasswordHistory,
  addPasswordToHistory,
  checkFailedLoginAttempts,
  logFailedLoginAttempt,
  clearFailedLoginAttempts,
  initializeSuperadmin
} from '@/services/securityService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to determine user role based on admin permissions
const determineUserRole = async (email: string, adminAccess: any): Promise<'superadmin' | 'manager' | 'employee'> => {
  console.log('AuthContext: Determining role for:', email);
  
  // First check if user is superadmin
  const isUserSuperadmin = await isSuperadmin(email);
  if (isUserSuperadmin) {
    console.log('AuthContext: User is superadmin');
    return 'superadmin';
  }
  
  if (!adminAccess) {
    return 'employee';
  }

  // Count how many admin permissions are enabled
  const permissions = [
    adminAccess.employees,
    adminAccess.payroll,
    adminAccess.leave_management,
    adminAccess.claims,
    adminAccess.attendance,
    adminAccess.slot_booking,
    adminAccess.reports
  ].filter(Boolean).length;

  console.log('AuthContext: Admin permissions count:', permissions);

  // If user has some permissions (but not superadmin), they are manager
  if (permissions > 0) {
    console.log('AuthContext: User has partial permissions - assigning manager role');
    return 'manager';
  }
  
  // If user has no permissions, they are employee
  console.log('AuthContext: User has no permissions - assigning employee role');
  return 'employee';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    // Initialize the security system and check for sessions
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        
        // Initialize superadmin user first
        await initializeSuperadmin();
        
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
          
          // Check password change requirement
          const { data: passwordData, error: pwError } = await supabase
            .from('user_passwords')
            .select('requires_change, must_change_password')
            .eq('email', sessionData.email)
            .single();
          
          if (!pwError && passwordData) {
            // Set password change requirement if either flag is true
            const needsPasswordChange = passwordData.requires_change === true || passwordData.must_change_password === true;
            console.log('AuthContext: Password change required on init:', needsPasswordChange);
            setRequiresPasswordChange(needsPasswordChange);
          }
        } else {
          console.log('AuthContext: No active session found');
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

      // Log successful login
      await logSecurityEvent({
        user_email: userData.email,
        action: 'LOGIN_SUCCESS',
        details: { role: userData.role }
      });
      
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
      // Check password complexity
      const complexityResult = checkPasswordComplexity(newPassword);
      if (!complexityResult.isValid) {
        console.error('AuthContext: Password complexity check failed:', complexityResult.errors);
        return false;
      }

      // Check password history
      const isPasswordReused = !(await checkPasswordHistory(user.email, newPassword));
      if (isPasswordReused) {
        console.error('AuthContext: Password was recently used');
        return false;
      }

      // Generate salt and hash password
      const salt = generateSalt();
      const passwordHash = await hashPassword(newPassword, salt);
      
      console.log('AuthContext: Updating password in database...');
      
      const { error: updateError } = await supabase
        .from('user_passwords')
        .upsert({
          email: user.email,
          password_hash: passwordHash,
          salt: salt,
          requires_change: false,
          must_change_password: false,
          password_complexity_met: true,
          last_password_change: new Date().toISOString(),
          failed_attempts: 0,
          locked_until: null
        }, {
          onConflict: 'email'
        });

      if (updateError) {
        console.error('AuthContext: Database update error:', updateError);
        return false;
      }

      // Add password to history
      await addPasswordToHistory(user.email, passwordHash, salt);
      
      // Log password change
      await logSecurityEvent({
        user_email: user.email,
        action: 'PASSWORD_CHANGE',
        details: { complexity_met: true }
      });
      
      console.log('AuthContext: Password updated successfully');
      
      // Update session with new password info
      await saveUserSession(user, newPassword);
      
      // Update local state - this is the key fix
      console.log('AuthContext: Updating local state - setting requiresPasswordChange to false');
      setRequiresPasswordChange(false);
      
      console.log('AuthContext: Password update completed successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Error updating password:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login with:', email);
    
    // Check if account is locked due to failed attempts
    const isAccountLocked = await checkFailedLoginAttempts(email);
    if (isAccountLocked) {
      console.log('AuthContext: Account is locked due to failed attempts');
      await logSecurityEvent({
        user_email: email,
        action: 'LOGIN_ATTEMPT_LOCKED',
        details: { reason: 'Too many failed attempts' }
      });
      return false;
    }
    
    // Check stored passwords first
    const { data: passwordData, error: pwError } = await supabase
      .from('user_passwords')
      .select('password_hash, salt, requires_change, must_change_password, locked_until')
      .eq('email', email)
      .single();

    let passwordValid = false;
    let needsPasswordChange = false;

    if (!pwError && passwordData) {
      // Check if account is locked
      if (passwordData.locked_until && new Date(passwordData.locked_until) > new Date()) {
        console.log('AuthContext: Account is locked until:', passwordData.locked_until);
        await logSecurityEvent({
          user_email: email,
          action: 'LOGIN_ATTEMPT_LOCKED',
          details: { locked_until: passwordData.locked_until }
        });
        return false;
      }

      if (passwordData.salt) {
        // Use secure password verification
        passwordValid = await verifyPassword(password, passwordData.password_hash, passwordData.salt);
      } else {
        // Legacy password check (for migration purposes)
        const testHash = btoa(password + email);
        passwordValid = passwordData.password_hash === testHash || passwordData.password_hash === btoa(password);
      }
      
      if (passwordValid) {
        needsPasswordChange = passwordData.requires_change === true || passwordData.must_change_password === true;
      }
    } else {
      // If no stored password, only allow default password for new users
      if (password === 'password') {
        passwordValid = true;
        needsPasswordChange = true;
      }
    }
    
    if (!passwordValid) {
      console.log('AuthContext: Invalid password');
      await logFailedLoginAttempt(email);
      await logSecurityEvent({
        user_email: email,
        action: 'LOGIN_FAILED',
        details: { reason: 'Invalid password' }
      });
      return false;
    }

    // Clear failed login attempts on successful authentication
    await clearFailedLoginAttempts(email);
    
    // Load all employees from database for regular employee login
    try {
      console.log('AuthContext: Loading employees from database...');
      const employees = await getEmployees();
      console.log('AuthContext: Loaded employees:', employees.length);
      
      // Find employee with matching email
      const employee = employees.find(emp => emp.email === email);
      
      if (employee) {
        console.log('AuthContext: Employee found:', employee);
        
        // Get admin access permissions for this employee
        const { data: adminAccess } = await supabase
          .from('admin_access')
          .select('*')
          .eq('employee_id', employee.id)
          .single();

        console.log('AuthContext: Admin access for employee:', adminAccess);
        
        // Determine role based on admin permissions and superadmin status
        const userRole = await determineUserRole(email, adminAccess);
        console.log('AuthContext: Determined role:', userRole);
        
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: userRole,
          department: employee.branch,
          employeeId: employee.id
        };
        
        console.log('AuthContext: Created user record with role:', userRecord.role);
        
        setUser(userRecord);
        await saveUserSession(userRecord, password);
        
        // Set password change requirement if needed
        if (needsPasswordChange) {
          console.log('AuthContext: Setting password change requirement for employee');
          // Create or update password record if using default password
          if (password === 'password') {
            const salt = generateSalt();
            const hashedPassword = await hashPassword(password, salt);
            await supabase
              .from('user_passwords')
              .upsert({
                email: userRecord.email,
                password_hash: hashedPassword,
                salt: salt,
                requires_change: false,
                must_change_password: true,
                password_complexity_met: false
              });
          }
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
    await logFailedLoginAttempt(email);
    await logSecurityEvent({
      user_email: email,
      action: 'LOGIN_FAILED',
      details: { reason: 'Employee not found' }
    });
    return false;
  };

  const logout = async () => {
    console.log('AuthContext: Logging out user:', user);
    
    if (user?.email) {
      // Log logout event
      await logSecurityEvent({
        user_email: user.email,
        action: 'LOGOUT',
        details: { role: user.role }
      });

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
