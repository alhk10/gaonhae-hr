
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Starting getCurrentUserEmployee for:', email);
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthOptimization: Normalized email:', normalizedEmail);
    
    // First, let's check if we can connect to the database at all
    console.log('AuthOptimization: Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('employees')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('AuthOptimization: Database connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('AuthOptimization: Database connection successful');

    // Add a timeout to prevent hanging queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Employee query timeout after 8 seconds')), 8000);
    });

    console.log('AuthOptimization: Querying employees table for:', normalizedEmail);
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
      .eq('email', normalizedEmail)
      .maybeSingle();

    const { data: employee, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (error) {
      console.error('AuthOptimization: Error fetching employee:', error);
      throw new Error(`Employee lookup failed: ${error.message}`);
    }

    if (!employee) {
      console.log('AuthOptimization: No employee found for email:', normalizedEmail);
      
      // Let's also check if there are any employees in the table at all
      const { data: allEmployees, error: countError } = await supabase
        .from('employees')
        .select('email')
        .limit(10);
      
      if (!countError && allEmployees) {
        console.log('AuthOptimization: Sample employee emails in database:', 
          allEmployees.map(emp => emp.email).slice(0, 5));
      }
      
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

    // Try to fetch admin access but don't fail if it times out
    try {
      console.log('AuthOptimization: Fetching admin access for employee:', employee.id);
      const adminTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Admin access query timeout')), 3000);
      });

      const adminQueryPromise = supabase
        .from('admin_access')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();

      const { data: adminAccessData, error: adminError } = await Promise.race([adminQueryPromise, adminTimeoutPromise]) as any;
      
      if (!adminError && adminAccessData) {
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
      } else if (adminError) {
        console.warn('AuthOptimization: Admin access query error (non-critical):', adminError);
      } else {
        console.log('AuthOptimization: No admin access data found for employee');
      }
    } catch (error) {
      console.warn('AuthOptimization: Admin access query timeout (non-critical):', error);
    }

    // Try to fetch employee page access but don't fail if it times out
    try {
      console.log('AuthOptimization: Fetching page access for employee:', employee.id);
      const pageTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Page access query timeout')), 3000);
      });

      const pageQueryPromise = supabase
        .from('employee_page_access')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();

      const { data: pageAccessData, error: pageError } = await Promise.race([pageQueryPromise, pageTimeoutPromise]) as any;
      
      if (!pageError && pageAccessData) {
        console.log('AuthOptimization: Page access data found:', pageAccessData);
        result.pageAccess = {
          profile: pageAccessData.profile !== false,
          applyLeave: pageAccessData.apply_leave !== false,
          submitClaim: pageAccessData.submit_claim !== false,
          payslips: pageAccessData.payslips !== false,
          myAttendance: pageAccessData.my_attendance !== false,
          slotBookingEmployee: pageAccessData.slot_booking_employee !== false
        };
      } else if (pageError) {
        console.warn('AuthOptimization: Page access query error (non-critical):', pageError);
      } else {
        console.log('AuthOptimization: No page access data found for employee, using defaults');
      }
    } catch (error) {
      console.warn('AuthOptimization: Page access query timeout (non-critical):', error);
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
      setTimeout(() => reject(new Error('Superadmin check timeout')), 3000);
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
    const superadminStatus = isSuperadmin || false;
    superadminCache.set(normalizedEmail, {
      isSuper: superadminStatus,
      timestamp: Date.now()
    });
    
    console.log('AuthOptimization: Superadmin status determined:', normalizedEmail, superadminStatus);
    return superadminStatus;
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
