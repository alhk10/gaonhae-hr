import { supabase } from '@/integrations/supabase/client';

export const createBranchRequest = async (
  employeeId: string,
  employeeName: string,
  currentBranch: string | null,
  requestedBranch: string,
  reason: string
) => {
  const { data, error } = await supabase
    .from('employee_branch_requests' as any)
    .insert({
      employee_id: employeeId,
      employee_name: employeeName,
      current_branch: currentBranch,
      requested_branch: requestedBranch,
      reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPendingBranchRequests = async () => {
  const { data, error } = await supabase
    .from('employee_branch_requests' as any)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as any[];
};

export const getPendingBranchRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('employee_branch_requests' as any)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
};

export const approveBranchRequest = async (requestId: string, reviewedBy: string) => {
  // Get the request first
  const { data: request, error: fetchError } = await supabase
    .from('employee_branch_requests' as any)
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  const req = request as any;

  // Update employee department
  const { error: updateError } = await supabase
    .from('employees')
    .update({ department: req.requested_branch })
    .eq('id', req.employee_id);

  if (updateError) throw updateError;

  // Mark request as approved
  const { error } = await supabase
    .from('employee_branch_requests' as any)
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const rejectBranchRequest = async (requestId: string, reviewedBy: string, reviewNotes?: string) => {
  const { error } = await supabase
    .from('employee_branch_requests' as any)
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const getEmployeePendingBranchRequest = async (employeeId: string) => {
  const { data, error } = await supabase
    .from('employee_branch_requests' as any)
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  return data as any | null;
};
