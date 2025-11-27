import bcrypt from 'bcryptjs';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Password complexity requirements - modified to handle reset context
export const checkPasswordComplexity = (password: string, isResetContext: boolean = false) => {
  const errors: string[] = [];
  
  // Allow "password" in reset contexts (admin resets)
  if (isResetContext && password === 'password') {
    return {
      isValid: true,
      errors: [],
      isDefaultPassword: true
    };
  }
  
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
    errors,
    isDefaultPassword: false
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

// Check if user is superadmin - directly from Supabase
export const isSuperadmin = async (email: string): Promise<boolean> => {
  logger.debug('Checking superadmin status', { email });
  
  try {
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('id, is_active')
      .eq('employee_email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Error checking superadmin status', error);
      return false;
    }

    const result = !!data;
    logger.info('Superadmin status checked', { email, result });
    return result;
  } catch (error) {
    logger.error('Exception checking superadmin status', error);
    return false;
  }
};

// Log security events directly to Supabase
export const logSecurityEvent = async (params: {
  user_email: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> => {
  logger.info('Logging security event', { action: params.action, email: params.user_email });
  
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
      logger.error('Error logging security event', error);
    } else {
      logger.debug('Security event logged successfully');
    }
  } catch (error) {
    logger.error('Exception logging security event', error);
  }
};

// Check password history from Supabase
export const checkPasswordHistory = async (email: string, newPassword: string): Promise<boolean> => {
  logger.debug('Checking password history', { email });
  
  try {
    const { data, error } = await supabase
      .from('password_history')
      .select('password_hash, salt')
      .eq('email', email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(5); // Check last 5 passwords

    if (error) {
      logger.error('Error checking password history', error);
      return true; // Allow password change if we can't check history
    }

    if (!data || data.length === 0) {
      logger.debug('No password history found, allowing new password');
      return true;
    }

    // Check if new password matches any of the recent passwords
    for (const record of data) {
      const isMatch = await verifyPassword(newPassword, record.password_hash, record.salt);
      if (isMatch) {
        logger.warn('Password was recently used');
        return false;
      }
    }

    logger.debug('Password is not in recent history');
    return true;
  } catch (error) {
    logger.error('Exception checking password history', error);
    return true; // Allow password change if we can't check history
  }
};

// Add password to history in Supabase
export const addPasswordToHistory = async (email: string, passwordHash: string, salt: string): Promise<void> => {
  logger.debug('Adding password to history', { email });
  
  try {
    const { error } = await supabase
      .from('password_history')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        salt
      });

    if (error) {
      logger.error('Error adding password to history', error);
    } else {
      logger.debug('Password added to history successfully');
    }
  } catch (error) {
    logger.error('Exception adding password to history', error);
  }
};

// Check failed login attempts from Supabase
export const checkFailedLoginAttempts = async (email: string): Promise<boolean> => {
  logger.debug('Checking failed login attempts', { email });
  
  try {
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const { data, error } = await supabase
      .from('failed_login_attempts')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .gte('attempt_time', fifteenMinutesAgo.toISOString());

    if (error) {
      logger.error('Error checking failed login attempts', error);
      return false;
    }

    const attemptCount = data?.length || 0;
    logger.info('Failed login attempts in last 15 minutes', { email, attemptCount });
    
    if (attemptCount >= 5) {
      logger.warn('Account locked due to too many failed attempts', { email });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Exception checking failed login attempts', error);
    return false;
  }
};

// Log failed login attempt to Supabase
export const logFailedLoginAttempt = async (email: string, ipAddress?: string): Promise<void> => {
  logger.info('Logging failed login attempt', { email });
  
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: ipAddress || null
      });

    if (error) {
      logger.error('Error logging failed login attempt', error);
    } else {
      logger.debug('Failed login attempt logged successfully');
    }
  } catch (error) {
    logger.error('Exception logging failed login attempt', error);
  }
};

// Clear failed login attempts from Supabase
export const clearFailedLoginAttempts = async (email: string): Promise<void> => {
  logger.debug('Clearing failed login attempts', { email });
  
  try {
    const { error } = await supabase
      .from('failed_login_attempts')
      .delete()
      .eq('email', email.toLowerCase().trim());

    if (error) {
      logger.error('Error clearing failed login attempts', error);
    } else {
      logger.debug('Failed login attempts cleared successfully');
    }
  } catch (error) {
    logger.error('Exception clearing failed login attempts', error);
  }
};

// Initialize superadmin user in Supabase
export const initializeSuperadmin = async (): Promise<void> => {
  logger.info('Initializing superadmin user');
  
  try {
    // Check if superadmin already exists
    const { data: existingSuperadmin } = await supabase
      .from('superadmin_users')
      .select('id')
      .eq('employee_email', 'alhk10@gmail.com')
      .eq('is_active', true)
      .maybeSingle();

    if (existingSuperadmin) {
      logger.debug('Superadmin already exists');
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
      logger.error('Error creating superadmin', error);
    } else {
      logger.info('Superadmin user created successfully');
      
      // Log the event
      await logSecurityEvent({
        user_email: 'alhk10@gmail.com',
        action: 'SUPERADMIN_INITIALIZED',
        details: { created_by: 'SYSTEM', auto_created: true }
      });
    }
  } catch (error) {
    logger.error('Exception initializing superadmin', error);
  }
};
