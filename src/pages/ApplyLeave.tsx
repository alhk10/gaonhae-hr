
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ApplyLeave = () => {
  const [showApplyForm, setShowApplyForm] = useState(false);
  
  const leaveHistory = [
    { date: '2024-12-25', type: 'Annual Leave', status: 'Approved', reason: 'Christmas holiday', appliedOn: '2024-12-10' },
    { date: '2024-11-15', type: 'Annual Leave', status: 'Approved', reason: 'Personal matters', appliedOn: '2024-11-05' },
    { date: '2024-09-12', type: 'Annual Leave', status: 'Pending', reason: 'Vacation', appliedOn: '2024-09-10' },
  ];

  const currentLeaveStatus = [
    { type: 'Annual Leave', total: 21, used: 6, remaining: 15 },
  ];

  const handleSubmitLeave = () => {
    toast("Leave application submitted successfully");
    setShowApplyForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (showApplyForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Apply for Leave</h2>
                  <p className="text-gray-600">Submit your leave application</p>
                </div>
                <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                  Back to Leave Summary
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {currentLeaveStatus.map((leave) => (
                  <Card key={leave.type}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">{leave.type}</p>
                        <p className="text-2xl font-bold text-gray-900">{leave.remaining}</p>
                        <p className="text-sm text-gray-500">remaining</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Leave Application Form</CardTitle>
                  <CardDescription>Fill out the details for your leave request (All leaves are 1 day)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                      <select className="w-full p-2 border border-gray-300 rounded-lg">
                        <option>Annual Leave</option>
                        <option>Maternity Leave</option>
                        <option>Paternity Leave</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Date</label>
                      <input type="date" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <textarea 
                      rows={3} 
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Please provide a reason for your leave..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Documents (if any)</label>
                    <input 
                      type="file" 
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                  <Button onClick={handleSubmitLeave} className="w-full">
                    Submit Leave Application
                  </Button>
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
                <h2 className="text-2xl font-bold text-gray-900">Leave Summary</h2>
                <p className="text-gray-600">Your leave balance and history</p>
              </div>
              <Button onClick={() => setShowApplyForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Apply for Leave
              </Button>
            </div>

            {/* Leave Balance Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentLeaveStatus.map((leave) => (
                <Card key={leave.type} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-2">{leave.type}</h3>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-blue-600">{leave.remaining}</div>
                        <div className="text-sm text-gray-500">days remaining</div>
                        <div className="text-xs text-gray-400">
                          {leave.used} of {leave.total} used
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(leave.used / leave.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Leave History Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
                <CardDescription>Your recent leave applications and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaveHistory.map((leave, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{leave.date}</p>
                          <p className="text-sm text-gray-600">{leave.type}</p>
                          <p className="text-sm text-gray-500">{leave.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(leave.status)}>
                          {leave.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Applied: {leave.appliedOn}
                        </p>
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

export default ApplyLeave;
