
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { updateClockInOut, getClockInOutStatus } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllSlotBookings } from '@/services/slotBookingService';
import { isWithinBranchRange } from '@/services/geolocationService';

interface AttendanceRecord {
  id: number;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  location?: string;
  clock_in_location?: string;
  clock_out_location?: string;
}

interface ClockInOutRecord {
  status: 'clocked-in' | 'clocked-out';
  clockIn?: string;
  clockOut?: string;
  location?: string;
}

const MyAttendance = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [clockStatus, setClockStatus] = useState<ClockInOutRecord | undefined>();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClockingInOut, setIsClockingInOut] = useState(false);
  const [employeeType, setEmployeeType] = useState<string>('');
  const [hasApprovedSlot, setHasApprovedSlot] = useState<boolean>(false);
  const [nearestBranch, setNearestBranch] = useState<string>('');
  const [locationCheckPassed, setLocationCheckPassed] = useState<boolean>(false);

  useEffect(() => {
    fetchAttendanceData();
    fetchEmployeeData();
    checkSlotBooking();
    checkLocationOnLoad();
  }, [user?.id, monthFilter]);

  useEffect(() => {
    // Check clock status after attendance data is loaded
    if (attendanceData.length >= 0) {
      checkClockStatus();
    }
  }, [attendanceData, user?.id]);

  const checkLocationOnLoad = async () => {
    try {
      const locationCheck = await isWithinBranchRange(100);
      setLocationCheckPassed(locationCheck.withinRange);
      setNearestBranch(locationCheck.nearestBranch || '');
    } catch (error) {
      console.error('Location check failed:', error);
      setLocationCheckPassed(false);
    }
  };

  const fetchEmployeeData = async () => {
    if (!user?.id) return;
    
    try {
      const employee = await getEmployeeById(user.id);
      if (employee) {
        setEmployeeType(employee.type);
        console.log('Employee type:', employee.type);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const checkSlotBooking = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const allSlotBookings = await getAllSlotBookings();
      
      const approvedSlot = allSlotBookings.some(booking => 
        booking.employeeId === user.id && 
        booking.date === today && 
        booking.status === 'approved'
      );
      
      setHasApprovedSlot(approvedSlot);
      console.log('Has approved slot for today:', approvedSlot);
    } catch (error) {
      console.error('Error checking slot booking:', error);
      setHasApprovedSlot(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user?.id || 'EMP001')
        .gte('date', `${monthFilter}-01`)
        .lt('date', `${getNextMonth(monthFilter)}-01`)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        toast.error("Error loading attendance data. Please try again.");
      } else {
        setAttendanceData(data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error("Error loading attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getNextMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  };

  const checkClockStatus = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check clock status from Supabase
      const supabaseStatus = await getClockInOutStatus(user.id);
      console.log('Supabase clock status:', supabaseStatus);
      
      // Check today's attendance record from database
      const todayRecord = attendanceData.find(record => record.date === today);
      console.log('Today attendance record:', todayRecord);
      
      let currentStatus: ClockInOutRecord | undefined;
      
      if (supabaseStatus) {
        // Use Supabase clock status if available
        currentStatus = {
          status: supabaseStatus.status,
          clockIn: supabaseStatus.clockIn,
          clockOut: supabaseStatus.clockOut,
          location: supabaseStatus.location
        };
      } else if (todayRecord) {
        // Fall back to attendance record
        if (todayRecord.check_in && !todayRecord.check_out) {
          // Clocked in but not out
          currentStatus = {
            status: 'clocked-in',
            clockIn: todayRecord.check_in,
            location: todayRecord.clock_in_location
          };
        } else if (todayRecord.check_in && todayRecord.check_out) {
          // Fully clocked out
          currentStatus = {
            status: 'clocked-out',
            clockIn: todayRecord.check_in,
            clockOut: todayRecord.check_out,
            location: todayRecord.clock_out_location
          };
        }
      }
      
      console.log('Final clock status:', currentStatus);
      setClockStatus(currentStatus);
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };

  const filteredData = attendanceData.filter(record => {
    return !dateFilter || record.date === dateFilter;
  });

  const handleClockInOut = async () => {
    if (!user?.id) {
      toast.error("User authentication required");
      return;
    }

    // Check location before allowing clock action
    if (!locationCheckPassed) {
      try {
        const locationCheck = await isWithinBranchRange(100);
        if (!locationCheck.withinRange) {
          toast.error(
            `You must be within 100m of a branch to clock in/out. ` +
            `Nearest branch: ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`
          );
          return;
        }
        setLocationCheckPassed(true);
        setNearestBranch(locationCheck.nearestBranch || '');
      } catch (error) {
        toast.error("Location access is required to clock in/out. Please enable location services.");
        return;
      }
    }

    setIsClockingInOut(true);
    
    try {
      const isCurrentlyClockedIn = clockStatus?.status === 'clocked-in';
      const action = isCurrentlyClockedIn ? 'out' : 'in';
      
      await updateClockInOut(user.id, action, nearestBranch);
      
      const currentTime = new Date().toLocaleTimeString('en-SG', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Refresh attendance data first
      await fetchAttendanceData();
      
      // Then update clock status
      setTimeout(() => {
        checkClockStatus();
      }, 500);
      
      if (action === 'out') {
        toast.success(`Clocked out at ${currentTime}`);
      } else {
        toast.success(`Clocked in at ${currentTime} at ${nearestBranch}`);
      }
      
    } catch (error) {
      console.error('Clock in/out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error processing clock in/out. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsClockingInOut(false);
    }
  };

  // Calculate monthly statistics
  const presentDays = attendanceData.filter(record => record.status === 'Present' || record.status === 'Late').length;
  const totalHours = attendanceData.reduce((sum, record) => sum + (record.hours_worked || 0), 0);

  const isClockedIn = clockStatus?.status === 'clocked-in';
  const canClockIn = (employeeType !== 'Casual' || hasApprovedSlot) && locationCheckPassed;

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
            {/* Header with Clock In/Out Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
              </div>
              
              <Button 
                className={`h-auto p-4 ${
                  isClockedIn ? 'bg-red-600 hover:bg-red-700' : 
                  canClockIn ? 'bg-green-600 hover:bg-green-700' : 
                  'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={handleClockInOut}
                disabled={isClockingInOut || (!canClockIn && !isClockedIn)}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white">
                    {isClockingInOut ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
                  </p>
                  <div className="text-sm text-white/80 flex items-center">
                    {isClockedIn && clockStatus?.clockIn ? (
                      <>
                        {clockStatus.clockIn}
                        {clockStatus.location && (
                          <>
                            <MapPin className="w-3 h-3 mx-1" />
                            {clockStatus.location}
                          </>
                        )}
                      </>
                    ) : !canClockIn ? (
                      !locationCheckPassed ? 'Location required' : 'Slot booking required'
                    ) : nearestBranch ? (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        {nearestBranch}
                      </>
                    ) : (
                      'Within 100m of branch'
                    )}
                  </div>
                </div>
              </Button>
            </div>

            {/* Location Warning */}
            {!locationCheckPassed && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Location Access Required
                      </p>
                      <p className="text-sm text-orange-700">
                        You must be within 100m of a branch and enable location to clock in.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Casual Employee Slot Booking Warning */}
            {employeeType === 'Casual' && !hasApprovedSlot && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Slot Booking Required
                      </p>
                      <p className="text-sm text-orange-700">
                        Casual employees need approved slot booking to clock in.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Days Present This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{presentDays}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Hours This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {attendanceData.length > 0 ? ((presentDays / attendanceData.length) * 100).toFixed(1) : '0'}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Attendance Records</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={new Date().toISOString().slice(0, 7)}>
                        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                      <SelectItem value={new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)}>
                        {new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                      <SelectItem value={new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().slice(0, 7)}>
                        {new Date(new Date().setMonth(new Date().getMonth() - 2)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                    placeholder="Filter by date"
                  />
                  <Button variant="outline" onClick={() => setDateFilter('')}>
                    Clear Filter
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.date}</TableCell>
                        <TableCell>{record.check_in || '-'}</TableCell>
                        <TableCell>{record.check_out || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {record.clock_in_location && (
                              <>
                                <MapPin className="w-3 h-3 mr-1" />
                                {record.clock_in_location}
                              </>
                            )}
                            {!record.clock_in_location && (record.location || '-')}
                          </div>
                        </TableCell>
                        <TableCell>{record.hours_worked?.toFixed(1) || '0.0'}h</TableCell>
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
