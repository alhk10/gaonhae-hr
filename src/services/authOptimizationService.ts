
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading with role-based timeouts
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Starting getCurrentUserEmployee for:', email);
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthOptimization: Normalized email:', normalizedEmail);
    
    // Check if user is superadmin first to determine timeout
    const isSuperadmin = await checkSuperadminStatusCached(normalizedEmail);
    console.log('AuthOptimization: Is superadmin:', isSuperadmin);
    
    // Set timeout based on user role - superadmin gets 300s, others get 60s
    const timeoutDuration = isSuperadmin ? 300000 : 60000; // 300s or 60s in milliseconds
    console.log('AuthOptimization: Using timeout duration:', timeoutDuration / 1000, 'seconds');
    
    try {
      console.log('AuthOptimization: Attempting employee lookup with role-based timeout...');
      
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

      // Fetch admin access with same timeout
      try {
        console.log('AuthOptimization: Fetching admin access...');
        const adminQuery = supabase
          .from('admin_access')
          .select('*')
          .eq('employee_id', employee.id)
          .maybeSingle();
        
        const adminTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Admin access timeout')), timeoutDuration);
        });
        
        const { data: adminAccessData } = await Promise.race([adminQuery, adminTimeoutPromise]) as any;
        
        if (adminAccessData) {
          console.log('AuthOptimization: Admin access found:', adminAccessData);
          result.adminAccess = {
            employees: adminAccessData.employees || false,
            payroll: adminAccessData.payroll || false,
            leaveManagement: adminAccessData.leave_management || false,
            claims: adminAccessData.claims || false,
            attendance: adminAccessData.attendance || false,
            slotBooking: adminAccessData.slot_booking || false,
            reports: adminAccessData.reports || false
          };
        }
      } catch (adminError) {
        console.warn('AuthOptimization: Admin access fetch failed:', adminError);
        // Continue with default admin access (all false)
      }

      // Fetch page access with same timeout
      try {
        console.log('AuthOptimization: Fetching page access...');
        const pageQuery = supabase
          .from('employee_page_access')
          .select('*')
          .eq('employee_id', employee.id)
          .maybeSingle();
        
        const pageTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Page access timeout')), timeoutDuration);
        });
        
        const { data: pageAccessData } = await Promise.race([pageQuery, pageTimeoutPromise]) as any;
        
        if (pageAccessData) {
          console.log('AuthOptimization: Page access found:', pageAccessData);
          result.pageAccess = {
            profile: pageAccessData.profile !== false, // Default to true
            applyLeave: pageAccessData.apply_leave || false,
            submitClaim: pageAccessData.submit_claim !== false, // Default to true
            payslips: pageAccessData.payslips || false,
            myAttendance: pageAccessData.my_attendance !== false, // Default to true
            slotBookingEmployee: pageAccessData.slot_booking_employee || false
          };
        }
      } catch (pageError) {
        console.warn('AuthOptimization: Page access fetch failed:', pageError);
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

// Add missing exports that are expected by the AuthContext
export const getUserData = async (email: string) => {
  return getCurrentUserEmployee(email);
};

export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const { data: adminAccessData } = await supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (adminAccessData) {
      return {
        employees: adminAccessData.employees || false,
        payroll: adminAccessData.payroll || false,
        leaveManagement: adminAccessData.leave_management || false,
        claims: adminAccessData.claims || false,
        attendance: adminAccessData.attendance || false,
        slotBooking: adminAccessData.slot_booking || false,
        reports: adminAccessData.reports || false
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
    const { data: pageAccessData } = await supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    
    if (pageAccessData) {
      return {
        profile: pageAccessData.profile !== false,
        applyLeave: pageAccessData.apply_leave || false,
        submitClaim: pageAccessData.submit_claim !== false,
        payslips: pageAccessData.payslips || false,
        myAttendance: pageAccessData.my_attendance !== false,
        slotBookingEmployee: pageAccessData.slot_booking_employee || false
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

// Optimized superadmin check with role-specific timeout
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('AuthOptimization: Checking superadmin status for:', email);
    
    const superadminQuery = supabase
      .from('superadmin_users')
      .select('id, is_active')
      .eq('employee_email', email.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();
    
    // Use 30 second timeout for superadmin check
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Superadmin check timeout after 30 seconds')), 30000);
    });
    
    const { data: superadminData, error } = await Promise.race([superadminQuery, timeoutPromise]) as any;
    
    if (error) {
      console.error('AuthOptimization: Error checking superadmin status:', error);
      return false;
    }
    
    const superadminStatus = !!superadminData;
    console.log('AuthOptimization: Superadmin status determined:', email, superadminStatus);
    return superadminStatus;
  } catch (error) {
    console.error('AuthOptimization: Exception checking superadmin status:', error);
    return false;
  }
};

// Clear cache when needed
export const clearAuthCache = () => {
  console.log('AuthOptimization: Cache cleared');
};
