
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

const LeaveManagement = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
              <p className="text-gray-600">Manage employee leave requests and balances</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved Today</p>
                      <p className="text-2xl font-bold text-gray-900">5</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">On Leave Today</p>
                      <p className="text-2xl font-bold text-gray-900">8</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>All pending and recent leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'John Tan', type: 'Annual Leave', period: '25-27 Dec 2024', days: '3 days', status: 'pending' },
                    { name: 'Mary Ng', type: 'Medical Leave', period: '20-21 Dec 2024', days: '2 days', status: 'approved' },
                    { name: 'David Lim', type: 'Maternity Leave', period: '1 Jan - 16 Apr 2025', days: '16 weeks', status: 'pending' },
                    { name: 'Sarah Loh', type: 'Annual Leave', period: '23-30 Dec 2024', days: '8 days', status: 'approved' },
                  ].map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{request.name}</p>
                        <p className="text-sm text-gray-600">{request.type} • {request.period} • {request.days}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && (
                          <div className="space-x-2">
                            <Button size="sm" variant="outline">Reject</Button>
                            <Button size="sm">Approve</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeaveManagement;
