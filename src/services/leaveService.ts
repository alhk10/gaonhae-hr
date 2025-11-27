import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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
    logger.debug('Fetching all leave requests');
    
    const { data: leaveData, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employees!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching leave requests:', error);
      throw error;
    }

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

    logger.debug(`Fetched ${transformedData.length} leave requests`);
    return transformedData;
  } catch (error) {
    logger.error('Error in getAllLeaveRequests:', error);
    throw error;
  }
};

export const addLeaveRequest = async (leave: Omit<LeaveRequest, 'id'>): Promise<void> => {
  try {
    logger.debug('Adding new leave request', { employeeId: leave.employeeId, type: leave.type });

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

    const { error } = await supabase
      .from('leave_requests')
      .insert([insertData]);

    if (error) {
      logger.error('Error inserting leave request:', error);
      throw error;
    }

    logger.info('Leave request added successfully');
  } catch (error) {
    logger.error('Error in addLeaveRequest:', error);
    throw error;
  }
};

export const updateLeaveStatus = async (
  id: number, 
  status: 'Approved' | 'Rejected', 
  reviewedBy?: string
): Promise<void> => {
  try {
    logger.debug('Updating leave status', { id, status, reviewedBy });

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
      logger.error('Error updating leave status:', error);
      throw error;
    }

    logger.info('Leave status updated successfully');
  } catch (error) {
    logger.error('Error in updateLeaveStatus:', error);
    throw error;
  }
};

export const getLeaveRequests = getAllLeaveRequests; // Add alias for compatibility
export const updateLeaveRequest = updateLeaveStatus; // Add alias for compatibility
