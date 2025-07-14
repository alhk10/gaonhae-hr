
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Fetching current user employee data only:', email);
  
  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      id,
      name,
      email,
      type,
      department,
      position,
      admin_access (*),
      employee_page_access (*)
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

  // Process minimal user data for authentication
  const adminAccessArray = employee.admin_access as any[];
  const pageAccessArray = employee.employee_page_access as any[];
  
  const adminAccess = adminAccessArray && adminAccessArray.length > 0 ? adminAccessArray[0] : null;
  const pageAccess = pageAccessArray && pageAccessArray.length > 0 ? pageAccessArray[0] : null;

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    type: employee.type as 'Full-Time' | 'Casual',
    department: employee.department || '',
    position: employee.position || '',
    adminAccess: adminAccess ? {
      employees: adminAccess.employees || false,
      payroll: adminAccess.payroll || false,
      leaveManagement: adminAccess.leave_management || false,
      claims: adminAccess.claims || false,
      attendance: adminAccess.attendance || false,
      slotBooking: adminAccess.slot_booking || false,
      reports: adminAccess.reports || false
    } : {
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    },
    pageAccess: pageAccess ? {
      profile: pageAccess.profile !== false,
      applyLeave: pageAccess.apply_leave !== false,
      submitClaim: pageAccess.submit_claim !== false,
      payslips: pageAccess.payslips !== false,
      myAttendance: pageAccess.my_attendance !== false,
      slotBookingEmployee: pageAccess.slot_booking_employee !== false
    } : {
      profile: true,
      applyLeave: true,
      submitClaim: true,
      payslips: true,
      myAttendance: true,
      slotBookingEmployee: true
    }
  };
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
    
    console.log('AuthOptimization: Cached superadmin status for:', normalizedEmail, isSuperadmin);
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
