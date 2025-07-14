
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Fetching current user employee data only:', email);
  
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        email,
        type,
        department,
        position
      `)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('AuthOptimization: Error fetching user employee:', error);
      throw error;
    }

    if (!employee) {
      console.log('AuthOptimization: No employee found for email:', email);
      return null;
    }

    console.log('AuthOptimization: Employee data fetched successfully:', employee.name);

    // Fetch admin access separately
    const { data: adminAccessData, error: adminError } = await supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (adminError) {
      console.error('AuthOptimization: Error fetching admin access:', adminError);
    }

    // Fetch employee page access separately
    const { data: pageAccessData, error: pageError } = await supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (pageError) {
      console.error('AuthOptimization: Error fetching page access:', pageError);
    }

    const result = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      type: employee.type as 'Full-Time' | 'Casual',
      department: employee.department || '',
      position: employee.position || '',
      adminAccess: adminAccessData ? {
        employees: adminAccessData.employees || false,
        payroll: adminAccessData.payroll || false,
        leaveManagement: adminAccessData.leave_management || false,
        claims: adminAccessData.claims || false,
        attendance: adminAccessData.attendance || false,
        slotBooking: adminAccessData.slot_booking || false,
        reports: adminAccessData.reports || false
      } : {
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      pageAccess: pageAccessData ? {
        profile: pageAccessData.profile !== false,
        applyLeave: pageAccessData.apply_leave !== false,
        submitClaim: pageAccessData.submit_claim !== false,
        payslips: pageAccessData.payslips !== false,
        myAttendance: pageAccessData.my_attendance !== false,
        slotBookingEmployee: pageAccessData.slot_booking_employee !== false
      } : {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      }
    };

    console.log('AuthOptimization: Employee processing completed successfully');
    return result;
  } catch (error) {
    console.error('AuthOptimization: Exception in getCurrentUserEmployee:', error);
    throw error;
  }
};

// Cache for superadmin status to avoid repeated DB calls
const superadminCache = new Map<string, { isSuper: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase();
  const cached = superadminCache.get(normalizedEmail);
  
  // Return cached result if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('AuthOptimization: Using cached superadmin status for:', normalizedEmail);
    return cached.isSuper;
  }

  try {
    console.log('AuthOptimization: Checking superadmin status for:', normalizedEmail);
    const { data: isSuperadmin, error } = await supabase.rpc('is_superadmin', { 
      user_email: normalizedEmail 
    });
    
    if (error) {
      console.error('AuthOptimization: Error checking superadmin status:', error);
      return false;
    }
    
    // Cache the result
    superadminCache.set(normalizedEmail, {
      isSuper: isSuperadmin || false,
      timestamp: Date.now()
    });
    
    console.log('AuthOptimization: Superadmin status determined:', normalizedEmail, isSuperadmin);
    return isSuperadmin || false;
  } catch (error) {
    console.error('AuthOptimization: Exception checking superadmin status:', error);
    return false;
  }
};

// Clear cache when needed
export const clearAuthCache = () => {
  superadminCache.clear();
  console.log('AuthOptimization: Cache cleared');
};
