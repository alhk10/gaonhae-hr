/**
 * Service for managing student profile update requests
 */

import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface StudentUpdateRequest {
  id: string;
  student_id: string;
  requested_changes: Json;
  status: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentUpdateRequestWithDetails extends StudentUpdateRequest {
  student_name?: string;
  student_email?: string;
  reviewer_name?: string;
}

/**
 * Create a new student update request
 */
export const createUpdateRequest = async (
  studentId: string,
  requestedChanges: Record<string, any>
): Promise<StudentUpdateRequest | null> => {
  const { data, error } = await supabase
    .from('student_update_requests')
    .insert({
      student_id: studentId,
      requested_changes: requestedChanges,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating update request:', error);
    throw new Error('Failed to submit update request');
  }

  return data;
};

/**
 * Get all pending update requests for a branch
 */
export const getPendingRequestsByBranch = async (branchId: string): Promise<StudentUpdateRequestWithDetails[]> => {
  const { data, error } = await supabase
    .from('student_update_requests')
    .select(`
      *,
      students!inner(first_name, last_name, email, branch_id)
    `)
    .eq('status', 'pending')
    .eq('students.branch_id', branchId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    student_name: `${(item.students as any)?.first_name || ''} ${(item.students as any)?.last_name || ''}`.trim(),
    student_email: (item.students as any)?.email
  })) || [];
};

/**
 * Get all pending update requests (for superadmin)
 */
export const getAllPendingRequests = async (): Promise<StudentUpdateRequestWithDetails[]> => {
  const { data, error } = await supabase
    .from('student_update_requests')
    .select(`
      *,
      students!inner(first_name, last_name, email, branch_id)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching all pending requests:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    student_name: `${(item.students as any)?.first_name || ''} ${(item.students as any)?.last_name || ''}`.trim(),
    student_email: (item.students as any)?.email
  })) || [];
};

/**
 * Get update requests for a specific student
 */
export const getStudentRequests = async (studentId: string): Promise<StudentUpdateRequest[]> => {
  const { data, error } = await supabase
    .from('student_update_requests')
    .select('*')
    .eq('student_id', studentId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching student requests:', error);
    return [];
  }

  return data || [];
};

/**
 * Approve an update request and apply changes to student
 */
export const approveRequest = async (
  requestId: string,
  reviewerId: string,
  reviewNotes?: string
): Promise<boolean> => {
  // Get the request first
  const { data: request, error: fetchError } = await supabase
    .from('student_update_requests')
    .select(`
      *,
      students!inner(first_name, last_name, email)
    `)
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    console.error('Error fetching request:', fetchError);
    return false;
  }

  // Apply changes to student - cast to object type
  const changes = typeof request.requested_changes === 'object' && request.requested_changes !== null
    ? request.requested_changes as Record<string, any>
    : {};
    
  const { error: updateError } = await supabase
    .from('students')
    .update(changes)
    .eq('id', request.student_id);

  if (updateError) {
    console.error('Error applying changes to student:', updateError);
    return false;
  }

  // Mark request as approved
  const { error: approveError } = await supabase
    .from('student_update_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', requestId);

  if (approveError) {
    console.error('Error marking request as approved:', approveError);
    return false;
  }

  // Send email notification
  const studentData = request.students as any;
  if (studentData?.email) {
    try {
      await supabase.functions.invoke('send-approval-email', {
        body: {
          recipientEmail: studentData.email,
          recipientName: `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim(),
          type: 'approved',
          requestType: 'student_update',
          reviewNotes,
          changesDescription: Object.keys(changes).join(', '),
        },
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails
    }
  }

  return true;
};

/**
 * Reject an update request
 */
export const rejectRequest = async (
  requestId: string,
  reviewerId: string,
  reviewNotes: string
): Promise<boolean> => {
  // Get the request with student info for email
  const { data: request, error: fetchError } = await supabase
    .from('student_update_requests')
    .select(`
      *,
      students!inner(first_name, last_name, email)
    `)
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    console.error('Error fetching request:', fetchError);
    return false;
  }

  const { error } = await supabase
    .from('student_update_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting request:', error);
    return false;
  }

  // Send email notification
  const studentData = request.students as any;
  if (studentData?.email) {
    try {
      const changes = typeof request.requested_changes === 'object' && request.requested_changes !== null
        ? request.requested_changes as Record<string, any>
        : {};
      
      await supabase.functions.invoke('send-approval-email', {
        body: {
          recipientEmail: studentData.email,
          recipientName: `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim(),
          type: 'rejected',
          requestType: 'student_update',
          reviewNotes,
          changesDescription: Object.keys(changes).join(', '),
        },
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }
  }

  return true;
};

/**
 * Get count of pending requests for a branch
 */
export const getPendingRequestsCount = async (branchId?: string): Promise<number> => {
  let query = supabase
    .from('student_update_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (branchId) {
    // Need to join with students to filter by branch
    const { data, error } = await supabase
      .from('student_update_requests')
      .select(`
        id,
        students!inner(branch_id)
      `)
      .eq('status', 'pending')
      .eq('students.branch_id', branchId);

    if (error) {
      console.error('Error counting pending requests:', error);
      return 0;
    }

    return data?.length || 0;
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting pending requests:', error);
    return 0;
  }

  return count || 0;
};
