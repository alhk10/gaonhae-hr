/**
 * Service for managing student authentication
 */

import { supabase } from '@/integrations/supabase/client';
import { createStudentAuthAccount, ProvisioningResult } from './studentAuthProvisioningService';
import { logger } from '@/utils/logger';

export interface StudentAuth {
  id: string;
  student_id: string;
  auth_user_id: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface StudentAuthWithDetails extends StudentAuth {
  student_name?: string;
  student_status?: string;
}

/**
 * Check if an email belongs to a student
 */
export const isStudentEmail = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1);

  if (error) {
    console.error('Error checking student email:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

/**
 * Get student auth record by email
 */
export const getStudentAuthByEmail = async (email: string): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      console.error('Error fetching student auth:', error);
    }
    return null;
  }

  return data;
};

/**
 * Get student auth record by student ID
 */
export const getStudentAuthByStudentId = async (studentId: string): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      console.error('Error fetching student auth:', error);
    }
    return null;
  }

  return data;
};

/**
 * Create a student auth record (links student to auth user)
 */
export const createStudentAuth = async (
  studentId: string,
  email: string,
  authUserId?: string
): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .insert({
      student_id: studentId,
      email: email.toLowerCase(),
      auth_user_id: authUserId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating student auth:', error);
    return null;
  }

  return data;
};

/**
 * Update the auth_user_id for a student (after they create their Supabase account)
 */
export const linkAuthUser = async (
  studentId: string,
  authUserId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('student_auth')
    .update({ auth_user_id: authUserId })
    .eq('student_id', studentId);

  if (error) {
    console.error('Error linking auth user:', error);
    return false;
  }

  return true;
};

/**
 * Get student details by auth user ID
 */
export const getStudentByAuthUserId = async (authUserId: string): Promise<any | null> => {
  const { data: authData, error: authError } = await supabase
    .from('student_auth')
    .select('student_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (authError || !authData) {
    return null;
  }

  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', authData.student_id)
    .single();

  if (studentError) {
    console.error('Error fetching student:', studentError);
    return null;
  }

  return studentData;
};

/**
 * Delete student auth record
 */
export const deleteStudentAuth = async (studentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('student_auth')
    .delete()
    .eq('student_id', studentId);

  if (error) {
    console.error('Error deleting student auth:', error);
    return false;
  }

  return true;
};

/**
 * Get all students with auth setup
 */
export const getStudentsWithAuth = async (): Promise<StudentAuthWithDetails[]> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select(`
      *,
      students!inner(first_name, last_name, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching students with auth:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    student_name: `${(item.students as any)?.first_name || ''} ${(item.students as any)?.last_name || ''}`.trim(),
    student_status: (item.students as any)?.status
  })) || [];
};

/**
 * Check if a student has portal access
 */
export const hasPortalAccess = async (studentId: string): Promise<boolean> => {
  const auth = await getStudentAuthByStudentId(studentId);
  return auth !== null;
};

/**
 * Update the email address in student_auth record
 * Used when a student's email is changed in the students table
 * Also updates the Supabase Auth user's email if they have an active account
 */
export const updateStudentAuthEmail = async (
  studentId: string,
  newEmail: string
): Promise<boolean> => {
  const normalizedEmail = newEmail.toLowerCase().trim();
  
  // First, get the current student_auth record to check if they have an auth_user_id
  const existing = await getStudentAuthByStudentId(studentId);
  
  if (!existing) {
    logger.error('No student_auth record found for student', { studentId });
    return false;
  }

  // Update the student_auth table
  const { error } = await supabase
    .from('student_auth')
    .update({ email: normalizedEmail })
    .eq('student_id', studentId);

  if (error) {
    console.error('Error updating student auth email:', error);
    return false;
  }

  // If the student has a linked Supabase Auth account, update that too via edge function
  if (existing.auth_user_id) {
    try {
      const { data: updateData, error: updateError } = await supabase.functions.invoke('auth-admin', {
        body: {
          action: 'updateUserEmail',
          userId: existing.auth_user_id,
          email: normalizedEmail
        }
      });

      if (updateError) {
        logger.error('Failed to update Supabase Auth email', { error: updateError });
        // Don't fail the whole operation - student_auth was already updated
      } else {
        logger.info('Supabase Auth email updated successfully', { studentId, newEmail: normalizedEmail });
      }
    } catch (authError) {
      logger.error('Error calling auth-admin to update email', authError);
      // Don't fail the whole operation
    }
  }

  return true;
};

/**
 * Enable portal access for an existing student
 * This creates both the student_auth record AND a Supabase Auth account
 */
export const enablePortalAccess = async (
  studentId: string,
  email: string,
  studentName?: string
): Promise<{ success: boolean; error?: string; passwordResetSent?: boolean }> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  logger.info('Enabling portal access for student', { studentId, email: normalizedEmail });
  
  // Check if already has access with auth_user_id
  const existing = await getStudentAuthByStudentId(studentId);
  if (existing && existing.auth_user_id) {
    return { success: false, error: 'Portal access already enabled with active account' };
  }

  // Check if email is already used by another student
  const emailInUse = await getStudentAuthByEmail(normalizedEmail);
  if (emailInUse && emailInUse.student_id !== studentId) {
    return { success: false, error: 'Email already linked to another student' };
  }

  // Get student name if not provided
  let name = studentName;
  if (!name) {
    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name')
      .eq('id', studentId)
      .single();
    
    if (student) {
      name = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    }
  }

  // Step 1: Create the Supabase Auth account
  const authResult = await createStudentAuthAccount(studentId, normalizedEmail, name || 'Student');
  
  if (!authResult.success) {
    logger.error('Failed to create auth account', { error: authResult.error });
    return { success: false, error: authResult.error };
  }

  // Step 2: Create or update student_auth record with auth_user_id
  if (existing) {
    // Update existing record with auth_user_id
    const { error: updateError } = await supabase
      .from('student_auth')
      .update({ auth_user_id: authResult.authUserId })
      .eq('student_id', studentId);
    
    if (updateError) {
      logger.error('Failed to update student_auth with auth_user_id', { error: updateError });
      return { success: false, error: 'Account created but failed to link. Please contact support.' };
    }
  } else {
    // Create new student_auth record
    const result = await createStudentAuth(studentId, normalizedEmail, authResult.authUserId);
    if (!result) {
      return { success: false, error: 'Account created but failed to create portal record. Please contact support.' };
    }
  }

  logger.info('Portal access enabled successfully', { 
    studentId, 
    authUserId: authResult.authUserId,
    passwordResetSent: authResult.passwordResetSent 
  });
  
  return { 
    success: true, 
    passwordResetSent: authResult.passwordResetSent 
  };
};

/**
 * Revoke portal access for a student
 */
export const revokePortalAccess = async (studentId: string): Promise<boolean> => {
  return deleteStudentAuth(studentId);
};

/**
 * Bulk enable portal access for multiple students
 */
export const bulkEnablePortalAccess = async (
  students: Array<{ id: string; email: string; name?: string }>
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const student of students) {
    if (!student.email) {
      failed++;
      errors.push(`Student ${student.id}: No email address`);
      continue;
    }

    // Add a small delay between accounts to avoid rate limiting
    if (success > 0 || failed > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await enablePortalAccess(student.id, student.email, student.name);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`Student ${student.id}: ${result.error}`);
    }
  }

  return { success, failed, errors };
};
