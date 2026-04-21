import { supabase } from '@/integrations/supabase/client';

export const createWithdrawalRequest = async (
  studentId: string,
  studentName: string,
  branchId: string,
  requestedBy: string
) => {
  // Check for existing pending request
  const { data: existing } = await supabase
    .from('student_withdrawal_requests' as any)
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    throw new Error('A withdrawal request is already pending for this student');
  }

  const { error } = await supabase
    .from('student_withdrawal_requests' as any)
    .insert({
      student_id: studentId,
      student_name: studentName,
      branch_id: branchId,
      requested_by: requestedBy,
    });

  if (error) throw error;
};

export const getPendingWithdrawalRequests = async () => {
  const { data, error } = await supabase
    .from('student_withdrawal_requests' as any)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getPendingWithdrawalRequestsCount = async () => {
  const { count, error } = await supabase
    .from('student_withdrawal_requests' as any)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
};

export const approveWithdrawalRequest = async (requestId: string, reviewedBy: string) => {
  // Get the request to find student_id
  const { data: request, error: fetchError } = await supabase
    .from('student_withdrawal_requests' as any)
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) throw fetchError || new Error('Request not found');

  // Update student status to withdrawn
  const { error: studentError } = await supabase
    .from('students')
    .update({ status: 'withdrawn' } as any)
    .eq('id', (request as any).student_id);

  if (studentError) throw studentError;

  // Mark request as approved
  const { error } = await supabase
    .from('student_withdrawal_requests' as any)
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const directWithdrawStudent = async (studentId: string) => {
  const { error } = await supabase
    .from('students')
    .update({ status: 'withdrawn' } as any)
    .eq('id', studentId);

  if (error) throw error;
};

export const rejectWithdrawalRequest = async (requestId: string, reviewedBy: string, notes?: string) => {
  const { error } = await supabase
    .from('student_withdrawal_requests' as any)
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', requestId);

  if (error) throw error;
};
