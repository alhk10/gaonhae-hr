/**
 * Grading Registration Deletion Request Service
 * Handles approval workflow for grading registration deletions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { removeGradingRegistration } from './gradingService';

export interface GradingDeletionRequest {
  id: string;
  registration_id: string;
  student_id: string;
  student_name: string;
  requested_by: string;
  requested_by_email: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Create a deletion request for a grading registration
 */
export const createGradingDeletionRequest = async (
  registrationId: string,
  studentId: string,
  studentName: string,
  reason?: string
): Promise<GradingDeletionRequest> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check for existing pending request
    const { count } = await supabase
      .from('grading_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('registration_id', registrationId)
      .eq('status', 'pending');

    if ((count || 0) > 0) {
      throw new Error('A pending deletion request already exists for this registration');
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('email', user.email)
      .single();

    const { data, error } = await supabase
      .from('grading_deletion_requests')
      .insert([{
        registration_id: registrationId,
        student_id: studentId,
        student_name: studentName,
        requested_by: employee?.id || user.id,
        requested_by_email: user.email,
        reason: reason || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create deletion request: ${error.message}`);
    return data as GradingDeletionRequest;
  } catch (error) {
    logger.error('Error in createGradingDeletionRequest', error);
    throw error;
  }
};

/**
 * Get all pending grading deletion requests
 */
export const getPendingGradingDeletionRequests = async (): Promise<GradingDeletionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('grading_deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch pending requests: ${error.message}`);
    return (data || []) as GradingDeletionRequest[];
  } catch (error) {
    logger.error('Error in getPendingGradingDeletionRequests', error);
    throw error;
  }
};

/**
 * Get count of pending grading deletion requests
 */
export const getPendingGradingDeletionRequestsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('grading_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
};

/**
 * Approve a grading deletion request and execute the deletion
 */
export const approveGradingDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: request, error: fetchError } = await supabase
      .from('grading_deletion_requests')
      .select('registration_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw new Error('Deletion request not found');

    // Delete the actual registration
    await removeGradingRegistration(request.registration_id);

    // Update request status
    const { error: updateError } = await supabase
      .from('grading_deletion_requests')
      .update({
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw new Error(`Failed to update request status: ${updateError.message}`);
  } catch (error) {
    logger.error('Error in approveGradingDeletionRequest', error);
    throw error;
  }
};

/**
 * Reject a grading deletion request
 */
export const rejectGradingDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('grading_deletion_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw new Error(`Failed to reject request: ${error.message}`);
  } catch (error) {
    logger.error('Error in rejectGradingDeletionRequest', error);
    throw error;
  }
};

/**
 * Check if a registration has a pending deletion request
 */
export const hasPendingGradingDeletionRequest = async (registrationId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('grading_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('registration_id', registrationId)
      .eq('status', 'pending');

    if (error) return false;
    return (count || 0) > 0;
  } catch {
    return false;
  }
};
