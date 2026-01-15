import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { updateClockInOut, getClockInOutStatus } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllSlotBookings } from '@/services/slotBookingService';
import { isWithinBranchRange } from '@/services/geolocationService';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationOptIn } from '@/components/notifications/NotificationOptIn';

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
  const isMobile = useIsMobile();
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
  const [isCheckingLocation, setIsCheckingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');

  useEffect(() => {
    fetchAttendanceData();
    fetchEmployeeData();
    checkSlotBooking();
    checkLocationOnLoad();
  }, [user?.employeeId, monthFilter]);

  useEffect(() => {
    // Check clock status after attendance data is loaded
    if (attendanceData.length >= 0) {
      checkClockStatus();
    }
  }, [attendanceData, user?.employeeId]);

  const checkLocationOnLoad = async () => {
    if (!user?.employeeId) return;
    
    setIsCheckingLocation(true);
    setLocationError('');
    
    try {
      console.log('MyAttendance: Starting location check for user:', user.employeeId);
      const locationCheck = await isWithinBranchRange(3000, user.employeeId);
      console.log('MyAttendance: Location check result:', locationCheck);
      
      setLocationCheckPassed(locationCheck.withinRange);
      setNearestBranch(locationCheck.nearestBranch || '');
      
      if (!locationCheck.withinRange) {
        setLocationError(`You are ${locationCheck.distance}m away from the nearest branch (${locationCheck.nearestBranch}). You must be within 3000m to clock in.`);
      }
    } catch (error) {
      console.error('MyAttendance: Location check failed:', error);
      setLocationCheckPassed(false);
      const errorMessage = error instanceof Error ? error.message : 'Location check failed';
      setLocationError(errorMessage);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const retryLocationCheck = async () => {
    await checkLocationOnLoad();
  };

  const fetchEmployeeData = async () => {
    if (!user?.employeeId) return;
    
    try {
      const employee = await getEmployeeById(user.employeeId);
      if (employee) {
        setEmployeeType(employee.type);
        console.log('Employee type:', employee.type);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const checkSlotBooking = async () => {
    if (!user?.employeeId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const allSlotBookings = await getAllSlotBookings();
      
      const approvedSlot = allSlotBookings.some(booking => 
        booking.employeeId === user.employeeId && 
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
    if (!user?.employeeId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.employeeId)
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
    if (!user?.employeeId) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check clock status from Supabase
      const supabaseStatus = await getClockInOutStatus(user.employeeId);
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
    if (!user?.employeeId) {
      toast.error("Employee ID not found. Please contact administrator.");
      return;
    }

    // Always do a fresh location check when trying to clock in/out
    if (!locationCheckPassed) {
      setIsCheckingLocation(true);
      try {
        const locationCheck = await isWithinBranchRange(3000, user.employeeId);
        if (!locationCheck.withinRange) {
          toast.error(
            `You must be within 3000m of a branch to clock in/out. ` +
            `Nearest branch: ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`
          );
          setLocationError(`You are ${locationCheck.distance}m away from ${locationCheck.nearestBranch}`);
          return;
        }
        setLocationCheckPassed(true);
        setNearestBranch(locationCheck.nearestBranch || '');
        setLocationError('');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Location access failed';
        toast.error(errorMessage);
        setLocationError(errorMessage);
        return;
      } finally {
        setIsCheckingLocation(false);
      }
    }

    setIsClockingInOut(true);
    
    try {
      const isCurrentlyClockedIn = clockStatus?.status === 'clocked-in';
      const action = isCurrentlyClockedIn ? 'out' : 'in';
      
      await updateClockInOut(user.employeeId, action, nearestBranch);
      
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

  // Calculate monthly statistics based on actual database fields
  const presentDays = attendanceData.filter(record => record.check_in !== null).length;
  const totalHours = attendanceData.reduce((sum, record) => sum + (record.hours_worked || 0), 0);

  const isClockedIn = clockStatus?.status === 'clocked-in';
  const canClockIn = (employeeType !== 'Casual' || hasApprovedSlot) && locationCheckPassed;

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className={`space-y-6 ${isMobile ? 'space-y-4' : ''}`}>
        {/* Header with Clock In/Out Button */}
        <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>My Attendance</h2>
          </div>
          
          <Button 
            className={`h-auto ${isMobile ? 'w-full p-3' : 'p-4'} ${
              isClockedIn ? 'bg-red-600 hover:bg-red-700' : 
              canClockIn ? 'bg-green-600 hover:bg-green-700' : 
              'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={handleClockInOut}
            disabled={isClockingInOut || isCheckingLocation || (!canClockIn && !isClockedIn) || !user?.employeeId}
          >
            <Clock className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-medium text-white">
                {isClockingInOut ? 'Processing...' : 
                 isCheckingLocation ? 'Checking location...' :
                 !user?.employeeId ? 'Employee ID Required' :
                 (isClockedIn ? 'Clock Out' : 'Clock In')}
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
                ) : !user?.employeeId ? (
                  'Contact administrator'
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

        {/* Employee ID Missing Warning */}
        {!user?.employeeId && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className={isMobile ? 'p-3' : 'p-4'}>
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className={`font-medium text-red-800 ${isMobile ? 'text-sm' : ''}`}>
                    Employee ID Missing
                  </p>
                  <p className={`text-red-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Employee ID not found. Please contact administrator to set up your employee record.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Warning */}
        {(!locationCheckPassed || locationError) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className={isMobile ? 'p-3' : 'p-4'}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className={`font-medium text-orange-800 ${isMobile ? 'text-sm' : ''}`}>
                      Location Access Required
                    </p>
                    <p className={`text-orange-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {locationError || 'You must be within 3000m of a branch and enable location to clock in.'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLocationCheck}
                  disabled={isCheckingLocation}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingLocation ? 'animate-spin' : ''}`} />
                  <span>Retry</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Casual Employee Slot Booking Warning */}
        {employeeType === 'Casual' && !hasApprovedSlot && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className={isMobile ? 'p-3' : 'p-4'}>
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className={`font-medium text-orange-800 ${isMobile ? 'text-sm' : ''}`}>
                    Slot Booking Required
                  </p>
                  <p className={`text-orange-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Casual employees need approved slot booking to clock in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Push Notification Opt-In for Casual Employees */}
        {employeeType === 'Casual' && (
          <NotificationOptIn />
        )}

        {/* Statistics Cards */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Days Present This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{presentDays}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Total Hours This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-bold text-green-600 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {attendanceData.length > 0 ? ((presentDays / attendanceData.length) * 100).toFixed(1) : '0'}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-lg' : ''}`}>
                <Calendar className="w-5 h-5" />
                <span>Attendance Records</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex gap-4 mb-6 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-48'}>
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
                className={isMobile ? 'w-full' : 'w-40'}
                placeholder="Filter by date"
              />
              <Button variant="outline" onClick={() => setDateFilter('')} className={isMobile ? 'w-full' : ''}>
                Clear Filter
              </Button>
            </div>

            {isMobile ? (
              // Mobile: Card-based layout
              <div className="space-y-3">
                {filteredData.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{record.date}</span>
                      <span className="text-xs text-gray-600">{record.hours_worked?.toFixed(1) || '0.0'}h</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>In: {record.check_in || '-'}</div>
                      <div>Out: {record.check_out || '-'}</div>
                      {(record.clock_in_location || record.location) && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {record.clock_in_location || record.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredData.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">No attendance records found for the selected date.</p>
                  </div>
                )}
              </div>
            ) : (
              // Desktop: Table layout
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
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default MyAttendance;
