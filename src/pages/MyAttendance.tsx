
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Filter, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

const MyAttendance = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('');

  // Mock attendance data for the current employee
  const [myAttendanceData] = useState([
    { id: 1, date: '2024-12-23', clockIn: '09:00', clockOut: '18:00', status: 'Present', hours: 8 },
    { id: 2, date: '2024-12-22', clockIn: '09:05', clockOut: '18:15', status: 'Present', hours: 8.17 },
    { id: 3, date: '2024-12-21', clockIn: '08:55', clockOut: '17:55', status: 'Present', hours: 8 },
    { id: 4, date: '2024-12-20', clockIn: '09:00', clockOut: '18:00', status: 'Present', hours: 8 },
    { id: 5, date: '2024-12-19', clockIn: '', clockOut: '', status: 'Medical Leave', hours: 0 },
    { id: 6, date: '2024-12-18', clockIn: '09:10', clockOut: '18:10', status: 'Present', hours: 8 },
    { id: 7, date: '2024-12-17', clockIn: '09:00', clockOut: '18:00', status: 'Present', hours: 8 },
  ]);

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);

  const filteredData = myAttendanceData.filter(record => {
    return !dateFilter || record.date === dateFilter;
  });

  const handleClockInOut = () => {
    const currentTime = new Date().toLocaleTimeString('en-SG', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockTime(null);
      toast(`Clocked out at ${currentTime}`);
    } else {
      setIsClockedIn(true);
      setClockTime(currentTime);
      toast(`Clocked in at ${currentTime}`);
    }
  };

  const exportAttendance = () => {
    toast("Attendance report exported to CSV");
  };

  // Calculate statistics
  const presentDays = myAttendanceData.filter(record => record.status === 'Present').length;
  const totalHours = myAttendanceData.reduce((sum, record) => sum + record.hours, 0);
  const avgHours = totalHours / presentDays;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
              <p className="text-gray-600">View your attendance records and clock in/out</p>
            </div>

            {/* Clock In/Out Section */}
            <Card>
              <CardHeader>
                <CardTitle>Time Tracking</CardTitle>
                <CardDescription>Clock in and out for your work day</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className={`w-full sm:w-auto h-auto p-6 ${isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  onClick={handleClockInOut}
                >
                  <Clock className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <p className="text-lg font-medium text-white">
                      {isClockedIn ? 'Clock Out' : 'Clock In'}
                    </p>
                    <p className="text-sm text-white/80">
                      {isClockedIn && clockTime ? `Clocked in at ${clockTime}` : 'Start your work day'}
                    </p>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Days Present</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{presentDays}</p>
                  <p className="text-sm text-gray-600">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalHours}h</p>
                  <p className="text-sm text-gray-600">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Average Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{avgHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-600">Per day</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {((presentDays / myAttendanceData.length) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Attendance Records</span>
                    </CardTitle>
                    <CardDescription>Your personal attendance history</CardDescription>
                  </div>
                  <Button variant="outline" onClick={exportAttendance}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                    placeholder="Filter by date"
                  />
                  <Button variant="outline" onClick={() => setDateFilter('')}>
                    <Filter className="w-4 h-4 mr-2" />
                    Clear Filter
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.date}</TableCell>
                        <TableCell>{record.clockIn || '-'}</TableCell>
                        <TableCell>{record.clockOut || '-'}</TableCell>
                        <TableCell>{record.hours}h</TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === 'Present' ? 'default' : 'secondary'}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No attendance records found for the selected date.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyAttendance;
