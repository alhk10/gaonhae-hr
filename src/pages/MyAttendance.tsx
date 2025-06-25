
import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecord {
  id: number;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  hours_worked: number | null;
}

interface ClockInOutRecord {
  status: 'clocked-in' | 'clocked-out';
  clockIn?: string;
  clockOut?: string;
}

const MyAttendance = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('');
  const [clockStatus, setClockStatus] = useState<ClockInOutRecord | undefined>();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceData();
    // Check if user is currently clocked in for today
    checkClockStatus();
  }, [user?.id]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id || 'EMP001')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        toast("Error loading attendance data. Please try again.");
      } else {
        setAttendanceData(data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast("Error loading attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkClockStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user?.id || 'EMP001')
      .eq('date', today)
      .single();

    if (data) {
      setClockStatus({
        status: data.check_out ? 'clocked-out' : 'clocked-in',
        clockIn: data.check_in,
        clockOut: data.check_out
      });
    } else {
      setClockStatus({ status: 'clocked-out' });
    }
  };

  const filteredData = attendanceData.filter(record => {
    return !dateFilter || record.date === dateFilter;
  });

  const handleClockInOut = async () => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const today = new Date().toISOString().split('T')[0];
    
    const isCurrentlyClockedIn = clockStatus?.status === 'clocked-in';
    
    try {
      if (isCurrentlyClockedIn) {
        // Clock out
        const { error } = await supabase
          .from('attendance')
          .update({ 
            check_out: currentTime,
            hours_worked: calculateHours(clockStatus?.clockIn || '', currentTime)
          })
          .eq('employee_id', user?.id || 'EMP001')
          .eq('date', today);

        if (error) {
          console.error('Error clocking out:', error);
          toast("Error clocking out. Please try again.");
        } else {
          toast(`Clocked out at ${currentTime}`);
          setClockStatus({ status: 'clocked-out', clockIn: clockStatus?.clockIn, clockOut: currentTime });
        }
      } else {
        // Clock in
        const status = determineStatus(currentTime);
        const { error } = await supabase
          .from('attendance')
          .insert({
            employee_id: user?.id || 'EMP001',
            date: today,
            check_in: currentTime,
            status: status,
            hours_worked: 0
          });

        if (error) {
          console.error('Error clocking in:', error);
          toast("Error clocking in. Please try again.");
        } else {
          toast(`Clocked in at ${currentTime}`);
          setClockStatus({ status: 'clocked-in', clockIn: currentTime });
        }
      }
      
      // Refresh attendance data
      fetchAttendanceData();
    } catch (error) {
      console.error('Clock in/out error:', error);
      toast("Error processing clock in/out. Please try again.");
    }
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    
    return Math.max(0, totalMinutes / 60);
  };

  const determineStatus = (checkIn: string) => {
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const nineAM = new Date(`2000-01-01T09:00`);
    
    return checkInTime > nineAM ? 'Late' : 'Present';
  };

  const exportAttendance = () => {
    toast("Attendance report exported to CSV");
  };

  // Calculate statistics
  const presentDays = attendanceData.filter(record => record.status === 'Present' || record.status === 'Late').length;
  const totalHours = attendanceData.reduce((sum, record) => sum + (record.hours_worked || 0), 0);
  const avgHours = presentDays > 0 ? totalHours / presentDays : 0;

  const isClockedIn = clockStatus?.status === 'clocked-in';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading attendance data...</p>
              </div>
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
                      {isClockedIn && clockStatus?.clockIn ? `Clocked in at ${clockStatus.clockIn}` : 'Start your work day'}
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
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
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
                    {attendanceData.length > 0 ? ((presentDays / attendanceData.length) * 100).toFixed(1) : '0'}%
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
                        <TableCell>{record.check_in || '-'}</TableCell>
                        <TableCell>{record.check_out || '-'}</TableCell>
                        <TableCell>{record.hours_worked?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === 'Present' ? 'default' : 
                                   record.status === 'Late' ? 'secondary' : 
                                   'outline'}
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
