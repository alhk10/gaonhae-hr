import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface LeaveEncashmentConfig {
  id: string;
  employee_id: string;
  encashment_rate_per_day: number;
  max_encashable_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveEncashmentRecord {
  id: string;
  employee_id: string;
  year: number;
  unused_leave_days: number;
  encashed_days: number;
  rate_per_day: number;
  total_encashment_amount: number;
  status: string;
  processed_date: string | null;
  processed_by: string | null;
  payroll_month: string | null;
  payroll_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface UnusedLeaveInfo {
  unused_annual_leave: number;
  total_entitlement: number;
  total_used: number;
}

// Get or create encashment configuration for an employee
export const getOrCreateEncashmentConfig = async (employeeId: string): Promise<LeaveEncashmentConfig | null> => {
  try {
    // Try to get existing config
    const { data: existingConfig } = await supabase
      .from('leave_encashment_config')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (existingConfig) {
      return existingConfig;
    }

    // Get employee's base salary to calculate default rate
    const { data: employee } = await supabase
      .from('employees')
      .select('base_salary')
      .eq('id', employeeId)
      .single();

    if (!employee || !employee.base_salary) {
      return null;
    }

    // Create default config with daily rate (base_salary / 22 working days)
    const defaultRate = employee.base_salary / 22;
    
    const { data: newConfig, error } = await supabase
      .from('leave_encashment_config')
      .insert({
        employee_id: employeeId,
        encashment_rate_per_day: defaultRate,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    logger.debug('Created default encashment config', { employeeId });
    return newConfig;
  } catch (error) {
    logger.error('Error getting/creating encashment config', error);
    return null;
  }
};

// Update encashment configuration
export const updateEncashmentConfig = async (
  employeeId: string,
  config: Partial<LeaveEncashmentConfig>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leave_encashment_config')
      .update(config)
      .eq('employee_id', employeeId);

    if (!error) {
      logger.debug('Updated encashment config', { employeeId });
    }
    return !error;
  } catch (error) {
    logger.error('Error updating encashment config', error);
    return false;
  }
};

// Calculate unused leave for encashment
export const calculateUnusedLeave = async (
  employeeId: string,
  year?: number
): Promise<UnusedLeaveInfo | null> => {
  try {
    const { data, error } = await supabase.rpc('calculate_unused_leave_for_encashment', {
      employee_id: employeeId,
      reference_year: year || new Date().getFullYear()
    });

    if (error) {
      logger.error('Error calculating unused leave', error);
      throw error;
    }
    
    const result = data && data.length > 0 ? data[0] : null;
    logger.debug('Calculated unused leave', { employeeId, result });
    return result;
  } catch (error) {
    logger.error('Exception in calculateUnusedLeave', error);
    return null;
  }
};

// Process leave encashment
export const processLeaveEncashment = async (
  employeeId: string,
  year: number,
  processedBy?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('process_leave_encashment', {
      p_employee_id: employeeId,
      p_year: year,
      p_processed_by: processedBy
    });

    if (error) {
      logger.error('Error processing leave encashment', error);
      throw error;
    }
    
    logger.info('Leave encashment processed', { employeeId, year, recordId: data });
    return data;
  } catch (error) {
    logger.error('Exception in processLeaveEncashment', error);
    throw error;
  }
};

// Get encashment records for an employee
export const getEmployeeEncashmentRecords = async (employeeId: string): Promise<LeaveEncashmentRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('leave_encashment_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('year', { ascending: false });

    if (error) {
      logger.error('Error getting encashment records', error);
      throw error;
    }
    
    logger.debug(`Fetched ${data?.length || 0} encashment records for employee`, { employeeId });
    return data || [];
  } catch (error) {
    logger.error('Exception in getEmployeeEncashmentRecords', error);
    return [];
  }
};

// Get all encashment records (for admin) - only for active employees
export const getAllEncashmentRecords = async (year?: number): Promise<LeaveEncashmentRecord[]> => {
  try {
    let query = supabase
      .from('leave_encashment_records')
      .select(`
        *,
        employees!inner(name, email, resign_date)
      `)
      .is('employees.resign_date', null) // Filter out resigned employees
      .order('year', { ascending: false });

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error getting all encashment records', error);
      throw error;
    }
    
    logger.debug(`Fetched ${data?.length || 0} total encashment records (active employees only)`, { year });
    return data || [];
  } catch (error) {
    logger.error('Exception in getAllEncashmentRecords', error);
    return [];
  }
};

// Get employees with unused leave for a specific year
export const getEmployeesWithUnusedLeave = async (year: number): Promise<Array<{
  employee_id: string;
  employee_name: string;
  unused_leave_days: number;
  total_entitlement: number;
  total_used: number;
}>> => {
  try {
    // Get all eligible employees
    const { data: eligibleEmployees } = await supabase.rpc('get_eligible_employees_with_entitlements', {
      reference_year: year
    });

    if (!eligibleEmployees) return [];

    const results = [];

    for (const employee of eligibleEmployees) {
      const unusedLeave = await calculateUnusedLeave(employee.employee_id, year);
      if (unusedLeave && unusedLeave.unused_annual_leave > 0) {
        results.push({
          employee_id: employee.employee_id,
          employee_name: employee.employee_name,
          unused_leave_days: unusedLeave.unused_annual_leave,
          total_entitlement: unusedLeave.total_entitlement,
          total_used: unusedLeave.total_used
        });
      }
    }

    logger.info(`Found ${results.length} employees with unused leave`, { year });
    return results;
  } catch (error) {
    logger.error('Error getting employees with unused leave', error);
    return [];
  }
};

// Bulk process encashment for multiple employees
export const bulkProcessEncashment = async (
  employeeIds: string[],
  year: number,
  processedBy?: string
): Promise<{ success: string[], failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];

  for (const employeeId of employeeIds) {
    try {
      await processLeaveEncashment(employeeId, year, processedBy);
      success.push(employeeId);
    } catch (error) {
      logger.error('Failed to process encashment for employee', error, { employeeId });
      failed.push(employeeId);
    }
  }

  logger.info('Bulk encashment processing complete', { 
    successCount: success.length, 
    failedCount: failed.length 
  });
  return { success, failed };
};
