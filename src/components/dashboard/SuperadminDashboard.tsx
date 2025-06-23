
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Clock, Calendar } from 'lucide-react';

const SuperadminDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 124,
    pendingClaims: 8,
    leaveRequests: 12,
    payrollDue: ''
  });

  const [leaveRequests, setLeaveRequests] = useState([
    { name: 'John Tan', type: 'Annual Leave', days: '3 days', status: 'pending' },
    { name: 'Mary Ng', type: 'Medical Leave', days: '2 days', status: 'approved' },
    { name: 'David Lim', type: 'Maternity Leave', days: '16 weeks', status: 'pending' },
  ]);

  useEffect(() => {
    const calculatePayrollDue = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 2);
      const timeDiff = nextMonth.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return daysDiff > 0 ? `${daysDiff} days` : 'Due today';
    };

    const updateStats = () => {
      // Simulate real-time updates
      setStats(prev => ({
        ...prev,
        totalEmployees: prev.totalEmployees + Math.floor(Math.random() * 3) - 1,
        pendingClaims: Math.max(0, prev.pendingClaims + Math.floor(Math.random() * 3) - 1),
        leaveRequests: Math.max(0, prev.leaveRequests + Math.floor(Math.random() * 3) - 1),
        payrollDue: calculatePayrollDue()
      }));
    };

    // Initial calculation
    setStats(prev => ({ ...prev, payrollDue: calculatePayrollDue() }));
    
    // Update every hour
    const interval = setInterval(updateStats, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  const statsConfig = [
    { title: 'Total Employees', value: stats.totalEmployees.toString(), icon: Users, color: 'bg-blue-500' },
    { title: 'Pending Claims', value: stats.pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    { title: 'Leave Requests', value: stats.leaveRequests.toString(), icon: Clock, color: 'bg-green-500' },
    { title: 'Payroll Due', value: stats.payrollDue, icon: Calendar, color: 'bg-purple-500' },
  ];

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
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>Pending approvals across all departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaveRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{request.name}</p>
                    <p className="text-sm text-gray-600">{request.type} • {request.days}</p>
                  </div>
                  <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CPF Compliance Status</CardTitle>
            <CardDescription>Monthly contribution tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">December 2024</p>
                  <p className="text-sm text-green-700">All contributions processed</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Ordinary Wage contributions: S$245,680</p>
                <p>• Additional Wage contributions: S$12,400</p>
                <p>• Total employees covered: {stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperadminDashboard;
