
import bcrypt from 'bcryptjs';
import { supabase } from '@/integrations/supabase/client';

// Password complexity requirements
export const checkPasswordComplexity = (password: string) => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Must contain at least one special character (@$!%*?&)');
  }
  
  if (password.toLowerCase() === 'password') {
    errors.push('Cannot be "password"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate random salt
export const generateSalt = (): string => {
  return bcrypt.genSaltSync(12);
};

// Hash password with salt
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  return bcrypt.hash(password, salt);
};

// Verify password against hash
export const verifyPassword = async (password: string, hash: string, salt: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Check if user is superadmin - updated to use correct schema
export const isSuperadmin = async (email: string): Promise<boolean> => {
  console.log('SecurityService: Checking superadmin status for:', email);
  
  try {
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('id')
      .eq('employee_email', email)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('SecurityService: Error checking superadmin status:', error);
      return false;
    }

    const result = !!data;
    console.log('SecurityService: Superadmin status for', email, ':', result);
    return result;
  } catch (error) {
    console.error('SecurityService: Exception checking superadmin status:', error);
    return false;
  }
};

// Log security events
export const logSecurityEvent = async (params: {
  user_email: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> => {
  console.log('SecurityService: Logging security event:', params.action, 'for', params.user_email);
  
  try {
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        user_email: params.user_email,
        action: params.action,
        details: params.details || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null
      });

    if (error) {
      console.error('SecurityService: Error logging security event:', error);
    } else {
      console.log('SecurityService: Security event logged successfully');
    }
  } catch (error) {
    console.error('SecurityService: Exception logging security event:', error);
  }
};

// Check password history to prevent reuse
export const checkPasswordHistory = async (email: string, newPassword: string): Promise<boolean> => {
  console.log('SecurityService: Checking password history for:', email);
  
  try {
    const { data, error } = await supabase
      .from('password_history')
      .select('password_hash, salt')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5); // Check last 5 passwords

    if (error) {
      console.error('SecurityService: Error checking password history:', error);
      return true; // Allow password change if we can't check history
    }

    if (!data || data.length === 0) {
      console.log('SecurityService: No password history found, allowing new password');
      return true;
    }

    // Check if new password matches any of the recent passwords
    for (const record of data) {
      const isMatch = await verifyPassword(newPassword, record.password_hash, record.salt);
      if (isMatch) {
        console.log('SecurityService: Password was recently used');
        return false;
      }
    }

    console.log('SecurityService: Password is not in recent history');
    return true;
  } catch (error) {
    console.error('SecurityService: Exception checking password history:', error);
    return true; // Allow password change if we can't check history
  }
};

// Add password to history
export const addPasswordToHistory = async (email: string, passwordHash: string, salt: string): Promise<void> => {
  console.log('SecurityService: Adding password to history for:', email);
  
  try {
    const { error } = await supabase
      .from('password_history')
      .insert({
        email,
        password_hash: passwordHash,
        salt
      });

    if (error) {
      console.error('SecurityService: Error adding password to history:', error);
    } else {
      console.log('SecurityService: Password added to history successfully');
    }
  } catch (error) {
    console.error('SecurityService: Exception adding password to history:', error);
  }
};

// Check failed login attempts and lock account if needed
export const checkFailedLoginAttempts = async (email: string): Promise<boolean> => {
  console.log('SecurityService: Checking failed login attempts for:', email);
  
  try {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const { data, error } = await supabase
      .from('failed_login_attempts')
      .select('id')
      .eq('email', email)
      .gte('attempt_time', fifteenMinutesAgo.toISOString());

    if (error) {
      console.error('SecurityService: Error checking failed login attempts:', error);
      return false;
    }

    const attemptCount = data?.length || 0;
    console.log('SecurityService: Failed login attempts in last 15 minutes:', attemptCount);
    
    if (attemptCount >= 5) {
      console.log('SecurityService: Account locked due to too many failed attempts');
      return true;
    }

    return false;
  } catch (error) {
    console.error('SecurityService: Exception checking failed login attempts:', error);
    return false;
  }
};

// Log failed login attempt
export const logFailedLoginAttempt = async (email: string, ipAddress?: string): Promise<void> => {
  console.log('SecurityService: Logging failed login attempt for:', email);
  
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .insert({
        email,
        ip_address: ipAddress || null
      });

    if (error) {
      console.error('SecurityService: Error logging failed login attempt:', error);
    } else {
      console.log('SecurityService: Failed login attempt logged successfully');
    }
  } catch (error) {
    console.error('SecurityService: Exception logging failed login attempt:', error);
  }
};

// Clear failed login attempts after successful login
export const clearFailedLoginAttempts = async (email: string): Promise<void> => {
  console.log('SecurityService: Clearing failed login attempts for:', email);
  
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('SecurityService: Error clearing failed login attempts:', error);
    } else {
      console.log('SecurityService: Failed login attempts cleared successfully');
    }
  } catch (error) {
    console.error('SecurityService: Exception clearing failed login attempts:', error);
  }
};

// Generate secure password
export const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special char
  
  // Fill remaining length with random characters
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Initialize superadmin user
export const initializeSuperadmin = async (): Promise<void> => {
  console.log('SecurityService: Initializing superadmin user...');
  
  try {
    // Check if superadmin already exists
    const { data: existingSuperadmin } = await supabase
      .from('superadmin_users')
      .select('id')
      .eq('employee_email', 'alhk10@gmail.com')
      .eq('is_active', true)
      .single();

    if (existingSuperadmin) {
      console.log('SecurityService: Superadmin already exists');
      return;
    }

    // Add the superadmin user
    const { error } = await supabase
      .from('superadmin_users')
      .insert({
        employee_email: 'alhk10@gmail.com',
        employee_name: 'System Administrator',
        created_by: 'SYSTEM',
        notes: 'Initial system superadmin - automatically created'
      });

    if (error) {
      console.error('SecurityService: Error creating superadmin:', error);
    } else {
      console.log('SecurityService: Superadmin user created successfully');
      
      // Log the event
      await logSecurityEvent({
        user_email: 'alhk10@gmail.com',
        action: 'SUPERADMIN_INITIALIZED',
        details: { created_by: 'SYSTEM', auto_created: true }
      });
    }
  } catch (error) {
    console.error('SecurityService: Exception initializing superadmin:', error);
  }
};
