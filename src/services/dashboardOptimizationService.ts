import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { DEFAULT_QUERY_TIMEOUT } from '@/config/constants';

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
  logger.debug('Starting getDashboardStats');
  
  try {
    const timeoutDuration = DEFAULT_QUERY_TIMEOUT;
    
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
      logger.error('Error fetching employees', employeesResult.error);
      throw employeesResult.error;
    }

    if (pendingClaimsResult.error) {
      logger.error('Error fetching pending claims', pendingClaimsResult.error);
      throw pendingClaimsResult.error;
    }

    if (activeClaimsResult.error) {
      logger.error('Error fetching active claims', activeClaimsResult.error);
      throw activeClaimsResult.error;
    }

    const stats = {
      totalEmployees: employeesResult.data?.length || 0,
      pendingClaims: pendingClaimsResult.data?.length || 0,
      activeClaims: activeClaimsResult.data?.length || 0
    };

    logger.info('Stats fetched successfully', { stats });
    return stats;
    
  } catch (error) {
    logger.error('Error fetching dashboard stats', error);
    throw error;
  }
};

// Get recent activity from Supabase (only from active/non-resigned employees)
export const getRecentActivity = async (limit: number = 3) => {
  logger.debug('Starting getRecentActivity', { limit });
  
  try {
    const timeoutDuration = DEFAULT_QUERY_TIMEOUT;
    
    // First get active employee IDs (not resigned)
    const activeEmployeesQuery = supabase
      .from('employees')
      .select('id, name')
      .is('resign_date', null);

    const { data: activeEmployees, error: empError } = await activeEmployeesQuery;
    
    if (empError) {
      logger.error('Error fetching active employees', empError);
      throw empError;
    }

    if (!activeEmployees || activeEmployees.length === 0) {
      logger.debug('No active employees found');
      return [];
    }

    const activeEmployeeIds = activeEmployees.map(emp => emp.id);
    const employeeMap = new Map();
    activeEmployees.forEach((emp: any) => {
      employeeMap.set(emp.id, emp.name);
    });
    
    // Get claims only from active employees
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
      .in('employee_id', activeEmployeeIds)
      .order('submitted_date', { ascending: false })
      .limit(limit);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recent activity timeout after 60 seconds')), timeoutDuration);
    });

    const { data: claims, error } = await Promise.race([activityQuery, timeoutPromise]) as any;

    if (error) {
      logger.error('Error fetching recent activity', error);
      throw error;
    }

    if (!claims || claims.length === 0) {
      logger.debug('No recent activity found');
      return [];
    }

    const activity = claims.map((claim: any) => ({
      id: claim.id,
      employee: employeeMap.get(claim.employee_id) || 'Unknown Employee',
      type: claim.type,
      amount: claim.amount,
      status: claim.status
    }));

    logger.info('Recent activity fetched successfully', { count: activity.length });
    return activity;
    
  } catch (error) {
    logger.error('Error fetching recent activity', error);
    return []; // Return empty array on error to prevent UI crashes
  }
};

// Manager dashboard specific function
export const getManagerDashboardData = async (): Promise<ManagerDashboardData> => {
  logger.debug('Starting getManagerDashboardData');
  
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

    logger.info('Manager dashboard data fetched successfully');
    return {
      stats: enhancedStats,
      recentClaims
    };
    
  } catch (error) {
    logger.error('Error fetching manager dashboard data', error);
    throw error;
  }
};
