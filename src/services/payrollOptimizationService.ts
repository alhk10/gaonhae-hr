import { supabase } from '@/integrations/supabase/client';

export const getEmployeePayrollDataOptimized = async (employeeIds: string[]) => {
  console.log('Fetching optimized payroll data for employees:', employeeIds);
  
  if (employeeIds.length === 0) return {};

  try {
    // Fetch all data in parallel with a single query each
    const [allowancesResult, deductionsResult, claimsResult] = await Promise.all([
      supabase
        .from('allowances')
        .select('*')
        .in('employee_id', employeeIds),
      supabase
        .from('deductions') 
        .select('*')
        .in('employee_id', employeeIds),
      supabase
        .from('claims')
        .select('*')
        .in('employee_id', employeeIds)
        .eq('status', 'Approved')
    ]);

    if (allowancesResult.error) throw allowancesResult.error;
    if (deductionsResult.error) throw deductionsResult.error;
    if (claimsResult.error) throw claimsResult.error;

    // Group data by employee ID
    const allowancesByEmployee = (allowancesResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const deductionsByEmployee = (deductionsResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const claimsByEmployee = (claimsResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('Fetched optimized payroll data successfully');
    
    return {
      allowances: allowancesByEmployee,
      deductions: deductionsByEmployee,
      claims: claimsByEmployee
    };
  } catch (error) {
    console.error('Error fetching optimized payroll data:', error);
    throw error;
  }
};