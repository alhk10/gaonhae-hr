
import { supabase } from '@/integrations/supabase/client';

// Types for dashboard data
export interface DashboardStats {
  totalEmployees: number;
  pendingClaims: number;
  activeClaims: number;
  approvedClaims?: number;
}

export interface RecentClaim {
  id: number;
  employee: string;
  type: string;
  amount: number;
  status: string;
}

export interface ManagerDashboardData {
  stats: DashboardStats;
  recentClaims: RecentClaim[];
}

// Optimized service for dashboard data loading with proper timeout handling
export const getDashboardStats = async () => {
  console.log('DashboardOptimization: Starting getDashboardStats...');
  
  try {
    // Set reasonable timeout for dashboard operations (60 seconds)
    const timeoutDuration = 60000;
    
    const promises = [
      // Get total active employees from Supabase
      supabase
        .from('employees')
        .select('id')
        .is('resign_date', null),
      
      // Get pending claims from Supabase
      supabase
        .from('claims')
        .select('id')
        .eq('status', 'Pending'),
      
      // Get active claims (approved/in progress) from Supabase
      supabase
        .from('claims')
        .select('id')
        .in('status', ['Approved', 'In Progress'])
    ];

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard stats timeout after 60 seconds')), timeoutDuration);
    });

    const results = await Promise.race([Promise.all(promises), timeoutPromise]) as any;
    
    const [employeesResult, pendingClaimsResult, activeClaimsResult] = results;

    if (employeesResult.error) {
      console.error('DashboardOptimization: Error fetching employees:', employeesResult.error);
      throw employeesResult.error;
    }

    if (pendingClaimsResult.error) {
      console.error('DashboardOptimization: Error fetching pending claims:', pendingClaimsResult.error);
      throw pendingClaimsResult.error;
    }

    if (activeClaimsResult.error) {
      console.error('DashboardOptimization: Error fetching active claims:', activeClaimsResult.error);
      throw activeClaimsResult.error;
    }

    const stats = {
      totalEmployees: employeesResult.data?.length || 0,
      pendingClaims: pendingClaimsResult.data?.length || 0,
      activeClaims: activeClaimsResult.data?.length || 0
    };

    console.log('DashboardOptimization: Stats fetched successfully:', stats);
    return stats;
    
  } catch (error) {
    console.error('DashboardOptimization: Error fetching dashboard stats:', error);
    throw error;
  }
};

// Get recent activity from Supabase
export const getRecentActivity = async (limit: number = 3) => {
  console.log('DashboardOptimization: Starting getRecentActivity with limit:', limit);
  
  try {
    const timeoutDuration = 60000; // 60 seconds
    
    const activityQuery = supabase
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

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recent activity timeout after 60 seconds')), timeoutDuration);
    });

    const { data: claims, error } = await Promise.race([activityQuery, timeoutPromise]) as any;

    if (error) {
      console.error('DashboardOptimization: Error fetching recent activity:', error);
      throw error;
    }

    if (!claims || claims.length === 0) {
      console.log('DashboardOptimization: No recent activity found');
      return [];
    }

    // Get employee names for the claims
    const employeeIds = claims.map((claim: any) => claim.employee_id).filter(Boolean);
    
    if (employeeIds.length === 0) {
      console.log('DashboardOptimization: No employee IDs found in claims');
      return [];
    }

    const employeesQuery = supabase
      .from('employees')
      .select('id, name')
      .in('id', employeeIds);

    const employeesTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Employee lookup timeout')), timeoutDuration);
    });

    const { data: employees, error: employeesError } = await Promise.race([employeesQuery, employeesTimeoutPromise]) as any;

    if (employeesError) {
      console.error('DashboardOptimization: Error fetching employees for activity:', employeesError);
      // Continue without employee names
    }

    const employeeMap = new Map();
    if (employees) {
      employees.forEach((emp: any) => {
        employeeMap.set(emp.id, emp.name);
      });
    }

    const activity = claims.map((claim: any) => ({
      id: claim.id,
      employee: employeeMap.get(claim.employee_id) || 'Unknown Employee',
      type: claim.type,
      amount: claim.amount,
      status: claim.status
    }));

    console.log('DashboardOptimization: Recent activity fetched successfully:', activity.length, 'items');
    return activity;
    
  } catch (error) {
    console.error('DashboardOptimization: Error fetching recent activity:', error);
    return []; // Return empty array on error to prevent UI crashes
  }
};

// Manager dashboard specific function
export const getManagerDashboardData = async (): Promise<ManagerDashboardData> => {
  console.log('DashboardOptimization: Starting getManagerDashboardData...');
  
  try {
    // Get stats with approved claims count for managers
    const [stats, recentClaims, approvedClaimsResult] = await Promise.all([
      getDashboardStats(),
      getRecentActivity(5),
      supabase
        .from('claims')
        .select('id')
        .eq('status', 'Approved')
    ]);

    const enhancedStats = {
      ...stats,
      approvedClaims: approvedClaimsResult.data?.length || 0
    };

    console.log('DashboardOptimization: Manager dashboard data fetched successfully');
    return {
      stats: enhancedStats,
      recentClaims
    };
    
  } catch (error) {
    console.error('DashboardOptimization: Error fetching manager dashboard data:', error);
    throw error;
  }
};
