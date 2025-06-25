
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Clock, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords } from '@/services/attendanceService';
import { useAuth } from '@/contexts/AuthContext';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);

  // Fetch employee-specific data
  const { data: employeeClaims = [] } = useQuery({
    queryKey: ['employee-claims', user?.id],
    queryFn: () => getEmployeeClaims(user?.id || 'EMP001'),
    enabled: !!user?.id,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['employee-attendance', user?.id],
    queryFn: () => getEmployeeAttendanceRecords(user?.id || 'EMP001'),
    enabled: !!user?.id,
  });

  // Calculate real stats
  const pendingClaims = employeeClaims.filter(claim => claim.status === 'Pending').length;
  const hoursThisMonth = attendanceRecords.reduce((total, record) => total + record.hours, 0);
  
  const personalStats = [
    { title: 'Leave Balance', value: '18 days', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Pending Claims', value: pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    { title: 'Hours This Month', value: `${hoursThisMonth}h`, icon: Clock, color: 'bg-green-500' },
    { title: 'Next Payroll', value: '3 days', icon: DollarSign, color: 'bg-purple-500' },
  ];

  const handleClockInOut = () => {
    const currentTime = new Date().toLocaleTimeString('en-SG', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (isClockedIn) {
      // Clock out
      setIsClockedIn(false);
      setClockTime(null);
      toast(`Clocked out at ${currentTime}`);
    } else {
      // Clock in
      setIsClockedIn(true);
      setClockTime(currentTime);
      toast(`Clocked in at ${currentTime}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Employee'}</h2>
        <p className="text-gray-600">Employee ID: {user?.id || 'EMP001'} • Engineering Department</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {personalStats.map((stat) => (
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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                className={`justify-start h-auto p-4 ${isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={handleClockInOut}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white">
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </p>
                  <p className="text-sm text-white/80">
                    {isClockedIn && clockTime ? `Clocked in at ${clockTime}` : 'Start your work day'}
                  </p>
                </div>
              </Button>
              
              <Button className="justify-start h-auto p-4" variant="outline">
                <Calendar className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Apply for Leave</p>
                  <p className="text-sm text-gray-500">Submit new leave request</p>
                </div>
              </Button>
              <Button className="justify-start h-auto p-4" variant="outline">
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Submit Claim</p>
                  <p className="text-sm text-gray-500">Medical, transport, or other claims</p>
                </div>
              </Button>
              <Button className="justify-start h-auto p-4" variant="outline">
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View Payslip</p>
                  <p className="text-sm text-gray-500">Download latest payslip</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest HR transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeClaims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{claim.type}</p>
                    <p className="text-sm text-gray-600">S${claim.amount} • {claim.date}</p>
                  </div>
                  <Badge variant={
                    claim.status === 'Approved' ? 'default' : 
                    claim.status === 'Pending' ? 'secondary' : 'outline'
                  }>
                    {claim.status}
                  </Badge>
                </div>
              ))}
              {employeeClaims.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
