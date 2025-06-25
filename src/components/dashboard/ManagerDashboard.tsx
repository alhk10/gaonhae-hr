
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, FileText, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getEmployees } from '@/services/employeeService';
import { getClaims } from '@/services/claimsService';

const ManagerDashboard = () => {
  // Fetch real data from Supabase
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: getClaims,
  });

  // Calculate real stats
  const teamMembers = employees.length;
  const pendingApprovals = claims.filter(claim => claim.status === 'Pending').length;
  const activeClaims = claims.filter(claim => claim.status !== 'Rejected').length;
  const completedThisMonth = claims.filter(claim => claim.status === 'Approved').length;

  const teamStats = [
    { title: 'Team Members', value: teamMembers.toString(), icon: Users, color: 'bg-blue-500' },
    { title: 'Pending Approvals', value: pendingApprovals.toString(), icon: Clock, color: 'bg-orange-500' },
    { title: 'Active Claims', value: activeClaims.toString(), icon: FileText, color: 'bg-green-500' },
    { title: 'Completed This Month', value: completedThisMonth.toString(), icon: CheckCircle, color: 'bg-purple-500' },
  ];

  if (employeesLoading || claimsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
        <p className="text-gray-600">Engineering Department Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teamStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
              {claims.filter(claim => claim.status === 'Pending').slice(0, 3).map((claim) => (
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
              ))}
              {claims.filter(claim => claim.status === 'Pending').length === 0 && (
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
                  <p className="text-2xl font-bold text-green-600">{teamMembers}</p>
                  <p className="text-sm text-gray-600">Team Size</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm">
                  <p>• {completedThisMonth} claims processed this month</p>
                  <p>• {pendingApprovals} items awaiting approval</p>
                  <p>• {teamMembers} active team members</p>
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
