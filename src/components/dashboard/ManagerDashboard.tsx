
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, FileText, CheckCircle } from 'lucide-react';

const ManagerDashboard = () => {
  const teamStats = [
    { title: 'Team Members', value: '12', icon: Users, color: 'bg-blue-500' },
    { title: 'Pending Approvals', value: '5', icon: Clock, color: 'bg-orange-500' },
    { title: 'Active Claims', value: '3', icon: FileText, color: 'bg-green-500' },
    { title: 'Completed This Month', value: '18', icon: CheckCircle, color: 'bg-purple-500' },
  ];

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
              {[
                { name: 'Alex Wong', type: 'Annual Leave', period: '25-27 Dec 2024', urgent: false },
                { name: 'Priya Singh', type: 'Medical Claim', amount: 'S$180', urgent: true },
                { name: 'Chen Wei', type: 'Overtime Claim', hours: '8 hours', urgent: false },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{item.type} • {item.period || item.amount || item.hours}</p>
                  </div>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline">Reject</Button>
                    <Button size="sm">Approve</Button>
                  </div>
                </div>
              ))}
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
                  <p className="text-2xl font-bold text-green-600">4.2</p>
                  <p className="text-sm text-gray-600">Avg Leave Days</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Upcoming Leave</h4>
                <div className="space-y-2 text-sm">
                  <p>• Sarah Loh: 23-30 Dec (Annual)</p>
                  <p>• Kumar Dev: 26-27 Dec (Personal)</p>
                  <p>• Lisa Tan: 2-5 Jan (Medical)</p>
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
