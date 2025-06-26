
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Clock, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getEmployees } from '@/services/employeeService';
import { getClaims } from '@/services/claimsService';
import { getAttendanceRecords } from '@/services/attendanceService';

const SuperadminDashboard = () => {
  const [payrollDue, setPayrollDue] = useState('');

  // Fetch real data from services with proper error handling
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const { data: claims = [], isLoading: claimsLoading, error: claimsError } = useQuery({
    queryKey: ['claims'],
    queryFn: getClaims,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading, error: attendanceError } = useQuery({
    queryKey: ['attendance'],
    queryFn: getAttendanceRecords,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  useEffect(() => {
    const calculatePayrollDue = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 2);
      const timeDiff = nextMonth.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return daysDiff > 0 ? `${daysDiff} days` : 'Due today';
    };

    setPayrollDue(calculatePayrollDue());
  }, []);

  // Calculate real stats with proper error handling
  const totalEmployees = employees.length;
  const pendingClaims = claims.filter(claim => claim.status === 'Pending').length;
  const leaveRequests = 0; // This would need a leave requests service
  const recentLeaveRequests = []; // This would come from leave service

  const statsConfig = [
    { title: 'Total Employees', value: totalEmployees.toString(), icon: Users, color: 'bg-blue-500' },
    { title: 'Pending Claims', value: pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    { title: 'Leave Requests', value: leaveRequests.toString(), icon: Clock, color: 'bg-green-500' },
    { title: 'Payroll Due', value: payrollDue, icon: Calendar, color: 'bg-purple-500' },
  ];

  // Debug logging
  console.log('SuperadminDashboard: Employees loaded:', employees.length);
  console.log('SuperadminDashboard: Claims loaded:', claims.length);
  console.log('SuperadminDashboard: Attendance records loaded:', attendanceRecords.length);

  if (employeesError) {
    console.error('SuperadminDashboard: Error loading employees:', employeesError);
  }
  if (claimsError) {
    console.error('SuperadminDashboard: Error loading claims:', claimsError);
  }
  if (attendanceError) {
    console.error('SuperadminDashboard: Error loading attendance:', attendanceError);
  }

  if (employeesLoading || claimsLoading || attendanceLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h2>
          <p className="text-gray-600">Loading system data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h2>
        <p className="text-gray-600">Complete oversight of HR operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => (
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
            <CardTitle>Recent Claims</CardTitle>
            <CardDescription>Latest submitted claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {claims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{claim.employee}</p>
                    <p className="text-sm text-gray-600">{claim.type} • S${claim.amount}</p>
                  </div>
                  <Badge variant={claim.status === 'Approved' ? 'default' : 'secondary'}>
                    {claim.status}
                  </Badge>
                </div>
              ))}
              {claims.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No claims submitted yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>HR system overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">December 2024</p>
                  <p className="text-sm text-green-700">System operational</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Active employees: {totalEmployees}</p>
                <p>• Pending approvals: {pendingClaims}</p>
                <p>• Data sync: Connected</p>
                <p>• Last updated: {new Date().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperadminDashboard;
