
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Fetching current user employee data only:', email);
  
  try {
    // Add a timeout to prevent hanging queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    const queryPromise = supabase
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

    const { data: employee, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (error) {
      console.error('AuthOptimization: Error fetching user employee:', error);
      throw error;
    }

    if (!employee) {
      console.log('AuthOptimization: No employee found for email:', email);
      return null;
    }

    console.log('AuthOptimization: Employee data fetched successfully:', employee.name);

    // Fetch admin access separately with timeout
    const adminQueryPromise = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle();

    const adminTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Admin access query timeout')), 5000);
    });

    let adminAccessData = null;
    try {
      const { data, error: adminError } = await Promise.race([adminQueryPromise, adminTimeoutPromise]) as any;
      if (!adminError) {
        adminAccessData = data;
      } else {
        console.error('AuthOptimization: Error fetching admin access:', adminError);
      }
    } catch (error) {
      console.error('AuthOptimization: Admin access query timeout or error:', error);
    }

    // Fetch employee page access separately with timeout
    const pageQueryPromise = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle();

    const pageTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Page access query timeout')), 5000);
    });

    let pageAccessData = null;
    try {
      const { data, error: pageError } = await Promise.race([pageQueryPromise, pageTimeoutPromise]) as any;
      if (!pageError) {
        pageAccessData = data;
      } else {
        console.error('AuthOptimization: Error fetching page access:', pageError);
      }
    } catch (error) {
      console.error('AuthOptimization: Page access query timeout or error:', error);
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
    
    // Add timeout for superadmin check
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Superadmin check timeout')), 5000);
    });

    const queryPromise = supabase.rpc('is_superadmin', { 
      user_email: normalizedEmail 
    });

    const { data: isSuperadmin, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('AuthOptimization: Error checking superadmin status:', error);
      // Cache false result on error to prevent repeated failures
      superadminCache.set(normalizedEmail, {
        isSuper: false,
        timestamp: Date.now()
      });
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
    // Cache false result on timeout/error to prevent repeated failures
    superadminCache.set(normalizedEmail, {
      isSuper: false,
      timestamp: Date.now()
    });
    return false;
  }
};

// Clear cache when needed
export const clearAuthCache = () => {
  superadminCache.clear();
  console.log('AuthOptimization: Cache cleared');
};
