import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { getCurrentDeviceId } from '@/utils/deviceFingerprint';
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

// Define session type to include device_id
interface UserSession {
  id: string;
  user_id: string;
  email: string;
  device_id: string;
  session_data: any;
  expires_at: string;
  last_activity: string;
  logout_reason: string;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to determine user role based on admin permissions
const determineUserRole = async (email: string, adminAccess: any): Promise<'superadmin' | 'manager' | 'employee'> => {
  console.log('AuthContext: Determining role for:', email);
  
  // First check if user is superadmin - this should be the ONLY way to get superadmin role
  const isUserSuperadmin = await isSuperadmin(email);
  console.log('AuthContext: Superadmin check result for', email, ':', isUserSuperadmin);
  
  if (isUserSuperadmin) {
    console.log('AuthContext: User is confirmed superadmin');
    return 'superadmin';
  }
  
  if (!adminAccess) {
    console.log('AuthContext: No admin access found, assigning employee role');
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

  // Require at least 4 permissions to be considered a manager (more restrictive)
  if (permissions >= 4) {
    console.log('AuthContext: User has sufficient permissions - assigning manager role');
    return 'manager';
  }
  
  console.log('AuthContext: User has limited permissions - keeping as employee with specific admin access');
  return 'employee';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  // Auto-logout handler for inactivity
  const handleAutoLogout = async () => {
    console.log('AuthContext: Auto-logout triggered due to inactivity');
    
    if (user?.email) {
      // Log auto-logout event
      await logSecurityEvent({
        user_email: user.email,
        action: 'AUTO_LOGOUT',
        details: { reason: 'inactivity_timeout', timeout_seconds: 30 }
      });

      // Clear user-specific session from Supabase
      await clearUserSession(user.email);
    }
    
    setUser(null);
    setRequiresPasswordChange(false);
  };

  // Update last activity in database
  const updateLastActivity = async () => {
    if (user?.email) {
      const deviceId = getCurrentDeviceId();
      await supabase
        .from('user_sessions')
        .update({ 
          last_activity: new Date().toISOString()
        })
        .eq('email', user.email)
        .eq('device_id', deviceId);
    }
  };

  // Clear user-specific sessions
  const clearUserSession = async (email: string) => {
    const deviceId = getCurrentDeviceId();
    
    // Update session with logout reason
    await supabase
      .from('user_sessions')
      .update({ 
        logout_reason: 'manual',
        last_activity: new Date().toISOString()
      })
      .eq('email', email)
      .eq('device_id', deviceId);

    // Remove session from Supabase
    await supabase
      .from('user_sessions')
      .delete()
      .eq('email', email)
      .eq('device_id', deviceId);
  };

  // Initialize inactivity timer - 30 seconds timeout
  const { resetTimer } = useInactivityTimer({
    timeout: 30000, // 30 seconds
    onTimeout: handleAutoLogout,
    enabled: !!user && !requiresPasswordChange
  });

  useEffect(() => {
    // Initialize the security system and check for sessions
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        
        // Initialize superadmin user first
        await initializeSuperadmin();
        
        // Get current device ID for session isolation
        const deviceId = getCurrentDeviceId();
        console.log('AuthContext: Current device ID:', deviceId);
        
        // Check for active sessions ONLY for this device and not expired
        const { data: sessionsData, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('device_id', deviceId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('AuthContext: Error checking sessions:', error);
          setIsLoading(false);
          return;
        }

        if (sessionsData && sessionsData.length > 0) {
          const sessionData = sessionsData[0] as UserSession;
          console.log('AuthContext: Loading stored user session for:', sessionData.email, 'on device:', deviceId);
          
          // CRITICAL: Verify the session data integrity and re-validate the user
          const userData = sessionData.session_data as User;
          
          // SECURITY CHECK: Ensure session belongs to current device
          if (sessionData.device_id !== deviceId) {
            console.error('AuthContext: Session device mismatch - potential security issue');
            await supabase.from('user_sessions').delete().eq('id', sessionData.id);
            setIsLoading(false);
            return;
          }
          
          // Re-validate user role and permissions from database
          console.log('AuthContext: Re-validating user role for session restore...');
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === sessionData.email);
          
          if (!employee) {
            console.error('AuthContext: Employee not found during session restore, logging out');
            await supabase.from('user_sessions').delete().eq('id', sessionData.id);
            setIsLoading(false);
            return;
          }

          // Get fresh admin access data
          const { data: adminAccess } = await supabase
            .from('admin_access')
            .select('*')
            .eq('employee_id', employee.id)
            .single();

          // Re-determine role with fresh data
          const freshRole = await determineUserRole(sessionData.email, adminAccess);
          
          // CRITICAL SECURITY CHECK: Validate that the session user matches the employee
          const userEmployeeId = userData.employeeId || userData.id;
          if (employee.email !== sessionData.email || employee.id !== userEmployeeId) {
            console.error('AuthContext: Identity mismatch during session restore', {
              sessionEmail: sessionData.email,
              employeeEmail: employee.email,
              sessionEmployeeId: userEmployeeId,
              actualEmployeeId: employee.id
            });
            await supabase.from('user_sessions').delete().eq('id', sessionData.id);
            setIsLoading(false);
            return;
          }
          
          // Create validated user record
          const validatedUser: User = {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: freshRole,
            department: employee.branch,
            employeeId: employee.id
          };
          
          console.log('AuthContext: Session restored with validated role:', freshRole, 'for user:', employee.email);
          setUser(validatedUser);
          
          // Update last activity on session restore
          await updateLastActivity();
          
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
          console.log('AuthContext: No active session found for this device');
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
      const deviceId = getCurrentDeviceId();
      
      // Save user session to Supabase with device isolation
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      // CRITICAL: Create new session instead of upsert to prevent overwriting
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userData.id,
          email: userData.email,
          device_id: deviceId,
          session_data: userData as any, // Cast to any to satisfy Json type
          expires_at: expiresAt.toISOString(),
          last_activity: new Date().toISOString(),
          logout_reason: null
        });

      if (sessionError) {
        console.error('AuthContext: Error saving session:', sessionError);
        return;
      }

      // Log successful login with device info
      await logSecurityEvent({
        user_email: userData.email,
        action: 'LOGIN_SUCCESS',
        details: { 
          role: userData.role, 
          device_id: deviceId,
          employee_id: userData.employeeId 
        }
      });
      
      console.log('AuthContext: User session saved successfully for device:', deviceId);
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
      // Check password complexity (not in reset context for user updates)
      const complexityResult = checkPasswordComplexity(newPassword, false);
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
        details: { complexity_met: true, changed_from_default: true }
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
        // Check if password change is required (both flags or default password)
        needsPasswordChange = passwordData.requires_change === true || 
                             passwordData.must_change_password === true ||
                             password === 'password'; // Force change if using default password
      }
    } else {
      // If no stored password, allow default password for new users
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
      
      // Find employee with matching email - STRICT EMAIL MATCHING
      const employee = employees.find(emp => emp.email?.toLowerCase().trim() === email.toLowerCase().trim());
      
      if (employee) {
        console.log('AuthContext: Employee found:', employee.name, 'ID:', employee.id, 'Email:', employee.email);
        
        // Get admin access permissions for this specific employee
        const { data: adminAccess } = await supabase
          .from('admin_access')
          .select('*')
          .eq('employee_id', employee.id)
          .single();

        console.log('AuthContext: Admin access for employee ID', employee.id, ':', adminAccess);
        
        // Determine role based on admin permissions and superadmin status
        const userRole = await determineUserRole(email, adminAccess);
        console.log('AuthContext: Determined role for', email, ':', userRole);
        
        // CRITICAL: Ensure employee ID matches between user record and employee data
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: userRole,
          department: employee.branch,
          employeeId: employee.id
        };
        
        console.log('AuthContext: Created user record:', {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
          employeeId: userRecord.employeeId
        });
        
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
                requires_change: true,
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

      // Clear user-specific session
      await clearUserSession(user.email);
    }
    
    setUser(null);
    setRequiresPasswordChange(false);
  };

  // Periodically update last activity
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      updateLastActivity();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Debug log current user state
  useEffect(() => {
    console.log('AuthContext: Current user state changed:', {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      employeeId: user?.employeeId
    });
    console.log('AuthContext: requiresPasswordChange state:', requiresPasswordChange);
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
