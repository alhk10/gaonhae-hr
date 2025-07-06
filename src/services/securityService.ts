
import { supabase } from '@/integrations/supabase/client';

// Password complexity requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export interface PasswordComplexityResult {
  isValid: boolean;
  errors: string[];
}

export interface SecurityAuditLog {
  user_email: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

// Generate cryptographically secure salt
export const generateSalt = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Hash password with salt using Web Crypto API
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Verify password against hash
export const verifyPassword = async (password: string, hash: string, salt: string): Promise<boolean> => {
  const hashedPassword = await hashPassword(password, salt);
  return hashedPassword === hash;
};

// Check password complexity
export const checkPasswordComplexity = (password: string): PasswordComplexityResult => {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }
  
  if (password.toLowerCase() === 'password') {
    errors.push('Password cannot be "password"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure random password
export const generateSecurePassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
};

// Check if user is superadmin
export const isSuperadmin = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_superadmin', { user_email: email });
    if (error) {
      console.error('Error checking superadmin status:', error);
      return false;
    }
    return data || false;
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }
};

// Log security event
export const logSecurityEvent = async (auditLog: SecurityAuditLog): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_user_email: auditLog.user_email,
      p_action: auditLog.action,
      p_details: auditLog.details || null,
      p_ip_address: auditLog.ip_address || null,
      p_user_agent: auditLog.user_agent || null
    });
    
    if (error) {
      console.error('Error logging security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// Check password history to prevent reuse
export const checkPasswordHistory = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const { data: history, error } = await supabase
      .from('password_history')
      .select('password_hash, salt')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5); // Check last 5 passwords

    if (error) {
      console.error('Error checking password history:', error);
      return true; // Allow if we can't check history
    }

    if (!history || history.length === 0) {
      return true; // No history, allow new password
    }

    // Check if new password matches any in history
    for (const entry of history) {
      const isMatch = await verifyPassword(newPassword, entry.password_hash, entry.salt);
      if (isMatch) {
        return false; // Password was used before
      }
    }

    return true; // Password is not in history
  } catch (error) {
    console.error('Error checking password history:', error);
    return true; // Allow if we can't check history
  }
};

// Add password to history
export const addPasswordToHistory = async (email: string, passwordHash: string, salt: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('password_history')
      .insert({
        email,
        password_hash: passwordHash,
        salt
      });

    if (error) {
      console.error('Error adding password to history:', error);
    }
  } catch (error) {
    console.error('Error adding password to history:', error);
  }
};

// Check for failed login attempts
export const checkFailedLoginAttempts = async (email: string): Promise<boolean> => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('failed_login_attempts')
      .select('id')
      .eq('email', email)
      .gte('attempt_time', fiveMinutesAgo);

    if (error) {
      console.error('Error checking failed login attempts:', error);
      return false;
    }

    return (data?.length || 0) >= 5; // Account locked if 5+ attempts in 5 minutes
  } catch (error) {
    console.error('Error checking failed login attempts:', error);
    return false;
  }
};

// Log failed login attempt
export const logFailedLoginAttempt = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .insert({
        email,
        ip_address: 'unknown', // In a real app, you'd get this from the request
        attempt_time: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging failed login attempt:', error);
    }
  } catch (error) {
    console.error('Error logging failed login attempt:', error);
  }
};

// Clear failed login attempts after successful login
export const clearFailedLoginAttempts = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Error clearing failed login attempts:', error);
    }
  } catch (error) {
    console.error('Error clearing failed login attempts:', error);
  }
};
