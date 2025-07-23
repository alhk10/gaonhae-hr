
import { supabase } from '@/integrations/supabase/client';

interface CasualEmployeeForBooking {
  id: string;
  name: string;
  type: string;
}

export const getCasualEmployeesForBooking = async (): Promise<CasualEmployeeForBooking[]> => {
  console.log('EmployeeOptimization: Fetching casual employees for booking...');
  
  const startTime = Date.now();
  
  try {
    // Fetch only essential fields for casual employees
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, type')
      .eq('type', 'Casual')
      .order('name', { ascending: true });

    const duration = Date.now() - startTime;
    console.log(`EmployeeOptimization: Query completed in ${duration}ms`);

    if (error) {
      console.error('EmployeeOptimization: Error fetching casual employees:', error);
      throw new Error(`Failed to fetch casual employees: ${error.message}`);
    }

    const employees = (data || []).map(emp => ({
      id: emp.id,
      name: emp.name,
      type: emp.type
    }));

    console.log(`EmployeeOptimization: Successfully loaded ${employees.length} casual employees`);
    return employees;

  } catch (error) {
    console.error('EmployeeOptimization: Exception in getCasualEmployeesForBooking:', error);
    throw error;
  }
};

// Cache for employee data with 5-minute expiry
let employeeCache: { data: CasualEmployeeForBooking[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedCasualEmployeesForBooking = async (): Promise<CasualEmployeeForBooking[]> => {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (employeeCache && (now - employeeCache.timestamp) < CACHE_DURATION) {
    console.log('EmployeeOptimization: Returning cached employee data');
    return employeeCache.data;
  }
  
  // Fetch fresh data
  const employees = await getCasualEmployeesForBooking();
  
  // Update cache
  employeeCache = {
    data: employees,
    timestamp: now
  };
  
  return employees;
};

// Clear cache manually if needed
export const clearEmployeeCache = (): void => {
  employeeCache = null;
  console.log('EmployeeOptimization: Employee cache cleared');
};
