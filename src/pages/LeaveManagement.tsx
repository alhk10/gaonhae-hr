import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, Plus, FileText, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 1, name: 'John Tan', type: 'Annual Leave', period: '25-27 Dec 2024', days: '3 days', status: 'pending' },
    { id: 2, name: 'Mary Ng', type: 'Medical Leave', period: '20-21 Dec 2024', days: '2 days', status: 'approved' },
    { id: 3, name: 'David Lim', type: 'Maternity Leave', period: '1 Jan - 16 Apr 2025', days: '16 weeks', status: 'pending' },
    { id: 4, name: 'Sarah Loh', type: 'Annual Leave', period: '23-30 Dec 2024', days: '8 days', status: 'approved' },
  ]);

  const [showLeaveSummary, setShowLeaveSummary] = useState(false);

  const leaveSummaryData = [
    { name: 'John Tan', annualTotal: 21, annualTaken: 8, annualRemaining: 13, medicalTotal: 14, medicalTaken: 2, medicalRemaining: 12 },
    { name: 'Mary Ng', annualTotal: 21, annualTaken: 12, annualRemaining: 9, medicalTotal: 14, medicalTaken: 5, medicalRemaining: 9 },
    { name: 'David Lim', annualTotal: 21, annualTaken: 5, annualRemaining: 16, medicalTotal: 14, medicalTaken: 1, medicalRemaining: 13 },
  ];

  const handleApproveLeave = (requestId: number, employeeName: string) => {
    setLeaveRequests(prev => 
      prev.map(request => 
        request.id === requestId 
          ? { ...request, status: 'approved' }
          : request
      )
    );
    toast(`Leave request approved for ${employeeName}`);
  };

  const handleRejectLeave = (requestId: number, employeeName: string) => {
    setLeaveRequests(prev => 
      prev.map(request => 
        request.id === requestId 
          ? { ...request, status: 'rejected' }
          : request
      )
    );
    toast(`Leave request rejected for ${employeeName}`);
  };

  const handleAddLeave = () => {
    toast("Add Leave form will be implemented");
  };

  const handleLeaveSummary = () => {
    setShowLeaveSummary(!showLeaveSummary);
  };

  const handleBulkLeave = () => {
    toast("Bulk Leave function will be implemented");
  };

  if (showLeaveSummary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Leave Summary</h2>
                  <p className="text-gray-600">View leave balances and usage for all employees</p>
                </div>
                <Button variant="outline" onClick={handleLeaveSummary}>
                  Back to Leave Management
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Leave Balances</CardTitle>
                  <CardDescription>Annual and medical leave overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Employee</th>
                          <th className="text-left p-4">Annual Total</th>
                          <th className="text-left p-4">Annual Taken</th>
                          <th className="text-left p-4">Annual Remaining</th>
                          <th className="text-left p-4">Medical Total</th>
                          <th className="text-left p-4">Medical Taken</th>
                          <th className="text-left p-4">Medical Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveSummaryData.map((employee, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-4 font-medium">{employee.name}</td>
                            <td className="p-4">{employee.annualTotal}</td>
                            <td className="p-4">{employee.annualTaken}</td>
                            <td className="p-4">{employee.annualRemaining}</td>
                            <td className="p-4">{employee.medicalTotal}</td>
                            <td className="p-4">{employee.medicalTaken}</td>
                            <td className="p-4">{employee.medicalRemaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                <p className="text-gray-600">Manage employee leave requests and balances</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleBulkLeave}>
                  <Users className="w-4 h-4 mr-2" />
                  Bulk Leave
                </Button>
                <Button variant="outline" onClick={handleLeaveSummary}>
                  <FileText className="w-4 h-4 mr-2" />
                  Leave Summary
                </Button>
                <Button onClick={handleAddLeave}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leave
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                      <p className="text-2xl font-bold text-gray-900">{leaveRequests.filter(r => r.status === 'pending').length}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{leaveRequests.filter(r => r.status === 'approved').length}</p>
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
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{request.name}</p>
                        <p className="text-sm text-gray-600">{request.type} • {request.period} • {request.days}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          request.status === 'approved' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }>
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && (
                          <div className="space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleRejectLeave(request.id, request.name)}
                            >
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveLeave(request.id, request.name)}
                            >
                              Approve
                            </Button>
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
