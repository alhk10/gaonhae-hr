
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, FileText, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getManagerDashboardData } from '@/services/dashboardOptimizationService';
import { Skeleton } from '@/components/ui/skeleton';

const ManagerDashboard = () => {
  // Use optimized manager dashboard service
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: getManagerDashboardData,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  });

  const stats = dashboardData?.stats;
  const recentClaims = dashboardData?.recentClaims || [];

  const teamStats = [
    { title: 'Team Members', value: stats?.totalEmployees?.toString() || '0', icon: Users, color: 'bg-blue-500' },
    { title: 'Pending Approvals', value: stats?.pendingClaims?.toString() || '0', icon: Clock, color: 'bg-orange-500' },
    { title: 'Active Claims', value: stats?.activeClaims?.toString() || '0', icon: FileText, color: 'bg-green-500' },
    { title: 'Completed This Month', value: stats?.approvedClaims?.toString() || '0', icon: CheckCircle, color: 'bg-purple-500' },
  ];

  // Debug logging
  console.log('ManagerDashboard: Optimized loading - Data:', dashboardData);
  console.log('ManagerDashboard: Loading state:', isLoading);

  if (error) {
    console.error('ManagerDashboard: Error loading dashboard:', error);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
          <p className="text-red-600">Error loading dashboard data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
        <p className="text-gray-600">Team Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teamStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-x-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentClaims.filter(claim => claim.status === 'Pending').length > 0 ? (
                recentClaims.filter(claim => claim.status === 'Pending').map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{claim.employee}</p>
                        {claim.amount > 200 && <Badge variant="destructive" className="text-xs">High Amount</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">{claim.type} • S${claim.amount}</p>
                    </div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No pending approvals</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>December 2024 summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">98%</p>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 mx-auto mb-2" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{stats?.totalEmployees || 0}</p>
                  )}
                  <p className="text-sm text-gray-600">Team Size</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm">
                  <p>• {stats?.approvedClaims || 0} claims processed this month</p>
                  <p>• {stats?.pendingClaims || 0} items awaiting approval</p>
                  <p>• {stats?.totalEmployees || 0} active team members</p>
                  <p>• Data last updated: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;
