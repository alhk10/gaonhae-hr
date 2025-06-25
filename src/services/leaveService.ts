
import { supabase } from "@/integrations/supabase/client";

export interface LeaveRequest {
  id: number;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string | null;
  appliedOn: string;
  approvedBy?: string | null;
  approvedOn?: string | null;
  medicalCertificate?: string | null;
}

export const getAllLeaveRequests = async (): Promise<LeaveRequest[]> => {
  console.log('Fetching all leave requests from Supabase...');
  
  const { data: requests, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .order('applied_date', { ascending: false });

  if (error) {
    console.error('Error fetching leave requests:', error);
    throw error;
  }

  return requests.map(request => ({
    id: request.id,
    employeeId: request.employee_id,
    employeeName: (request.employees as any)?.name || 'Unknown',
    type: request.type,
    startDate: request.start_date,
    endDate: request.end_date,
    days: request.days_requested,
    status: request.status as 'Pending' | 'Approved' | 'Rejected',
    reason: request.reason,
    appliedOn: request.applied_date || new Date().toISOString().split('T')[0],
    approvedBy: request.reviewed_by,
    approvedOn: request.reviewed_date,
    medicalCertificate: request.medical_certificate
  }));
};

export const addLeaveRequest = async (leaveData: Omit<LeaveRequest, 'id'>): Promise<void> => {
  console.log('Adding new leave request:', leaveData);
  
  const { error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: leaveData.employeeId,
      type: leaveData.type,
      start_date: leaveData.startDate,
      end_date: leaveData.endDate,
      days_requested: leaveData.days,
      status: leaveData.status,
      reason: leaveData.reason,
      applied_date: leaveData.appliedOn,
      reviewed_by: leaveData.approvedBy,
      reviewed_date: leaveData.approvedOn
    });

  if (error) {
    console.error('Error adding leave request:', error);
    throw error;
  }
};

export const updateLeaveStatus = async (
  id: number, 
  status: 'Approved' | 'Rejected', 
  reviewedBy?: string
): Promise<void> => {
  console.log('Updating leave request status:', id, status);
  
  const { error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating leave request status:', error);
    throw error;
  }
};
