
import { supabase } from '@/integrations/supabase/client';

// Optimized service for authentication-specific data loading with better error handling
export const getCurrentUserEmployee = async (email: string) => {
  console.log('AuthOptimization: Starting getCurrentUserEmployee for:', email);
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('AuthOptimization: Normalized email:', normalizedEmail);
    
    // First attempt with shorter timeout
    console.log('AuthOptimization: Attempting quick employee lookup...');
    
    try {
      const quickQuery = supabase
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

      const quickTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Quick lookup timeout')), 30000); // 30 seconds
      });
      
      const { data: employee, error } = await Promise.race([quickQuery, quickTimeoutPromise]) as any;

      if (error) {
        console.warn('AuthOptimization: Quick lookup failed:', error);
        throw error;
      }

      if (!employee) {
        console.log('AuthOptimization: No employee found for email:', normalizedEmail);
        return null;
      }

      console.log('AuthOptimization: Quick employee lookup successful:', {
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

      // Try to fetch admin access asynchronously (non-blocking)
      setTimeout(async () => {
        try {
          console.log('AuthOptimization: Fetching admin access (background)...');
          const { data: adminAccessData } = await supabase
            .from('admin_access')
            .select('*')
            .eq('employee_id', employee.id)
            .maybeSingle();
          
          if (adminAccessData) {
            console.log('AuthOptimization: Admin access found (background):', adminAccessData);
          }
        } catch (error) {
          console.warn('AuthOptimization: Background admin access fetch failed:', error);
        }
      }, 0);

      // Try to fetch page access asynchronously (non-blocking)  
      setTimeout(async () => {
        try {
          console.log('AuthOptimization: Fetching page access (background)...');
          const { data: pageAccessData } = await supabase
            .from('employee_page_access')
            .select('*')
            .eq('employee_id', employee.id)
            .maybeSingle();
          
          if (pageAccessData) {
            console.log('AuthOptimization: Page access found (background):', pageAccessData);
          }
        } catch (error) {
          console.warn('AuthOptimization: Background page access fetch failed:', error);
        }
      }, 0);

      console.log('AuthOptimization: Employee processing completed successfully for:', employee.name);
      return result;

    } catch (quickError) {
      console.warn('AuthOptimization: Quick lookup failed, trying fallback approach:', quickError);
      
      // Fallback: Try with even simpler query
      try {
        console.log('AuthOptimization: Attempting fallback employee lookup...');
        
        const fallbackQuery = supabase
          .from('employees')
          .select('id, name, email, type')
          .eq('email', normalizedEmail)
          .limit(1);

        const fallbackTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Fallback lookup timeout')), 15000); // 15 seconds
        });
        
        const { data: employees, error: fallbackError } = await Promise.race([fallbackQuery, fallbackTimeoutPromise]) as any;

        if (fallbackError) {
          console.error('AuthOptimization: Fallback lookup failed:', fallbackError);
          throw fallbackError;
        }

        const employee = employees?.[0];
        if (!employee) {
          console.log('AuthOptimization: No employee found in fallback lookup');
          return null;
        }

        console.log('AuthOptimization: Fallback employee lookup successful:', employee.name);

        // Return minimal employee data
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          type: employee.type as 'Full-Time' | 'Casual',
          department: '',
          position: '',
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

      } catch (fallbackError) {
        console.error('AuthOptimization: Both quick and fallback lookups failed:', fallbackError);
        throw new Error('Unable to verify employee record - database connection issues');
      }
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

// Simplified superadmin check with quick timeout
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('AuthOptimization: Checking superadmin status for:', email);
    
    const superadminQuery = supabase.rpc('is_superadmin', { 
      user_email: email.toLowerCase() 
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Superadmin check timeout')), 15000); // Reduced to 15 seconds
    });
    
    const { data: isSuperadmin, error } = await Promise.race([superadminQuery, timeoutPromise]) as any;
    
    if (error) {
      console.error('AuthOptimization: Error checking superadmin status:', error);
      return false;
    }
    
    const superadminStatus = isSuperadmin || false;
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
