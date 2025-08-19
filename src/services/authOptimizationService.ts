import { supabase } from '@/integrations/supabase/client';

export const getCurrentUserEmployee = async (email: string): Promise<any> => {
  console.log('🔍 getCurrentUserEmployee: Starting for email:', email);
  
  try {
    // Check for superadmin first with timeout
    const isSuperadmin = await checkSuperadminStatusCached(email);
    console.log('🔍 getCurrentUserEmployee: Superadmin status:', isSuperadmin);
    
    // Fetch employee data with timeout
    const employeeResult = await Promise.race([
      supabase
        .from('employees')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Employee fetch timeout')), 10000)
      )
    ]) as any;

    if (!employeeResult?.data) {
      console.log('🔍 getCurrentUserEmployee: No employee found for email:', email);
      return null;
    }

    const employee = employeeResult.data;
    console.log('🔍 getCurrentUserEmployee: Found employee:', employee.id, employee.name);
    
    // Return result with superadmin flag
    const result = {
      ...employee,
      adminAccess: null,
      pageAccess: null,
      isSuperadmin
    };
    
    return result;
  } catch (error) {
    console.error('🔍 getCurrentUserEmployee: Error fetching user data:', error);
    throw error;
  }
};

export const getUserData = async (email: string) => {
  return getCurrentUserEmployee(email);
};

export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const { data } = await supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (data) {
      return {
        employees: data.employees || false,
        payroll: data.payroll || false,
        leaveManagement: data.leave_management || false,
        claims: data.claims || false,
        attendance: data.attendance || false,
        slotBooking: data.slot_booking || false,
        reports: data.reports || false
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin access:', error);
    return null;
  }
};

export const getUserPageAccess = async (employeeId: string) => {
  try {
    const { data } = await supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (data) {
      return {
        profile: data.profile !== false,
        applyLeave: data.apply_leave || false,
        submitClaim: data.submit_claim !== false,
        payslips: data.payslips || false,
        myAttendance: data.my_attendance !== false,
        slotBookingEmployee: data.slot_booking_employee || false
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching page access:', error);
    return null;
  }
};

export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  return checkSuperadminStatusCached(email);
};

export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('🔍 SUPERADMIN CHECK: Starting for email:', email);
    
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 SUPERADMIN CHECK: Normalized email:', normalizedEmail);
    
    const { data, error } = await Promise.race([
      supabase
        .from('superadmin_users')
        .select('id, employee_email, employee_name, is_active, created_at')
        .eq('employee_email', normalizedEmail)
        .eq('is_active', true)
        .maybeSingle(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Superadmin check timeout')), 8000)
      )
    ]);
    
    console.log('🔍 SUPERADMIN CHECK: Raw query result:', { data, error });
    
    if (error) {
      console.error('❌ SUPERADMIN CHECK: Database error:', error);
      return false;
    }
    
    if (data) {
      console.log('✅ SUPERADMIN CHECK: SUCCESS - Found superadmin record:', {
        id: data.id,
        email: data.employee_email,
        name: data.employee_name,
        isActive: data.is_active
      });
      return true;
    } else {
      console.log('❌ SUPERADMIN CHECK: FAILED - No superadmin record found for:', normalizedEmail);
      return false;
    }
  } catch (error) {
    console.error('❌ SUPERADMIN CHECK: Exception during check:', error);
    return false;
  }
};

export const clearAuthCache = () => {
  console.log('AuthOptimization: Cache cleared');
};