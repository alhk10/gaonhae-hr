
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ApplyLeave = () => {
  const handleApplyLeave = () => {
    toast("Leave application submitted successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Apply for Leave</h2>
              <p className="text-gray-600">Submit your leave application</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Annual Leave Balance</p>
                      <p className="text-2xl font-bold text-gray-900">18 days</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Medical Leave Balance</p>
                      <p className="text-2xl font-bold text-gray-900">12 days</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Leave Taken</p>
                      <p className="text-2xl font-bold text-gray-900">3 days</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Apply for Leave</CardTitle>
                <CardDescription>Fill out the form to apply for leave</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg">
                      <option>Annual Leave</option>
                      <option>Medical Leave</option>
                      <option>Emergency Leave</option>
                      <option>Maternity/Paternity Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg">
                      <option>Half Day</option>
                      <option>Full Day</option>
                      <option>Multiple Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input type="date" className="w-full p-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input type="date" className="w-full p-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea 
                    rows={4} 
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Please provide reason for leave..."
                  ></textarea>
                </div>
                <Button onClick={handleApplyLeave} className="w-full">
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
