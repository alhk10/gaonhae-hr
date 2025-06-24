import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Clock, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EmployeeDashboard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);

  const personalStats = [
    { title: 'Leave Balance', value: '18 days', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Pending Claims', value: '2', icon: FileText, color: 'bg-orange-500' },
    { title: 'Hours This Month', value: '168h', icon: Clock, color: 'bg-green-500' },
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
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, Tan Wei Ming</h2>
        <p className="text-gray-600">Employee ID: EMP001 • Engineering Department</p>
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
              {[
                { action: 'Leave Request Approved', details: 'Annual Leave (23-24 Dec)', status: 'approved', date: '2 days ago' },
                { action: 'Medical Claim Submitted', details: 'GP Visit - S$45', status: 'pending', date: '1 week ago' },
                { action: 'Payslip Generated', details: 'November 2024', status: 'completed', date: '2 weeks ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.details}</p>
                    <p className="text-xs text-gray-500">{activity.date}</p>
                  </div>
                  <Badge variant={
                    activity.status === 'approved' ? 'default' : 
                    activity.status === 'pending' ? 'secondary' : 'outline'
                  }>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CPF Contributions (2024)</CardTitle>
          <CardDescription>Your CPF contribution summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">S$4,680</p>
              <p className="text-sm text-gray-600">Employee Contribution</p>
              <p className="text-xs text-gray-500">20% of wages</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">S$3,900</p>
              <p className="text-sm text-gray-600">Employer Contribution</p>
              <p className="text-xs text-gray-500">17% of wages</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">S$8,580</p>
              <p className="text-sm text-gray-600">Total Contribution</p>
              <p className="text-xs text-gray-500">37% combined</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;
