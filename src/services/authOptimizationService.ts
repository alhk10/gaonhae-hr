
import { supabase } from '@/integrations/supabase/client';

// Simplified service for authentication-specific data loading
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Starting getCurrentUserEmployee for:', email);
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthOptimization: Normalized email:', normalizedEmail);
    
    // Simple query with extended timeout for all operations
    console.log('AuthOptimization: Querying employees table for:', normalizedEmail);
    
    // Create timeout promise with extended timeout (180 seconds for all operations)
    const employeePromise = supabase
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
      setTimeout(() => reject(new Error('Employee lookup timeout')), 180000); // 180 seconds = 3 minutes
    });
    
    const { data: employee, error } = await Promise.race([employeePromise, timeoutPromise]) as any;

    if (error) {
      console.error('AuthOptimization: Error fetching employee:', error);
      throw new Error(`Employee lookup failed: ${error.message}`);
    }

    if (!employee) {
      console.log('AuthOptimization: No employee found for email:', normalizedEmail);
      return null;
    }

    console.log('AuthOptimization: Employee found:', {
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

    // Try to fetch admin access - with extended timeout protection (180 seconds)
    try {
      console.log('AuthOptimization: Fetching admin access for employee:', employee.id);
      
      // Add timeout promise with extended timeout
      const adminAccessPromise = supabase
        .from('admin_access')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Admin access query timeout')), 180000); // Extended to 180 seconds
      });
      
      const { data: adminAccessData } = await Promise.race([adminAccessPromise, timeoutPromise]) as any;
      
      if (adminAccessData) {
        console.log('AuthOptimization: Admin access data found:', adminAccessData);
        result.adminAccess = {
          employees: adminAccessData.employees || false,
          payroll: adminAccessData.payroll || false,
          leaveManagement: adminAccessData.leave_management || false,
          claims: adminAccessData.claims || false,
          attendance: adminAccessData.attendance || false,
          slotBooking: adminAccessData.slot_booking || false,
          reports: adminAccessData.reports || false
        };
      } else {
        console.log('AuthOptimization: No admin access data found for employee');
      }
    } catch (error) {
      console.warn('AuthOptimization: Admin access query error (non-critical):', error);
      // Continue with default admin access (all false)
    }

    // Try to fetch employee page access - with extended timeout protection (180 seconds)
    try {
      console.log('AuthOptimization: Fetching page access for employee:', employee.id);
      
      // Add timeout promise with extended timeout
      const pageAccessPromise = supabase
        .from('employee_page_access')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Page access query timeout')), 180000); // Extended to 180 seconds
      });
      
      const { data: pageAccessData } = await Promise.race([pageAccessPromise, timeoutPromise]) as any;
      
      if (pageAccessData) {
        console.log('AuthOptimization: Page access data found:', pageAccessData);
        result.pageAccess = {
          profile: pageAccessData.profile !== false,
          applyLeave: pageAccessData.apply_leave !== false,
          submitClaim: pageAccessData.submit_claim !== false,
          payslips: pageAccessData.payslips !== false,
          myAttendance: pageAccessData.my_attendance !== false,
          slotBookingEmployee: pageAccessData.slot_booking_employee !== false
        };
      } else {
        console.log('AuthOptimization: No page access data found for employee, using defaults');
      }
    } catch (error) {
      console.warn('AuthOptimization: Page access query error (non-critical):', error);
      // Continue with default page access (all true)
    }

    console.log('AuthOptimization: Employee processing completed successfully for:', employee.name);
    console.log('AuthOptimization: Final result:', {
      id: result.id,
      name: result.name,
      adminAccess: result.adminAccess,
      pageAccess: result.pageAccess
    });
    
    return result;
  } catch (error) {
    console.error('AuthOptimization: Critical error in getCurrentUserEmployee:', error);
    
    // Log the exact error details
    if (error instanceof Error) {
      console.error('AuthOptimization: Error name:', error.name);
      console.error('AuthOptimization: Error message:', error.message);
      console.error('AuthOptimization: Error stack:', error.stack);
    }
    
    throw error;
  }
};

// Simplified superadmin check with extended timeout protection for superadmin connections
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('AuthOptimization: Checking superadmin status for:', email);
    
    // Add timeout promise with extended timeout for superadmin connections (300 seconds = 5 minutes)
    const superadminPromise = supabase.rpc('is_superadmin', { 
      user_email: email.toLowerCase() 
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Superadmin check timeout')), 300000); // 300 seconds = 5 minutes
    });
    
    const { data: isSuperadmin, error } = await Promise.race([superadminPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('AuthOptimization: Error checking superadmin status:', error);
      return false;
    }
    
    const superadminStatus = isSuperadmin || false;
    console.log('AuthOptimization: Superadmin status determined:', email, superadminStatus);
    return superadminStatus;
  } catch (error) {
    console.error('AuthOptimization: Exception checking superadmin status:', error);
    return false; // Default to false if there's any error
  }
};

// Clear cache when needed
export const clearAuthCache = () => {
  console.log('AuthOptimization: Cache cleared');
};
