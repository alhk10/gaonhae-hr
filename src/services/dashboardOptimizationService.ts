
import { supabase } from '@/integrations/supabase/client';

// Lightweight dashboard stats service
export const getDashboardStats = async () => {
  console.log('DashboardOptimization: Fetching lightweight stats...');
  
  try {
    // Execute count queries in parallel for better performance
    const [employeesResult, claimsResult, attendanceResult] = await Promise.all([
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .is('resign_date', null),
      
      supabase
        .from('claims')
        .select('id, status', { count: 'exact' }),
      
      supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    ]);

    const totalEmployees = employeesResult.count || 0;
    const allClaims = claimsResult.data || [];
    const pendingClaims = allClaims.filter(claim => claim.status === 'Pending').length;
    const approvedClaims = allClaims.filter(claim => claim.status === 'Approved').length;
    const monthlyAttendance = attendanceResult.count || 0;

    console.log('DashboardOptimization: Stats loaded successfully');
    
    return {
      totalEmployees,
      pendingClaims,
      approvedClaims,
      activeClaims: allClaims.length - allClaims.filter(claim => claim.status === 'Rejected').length,
      monthlyAttendance
    };
  } catch (error) {
    console.error('DashboardOptimization: Error fetching dashboard stats:', error);
    throw error;
  }
};

// Load recent activity data separately (background loading)
export const getRecentActivity = async (limit: number = 5) => {
  console.log('DashboardOptimization: Fetching recent activity...');
  
  try {
    const { data: recentClaims, error } = await supabase
      .from('claims')
      .select(`
        id,
        type,
        amount,
        status,
        submitted_date,
        employee_id
      `)
      .order('submitted_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('DashboardOptimization: Error fetching recent activity:', error);
      throw error;
    }

    // Get employee names for the claims
    const employeeIds = recentClaims?.map(claim => claim.employee_id).filter(Boolean) || [];
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name')
      .in('id', employeeIds);

    const employeeMap = new Map(employees?.map(emp => [emp.id, emp.name]) || []);

    const enrichedClaims = recentClaims?.map(claim => ({
      ...claim,
      employee: employeeMap.get(claim.employee_id) || 'Unknown Employee'
    })) || [];

    console.log('DashboardOptimization: Recent activity loaded');
    return enrichedClaims;
  } catch (error) {
    console.error('DashboardOptimization: Error fetching recent activity:', error);
    throw error;
  }
};

// Manager-specific optimized data loading
export const getManagerDashboardData = async () => {
  console.log('DashboardOptimization: Loading manager dashboard data...');
  
  try {
    // Load essential data only
    const [statsResult, recentClaimsResult] = await Promise.all([
      getDashboardStats(),
      getRecentActivity(3) // Limit to 3 for faster loading
    ]);

    return {
      stats: statsResult,
      recentClaims: recentClaimsResult
    };
  } catch (error) {
    console.error('DashboardOptimization: Error loading manager dashboard:', error);
    throw error;
  }
};
