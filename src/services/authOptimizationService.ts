
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading with reduced timeouts
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Starting getCurrentUserEmployee for:', email);
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthOptimization: Normalized email:', normalizedEmail);
    
    // Check if user is superadmin first with reduced timeout
    const isSuperadmin = await checkSuperadminStatusCached(normalizedEmail);
    console.log('AuthOptimization: Is superadmin:', isSuperadmin);
    
    // Set timeout based on user role - reduced to 10s for superadmin, 8s for others
    const timeoutDuration = isSuperadmin ? 10000 : 8000; // 10s or 8s in milliseconds
    console.log('AuthOptimization: Using timeout duration:', timeoutDuration / 1000, 'seconds');
    
    try {
      console.log('AuthOptimization: Attempting employee lookup with optimized timeout...');
      
      const employeeQuery = supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          type,
          department,
          position
        `)
        .eq('email', normalizedEmail)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Employee lookup timeout after ${timeoutDuration / 1000} seconds`)), timeoutDuration);
      });
      
      const { data: employee, error } = await Promise.race([employeeQuery, timeoutPromise]) as any;

      if (error) {
        console.warn('AuthOptimization: Employee lookup failed:', error);
        throw error;
      }

      if (!employee) {
        console.log('AuthOptimization: No employee found for email:', normalizedEmail);
        return null;
      }

      console.log('AuthOptimization: Employee lookup successful:', {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        type: employee.type
      });

      // Initialize result with basic employee data
      const result = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        type: employee.type as 'Full-Time' | 'Casual',
        department: employee.department || '',
        position: employee.position || '',
        adminAccess: {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        },
        pageAccess: {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        }
      };

      // Fetch admin access with optimized timeout and retry logic
      try {
        console.log('AuthOptimization: Fetching admin access...');
        const adminData = await fetchWithRetry(
          () => supabase
            .from('admin_access')
            .select('*')
            .eq('employee_id', employee.id)
            .maybeSingle(),
          5000, // 5 second timeout
          2 // 2 retries
        );
        
        if (adminData?.data) {
          console.log('AuthOptimization: Admin access found:', adminData.data);
          result.adminAccess = {
            employees: adminData.data.employees || false,
            payroll: adminData.data.payroll || false,
            leaveManagement: adminData.data.leave_management || false,
            claims: adminData.data.claims || false,
            attendance: adminData.data.attendance || false,
            slotBooking: adminData.data.slot_booking || false,
            reports: adminData.data.reports || false
          };
        }
      } catch (adminError) {
        console.warn('AuthOptimization: Admin access fetch failed, using defaults:', adminError);
        // Continue with default admin access (all false)
      }

      // Fetch page access with optimized timeout and retry logic
      try {
        console.log('AuthOptimization: Fetching page access...');
        const pageData = await fetchWithRetry(
          () => supabase
            .from('employee_page_access')
            .select('*')
            .eq('employee_id', employee.id)
            .maybeSingle(),
          5000, // 5 second timeout
          2 // 2 retries
        );
        
        if (pageData?.data) {
          console.log('AuthOptimization: Page access found:', pageData.data);
          result.pageAccess = {
            profile: pageData.data.profile !== false, // Default to true
            applyLeave: pageData.data.apply_leave || false,
            submitClaim: pageData.data.submit_claim !== false, // Default to true
            payslips: pageData.data.payslips || false,
            myAttendance: pageData.data.my_attendance !== false, // Default to true
            slotBookingEmployee: pageData.data.slot_booking_employee || false
          };
        }
      } catch (pageError) {
        console.warn('AuthOptimization: Page access fetch failed, using defaults:', pageError);
        // Continue with default page access
      }

      console.log('AuthOptimization: Employee processing completed successfully for:', employee.name);
      return result;

    } catch (lookupError) {
      console.error('AuthOptimization: Employee lookup failed completely:', lookupError);
      throw new Error(`Unable to verify employee record - ${lookupError.message}`);
    }
    
  } catch (error) {
    console.error('AuthOptimization: Critical error in getCurrentUserEmployee:', error);
    
    if (error instanceof Error) {
      console.error('AuthOptimization: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  }
};

// Helper function to fetch with retry logic and timeout
const fetchWithRetry = async (queryFn: () => any, timeout: number, retries: number) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeout / 1000} seconds`)), timeout);
      });
      
      return await Promise.race([queryFn(), timeoutPromise]);
    } catch (error) {
      console.warn(`AuthOptimization: Fetch attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff: wait 1s, then 2s before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Add missing exports that are expected by the AuthContext
export const getUserData = async (email: string) => {
  return getCurrentUserEmployee(email);
};

export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const data = await fetchWithRetry(
      () => supabase
        .from('admin_access')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle(),
      5000,
      2
    );
    
    if (data?.data) {
      return {
        employees: data.data.employees || false,
        payroll: data.data.payroll || false,
        leaveManagement: data.data.leave_management || false,
        claims: data.data.claims || false,
        attendance: data.data.attendance || false,
        slotBooking: data.data.slot_booking || false,
        reports: data.data.reports || false
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
    const data = await fetchWithRetry(
      () => supabase
        .from('employee_page_access')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle(),
      5000,
      2
    );
    
    if (data?.data) {
      return {
        profile: data.data.profile !== false,
        applyLeave: data.data.apply_leave || false,
        submitClaim: data.data.submit_claim !== false,
        payslips: data.data.payslips || false,
        myAttendance: data.data.my_attendance !== false,
        slotBookingEmployee: data.data.slot_booking_employee || false
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

// Optimized superadmin check with enhanced debugging and direct table access
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('🔍 SUPERADMIN CHECK: Starting for email:', email);
    
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 SUPERADMIN CHECK: Normalized email:', normalizedEmail);
    
    // First try direct query with detailed logging
    console.log('🔍 SUPERADMIN CHECK: Executing direct Supabase query...');
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('id, employee_email, employee_name, is_active, created_at')
      .eq('employee_email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();
    
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
      
      // Additional debugging: Check what records exist
      console.log('🔍 SUPERADMIN CHECK: Checking all superadmin records for debugging...');
      const { data: allRecords } = await supabase
        .from('superadmin_users')
        .select('employee_email, is_active')
        .limit(10);
      console.log('🔍 SUPERADMIN CHECK: All superadmin records:', allRecords);
      
      return false;
    }
  } catch (error) {
    console.error('❌ SUPERADMIN CHECK: Exception during check:', error);
    return false;
  }
};

// Clear cache when needed
export const clearAuthCache = () => {
  console.log('AuthOptimization: Cache cleared');
};
