/**
 * Payment Deletion Request Service
 * Handles approval workflow for payment deletions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { deletePayment } from './paymentService';

export interface PaymentDeletionRequest {
  id: string;
  payment_id: string;
  requested_by: string;
  requested_by_email: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined fields
  payment_number?: string;
  payment_amount?: number;
  invoice_number?: string;
  student_name?: string;
}

/**
 * Create a deletion request for a payment
 */
export const createDeletionRequest = async (
  paymentId: string,
  reason?: string
): Promise<PaymentDeletionRequest> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // If a pending request already exists for this payment, return it instead of inserting a duplicate
    const { data: existing } = await supabase
      .from('payment_deletion_requests')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return existing as PaymentDeletionRequest;
    }

    // Get employee ID from email
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('email', user.email)
      .single();

    const { data, error } = await supabase
      .from('payment_deletion_requests')
      .insert([{
        payment_id: paymentId,
        requested_by: employee?.id || user.id,
        requested_by_email: user.email,
        reason: reason || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deletion request: ${error.message}`);
    }

    return data as PaymentDeletionRequest;
  } catch (error) {
    logger.error('Error in createDeletionRequest', error);
    throw error;
  }
};

/**
 * Get all pending deletion requests (for superadmin dashboard)
 */
export const getPendingDeletionRequests = async (): Promise<PaymentDeletionRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_deletion_requests')
      .select(`
        *,
        payments(
          payment_number,
          amount,
          invoices(
            invoice_number,
            students(first_name, last_name)
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending deletion requests: ${error.message}`);
    }

    // Transform the data to include joined fields
    const mapped = (data || []).map((request: any) => ({
      ...request,
      payment_number: request.payments?.payment_number,
      payment_amount: request.payments?.amount,
      invoice_number: request.payments?.invoices?.invoice_number,
      student_name: request.payments?.invoices?.students
        ? `${request.payments.invoices.students.first_name} ${request.payments.invoices.students.last_name}`
        : 'Unknown Student'
    })) as PaymentDeletionRequest[];

    // Defensive dedupe: keep only the most recent pending request per payment_id
    const seen = new Set<string>();
    return mapped.filter((r) => {
      if (seen.has(r.payment_id)) return false;
      seen.add(r.payment_id);
      return true;
    });
  } catch (error) {
    logger.error('Error in getPendingDeletionRequests', error);
    throw error;
  }
};

/**
 * Get count of pending deletion requests
 */
export const getPendingDeletionRequestsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('payment_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch pending count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    logger.error('Error in getPendingDeletionRequestsCount', error);
    return 0;
  }
};

/**
 * Approve a deletion request and execute the payment deletion
 */
export const approveDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the request to find the payment ID
    const { data: request, error: fetchError } = await supabase
      .from('payment_deletion_requests')
      .select('payment_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Deletion request not found');
    }

    // Delete the actual payment
    await deletePayment(request.payment_id);

    // Update request status to approved
    const { error: updateError } = await supabase
      .from('payment_deletion_requests')
      .update({
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request status: ${updateError.message}`);
    }
  } catch (error) {
    logger.error('Error in approveDeletionRequest', error);
    throw error;
  }
};

/**
 * Reject a deletion request
 */
export const rejectDeletionRequest = async (requestId: string): Promise<void> => {
  try {
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('payment_deletion_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      throw new Error(`Failed to reject request: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in rejectDeletionRequest', error);
    throw error;
  }
};

/**
 * Check if a payment has a pending deletion request
 */
export const hasPendingDeletionRequest = async (paymentId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('payment_deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('payment_id', paymentId)
      .eq('status', 'pending');

    if (error) {
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    return false;
  }
};
