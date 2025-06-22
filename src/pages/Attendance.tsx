
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Users } from 'lucide-react';

const Attendance = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
              <p className="text-gray-600">Track employee attendance and working hours</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Present Today</p>
                      <p className="text-2xl font-bold text-gray-900">98</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-gray-900">5</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
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
                      <p className="text-sm font-medium text-gray-600">On Leave</p>
                      <p className="text-2xl font-bold text-gray-900">8</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance</CardTitle>
                <CardDescription>Real-time attendance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'John Tan', checkIn: '08:45', checkOut: '-', status: 'present', hours: '7.5' },
                    { name: 'Mary Ng', checkIn: '09:15', checkOut: '-', status: 'late', hours: '7.0' },
                    { name: 'David Lim', checkIn: '-', checkOut: '-', status: 'absent', hours: '0' },
                    { name: 'Sarah Loh', checkIn: '08:30', checkOut: '17:30', status: 'completed', hours: '8.5' },
                  ].map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{record.name}</p>
                        <p className="text-sm text-gray-600">In: {record.checkIn} • Out: {record.checkOut}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{record.hours}h</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status}
                        </span>
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

export default Attendance;
