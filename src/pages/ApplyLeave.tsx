
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ApplyLeave = () => {
  const [showLeaveTaken, setShowLeaveTaken] = useState(false);
  
  const leaveTaken = [
    { date: '2024-12-25', type: 'Annual Leave', status: 'Approved', reason: 'Christmas holiday' },
    { date: '2024-12-20', type: 'Medical Leave', status: 'Approved', reason: 'Doctor appointment' },
    { date: '2024-11-15', type: 'Annual Leave', status: 'Approved', reason: 'Personal matters' },
  ];

  const handleSubmitLeave = () => {
    toast("Leave application submitted successfully");
  };

  const handleShowLeaveTaken = () => {
    setShowLeaveTaken(!showLeaveTaken);
  };

  if (showLeaveTaken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Leave Taken</h2>
                  <p className="text-gray-600">Your leave history</p>
                </div>
                <Button variant="outline" onClick={handleShowLeaveTaken}>
                  Back to Apply Leave
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Leave History</CardTitle>
                  <CardDescription>All your approved and pending leave applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leaveTaken.map((leave, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{leave.date}</p>
                          <p className="text-sm text-gray-600">{leave.type} • {leave.reason}</p>
                        </div>
                        <span className="text-green-600 text-sm font-medium">{leave.status}</span>
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
                <h2 className="text-2xl font-bold text-gray-900">Apply for Leave</h2>
                <p className="text-gray-600">Submit your leave application</p>
              </div>
              <Button variant="outline" onClick={handleShowLeaveTaken}>
                <Eye className="w-4 h-4 mr-2" />
                View Leave Taken
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Annual Leave</p>
                    <p className="text-2xl font-bold text-gray-900">15</p>
                    <p className="text-sm text-gray-500">remaining</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Medical Leave</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-500">remaining</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Leave Taken</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                    <p className="text-sm text-gray-500">this year</p>
                  </div>
                </CardContent>
              </Card>
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
                      <option>Medical Leave</option>
                      <option>Emergency Leave</option>
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
};

export default ApplyLeave;
