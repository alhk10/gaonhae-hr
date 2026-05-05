/**
 * Student Auth Provisioning Service
 * Creates Supabase Auth accounts for students to enable portal access
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Generate a secure temporary password
 */
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const buf = new Uint32Array(16);
  crypto.getRandomValues(buf);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(buf[i] % chars.length);
  }
  return password;
};

export interface ProvisioningResult {
  success: boolean;
  authUserId?: string;
  error?: string;
  passwordResetSent?: boolean;
}

/**
 * Create a Supabase Auth account for a student
 * This creates the auth user and sends a password reset email
 */
export const createStudentAuthAccount = async (
  studentId: string,
  email: string,
  name: string
): Promise<ProvisioningResult> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  logger.info('Creating student auth account', { studentId, email: normalizedEmail });
  
  try {
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    
    // Create the auth account using signUp
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: name,
          student_id: studentId,
          user_type: 'student'
        }
      }
    });
    
    if (error) {
      logger.error('Failed to create student auth account', { error: error.message });
      
      // Check if user already exists
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        // Try to find existing user - we can't directly query auth.users, 
        // so we'll indicate the email is in use
        return { 
          success: false, 
          error: 'This email is already registered. The student may already have an account.' 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    if (!data.user) {
      return { success: false, error: 'Failed to create user account' };
    }
    
    logger.info('Auth account created successfully', { authUserId: data.user.id });
    
    // Send password reset email so student can set their own password
    let passwordResetSent = false;
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (resetError) {
        logger.warn('Failed to send password reset email', { error: resetError.message });
      } else {
        passwordResetSent = true;
        logger.info('Password reset email sent', { email: normalizedEmail });
      }
    } catch (resetErr) {
      logger.warn('Exception sending password reset email', resetErr);
    }
    
    return { 
      success: true, 
      authUserId: data.user.id,
      passwordResetSent
    };
    
  } catch (err: any) {
    logger.error('Exception creating student auth account', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Check if an email is already registered in Supabase Auth
 * Note: This is a best-effort check since we can't directly query auth.users
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  // We can't directly check auth.users from the client
  // The signup flow will tell us if the email is taken
  // For now, we check if there's an employee with this email
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  
  return data !== null;
};

/**
 * Send a password reset email to an existing student
 */
export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    if (error) {
      logger.error('Failed to send password reset', { error: error.message });
      return false;
    }
    
    return true;
  } catch (err) {
    logger.error('Exception sending password reset', err);
    return false;
  }
};
