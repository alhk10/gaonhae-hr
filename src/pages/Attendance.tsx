
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Users, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const Attendance = () => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([
    { id: 1, name: 'John Tan', checkIn: '08:45', checkOut: '17:30', status: 'present', hours: '8.5', date: '2024-12-22' },
    { id: 2, name: 'Mary Ng', checkIn: '09:15', checkOut: '18:00', status: 'late', hours: '8.0', date: '2024-12-22' },
    { id: 3, name: 'David Lim', checkIn: '-', checkOut: '-', status: 'absent', hours: '0', date: '2024-12-22' },
    { id: 4, name: 'Sarah Loh', checkIn: '08:30', checkOut: '17:30', status: 'present', hours: '8.5', date: '2024-12-22' },
  ]);

  const [employeeAttendance, setEmployeeAttendance] = useState([
    { date: '2024-12-22', checkIn: '08:45', checkOut: '17:30', hours: '8.5', status: 'present' },
    { date: '2024-12-21', checkIn: '08:50', checkOut: '17:35', hours: '8.5', status: 'present' },
    { date: '2024-12-20', checkIn: '09:15', checkOut: '18:00', hours: '8.0', status: 'late' },
    { date: '2024-12-19', checkIn: '-', checkOut: '-', hours: '0', status: 'absent' },
  ]);

  const handleClockIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    toast(`Clocked in at ${timeString}`);
  };

  const handleClockOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    toast(`Clocked out at ${timeString}`);
  };

  const handleEditAttendance = (recordId: number, field: string, value: string) => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.id === recordId 
          ? { ...record, [field]: value }
          : record
      )
    );
  };

  const handleSaveChanges = () => {
    setIsEditMode(false);
    toast("Attendance records updated successfully");
  };

  // Employee view
  if (user?.role === 'employee') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
                <p className="text-gray-600">Track your attendance and working hours</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Clock In/Out</CardTitle>
                    <CardDescription>Record your daily attendance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-4">
                      <Button onClick={handleClockIn} className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        Clock In
                      </Button>
                      <Button onClick={handleClockOut} variant="outline" className="flex-1">
                        <Clock className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold">Today: 8.5 hours</p>
                      <p className="text-sm text-gray-600">In: 08:45 | Out: 17:30</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Week Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Hours:</span>
                        <span className="font-semibold">40.5 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Present:</span>
                        <span className="font-semibold">4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Absent:</span>
                        <span className="font-semibold">1</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                  <CardDescription>Your attendance history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employeeAttendance.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{record.date}</p>
                          <p className="text-sm text-gray-600">In: {record.checkIn} • Out: {record.checkOut}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">{record.hours}h</span>
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
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
  }

  // Admin/Manager view
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
                <p className="text-gray-600">Track employee attendance and working hours</p>
              </div>
              <Button 
                onClick={() => setIsEditMode(!isEditMode)}
                variant={isEditMode ? "default" : "outline"}
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditMode ? 'Save Changes' : 'Edit Attendance'}
              </Button>
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
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{record.name}</p>
                        <p className="text-sm text-gray-600">
                          In: {isEditMode ? (
                            <input 
                              type="time" 
                              value={record.checkIn} 
                              onChange={(e) => handleEditAttendance(record.id, 'checkIn', e.target.value)}
                              className="bg-white border border-gray-300 rounded px-1"
                            />
                          ) : record.checkIn} • 
                          Out: {isEditMode ? (
                            <input 
                              type="time" 
                              value={record.checkOut} 
                              onChange={(e) => handleEditAttendance(record.id, 'checkOut', e.target.value)}
                              className="bg-white border border-gray-300 rounded px-1"
                            />
                          ) : record.checkOut}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{record.hours}h</span>
                        {isEditMode ? (
                          <select 
                            value={record.status}
                            onChange={(e) => handleEditAttendance(record.id, 'status', e.target.value)}
                            className="text-sm font-medium px-2 py-1 rounded border border-gray-300"
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                          </select>
                        ) : (
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {record.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {isEditMode && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveChanges}>
                      Save All Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Attendance;
