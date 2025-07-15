import { supabase } from '@/integrations/supabase/client';

export interface LeaveRequest {
  id: number;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  appliedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  medicalCertificate?: string;
}

export const getAllLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    console.log('Fetching all leave requests...');
    
    const { data: leaveData, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employees!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave requests:', error);
      throw error;
    }

    console.log('Raw leave data from database:', leaveData);

    const transformedData: LeaveRequest[] = (leaveData || []).map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employees?.name || 'Unknown Employee',
      type: item.type,
      startDate: item.start_date,
      endDate: item.end_date,
      days: item.days_requested,
      status: item.status,
      reason: item.reason || '',
      appliedOn: item.applied_date ? new Date(item.applied_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      approvedBy: item.reviewed_by,
      approvedOn: item.reviewed_date ? new Date(item.reviewed_date).toISOString().split('T')[0] : undefined,
      medicalCertificate: item.medical_certificate
    }));

    console.log('Transformed leave data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error in getAllLeaveRequests:', error);
    throw error;
  }
};

export const addLeaveRequest = async (leave: Omit<LeaveRequest, 'id'>): Promise<void> => {
  try {
    console.log('Adding new leave request:', leave);

    const insertData = {
      employee_id: leave.employeeId,
      type: leave.type,
      start_date: leave.startDate,
      end_date: leave.endDate,
      days_requested: leave.days,
      reason: leave.reason,
      status: leave.status,
      applied_date: new Date().toISOString(),
      reviewed_by: leave.approvedBy,
      reviewed_date: leave.approvedOn ? new Date(leave.approvedOn).toISOString() : null,
      medical_certificate: leave.medicalCertificate
    };

    console.log('Inserting leave data:', insertData);

    const { error } = await supabase
      .from('leave_requests')
      .insert([insertData]);

    if (error) {
      console.error('Error inserting leave request:', error);
      throw error;
    }

    console.log('Leave request added successfully');
  } catch (error) {
    console.error('Error in addLeaveRequest:', error);
    throw error;
  }
};

export const updateLeaveStatus = async (
  id: number, 
  status: 'Approved' | 'Rejected', 
  reviewedBy?: string
): Promise<void> => {
  try {
    console.log(`Updating leave ${id} status to ${status}`);

    const updateData: any = {
      status,
      reviewed_date: new Date().toISOString()
    };

    if (reviewedBy) {
      updateData.reviewed_by = reviewedBy;
    }

    const { error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating leave status:', error);
      throw error;
    }

    console.log('Leave status updated successfully');
  } catch (error) {
    console.error('Error in updateLeaveStatus:', error);
    throw error;
  }
};

export const getLeaveRequests = getAllLeaveRequests; // Add alias for compatibility
export const updateLeaveRequest = updateLeaveStatus; // Add alias for compatibility
