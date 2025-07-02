
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Clock, DollarSign, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords, updateClockInOut, getClockInOutStatus } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllLeaveRequests } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeProfile } from '@/types/employee';
import { getEmployeeById as getLocalEmployeeById } from '@/data/employeeData';
import { getEmployeeSlotBookings, type SlotBooking } from '@/services/slotBookingService';
import { supabase } from '@/integrations/supabase/client';

interface ClockInOutRecord {
  status: 'clocked-in' | 'clocked-out';
  clockIn?: string;
  clockOut?: string;
  location?: string;
}

interface AttendanceRecord {
  id: number;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  hours_worked: number | null;
  location?: string;
  clock_in_location?: string;
  clock_out_location?: string;
}

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [clockStatus, setClockStatus] = useState<ClockInOutRecord | undefined>();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [isClockingInOut, setIsClockingInOut] = useState(false);
  const [hasApprovedSlot, setHasApprovedSlot] = useState<boolean>(false);

  // Fetch attendance data directly without React Query to avoid caching issues
  const fetchAttendanceData = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
      } else {
        setAttendanceData(data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  // Check clock status using the same logic as My Attendance page
  const checkClockStatus = async () => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check clock status from Supabase
      const supabaseStatus = await getClockInOutStatus(user.id);
      console.log('Dashboard: Supabase clock status:', supabaseStatus);
      
      // Check today's attendance record from database
      const todayRecord = attendanceData.find(record => record.date === today);
      console.log('Dashboard: Today attendance record:', todayRecord);
      
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
      
      console.log('Dashboard: Final clock status:', currentStatus);
      setClockStatus(currentStatus);
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };

  // Fetch data on component mount and when user changes
  useEffect(() => {
    fetchAttendanceData();
    fetchEmployeeData();
    checkSlotBooking();
  }, [user?.id]);

  // Check clock status after attendance data is loaded
  useEffect(() => {
    if (attendanceData.length >= 0) {
      checkClockStatus();
    }
  }, [attendanceData, user?.id]);

  const fetchEmployeeData = async () => {
    if (!user?.id) return;
    
    try {
      const employee = await getEmployeeById(user.id);
      if (employee) {
        setEmployeeData(employee);
        console.log('Dashboard: Employee type:', employee.type);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      // Fallback to local data
      const localEmployee = getLocalEmployeeById(user.id);
      if (localEmployee) {
        setEmployeeData(localEmployee);
      }
    }
  };

  const checkSlotBooking = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const allSlotBookings = await getEmployeeSlotBookings(user.id);
      
      const approvedSlot = allSlotBookings.some((booking: SlotBooking) => 
        booking.employeeId === user.id && 
        booking.date === today && 
        booking.status === 'approved'
      );
      
      setHasApprovedSlot(approvedSlot);
      console.log('Dashboard: Has approved slot for today:', approvedSlot);
    } catch (error) {
      console.error('Error checking slot booking:', error);
      setHasApprovedSlot(false);
    }
  };

  // Fetch employee-specific data using React Query
  const { data: employeeClaims = [], error: claimsError } = useQuery({
    queryKey: ['employee-claims', user?.id],
    queryFn: () => getEmployeeClaims(user?.id || ''),
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch leave requests for current employee
  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  // Calculate leave balance for current employee (only for full-time employees)
  const calculateLeaveBalance = () => {
    if (!user?.id || employeeData?.type === 'Casual') return { remaining: 0 };
    
    const currentYear = new Date().getFullYear();
    const employeeLeaves = allLeaveRequests.filter(leave => 
      leave.employeeId === user.id && 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.status === 'Approved'
    );
    
    const annualLeaveUsed = employeeLeaves
      .filter(leave => leave.type === 'Annual Leave')
      .reduce((total, leave) => total + leave.days, 0);
    
    return { remaining: 21 - annualLeaveUsed };
  };

  const leaveBalance = calculateLeaveBalance();

  // Calculate statistics
  const pendingClaims = employeeClaims.filter(claim => claim.status === 'Pending').length;
  const hoursThisMonth = attendanceData.reduce((total, record) => total + (record.hours_worked || 0), 0);
  
  // Calculate days until 2nd of next month
  const getDaysUntilNextPayroll = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    let nextPayrollDate;
    if (currentDay <= 2) {
      nextPayrollDate = new Date(currentYear, currentMonth, 2);
    } else {
      nextPayrollDate = new Date(currentYear, currentMonth + 1, 2);
    }
    
    const diffTime = nextPayrollDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Personal stats - filter out leave balance for casual employees
  const personalStats = [
    // Only show leave balance for full-time employees
    ...(employeeData?.type !== 'Casual' ? [
      { title: 'Leave Balance', value: `${leaveBalance.remaining} days`, icon: Calendar, color: 'bg-blue-500' }
    ] : []),
    { title: 'Pending Claims', value: pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    { title: 'Hours This Month', value: `${hoursThisMonth}h`, icon: Clock, color: 'bg-green-500' },
    { title: 'Next Payroll', value: `${getDaysUntilNextPayroll()} days`, icon: DollarSign, color: 'bg-purple-500' },
  ];

  const handleClockInOut = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsClockingInOut(true);
    
    try {
      const isCurrentlyClockedIn = clockStatus?.status === 'clocked-in';
      const action = isCurrentlyClockedIn ? 'out' : 'in';
      console.log('Dashboard: Starting clock', action, 'operation for user:', user.id);
      
      await updateClockInOut(user.id, action);
      console.log('Dashboard: Clock', action, 'operation completed');
      
      const currentTime = new Date().toLocaleTimeString('en-SG', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Refresh attendance data first
      await fetchAttendanceData();
      
      // Then update clock status after a short delay
      setTimeout(() => {
        checkClockStatus();
      }, 500);
      
      if (action === 'out') {
        toast.success(`Clocked out at ${currentTime}`);
      } else {
        toast.success(`Clocked in at ${currentTime}`);
      }
      
    } catch (error) {
      console.error('Dashboard: Clock in/out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update clock status';
      toast.error(errorMessage);
    } finally {
      setIsClockingInOut(false);
    }
  };

  const handleApplyLeave = () => {
    console.log('Navigating to apply leave page');
    navigate('/apply-leave');
  };

  const handleSubmitClaim = () => {
    console.log('Navigating to submit claim page');
    navigate('/submit-claim');
  };

  const handleViewPayslip = () => {
    console.log('Navigating to payslips page');
    navigate('/payslips');
  };

  const displayName = employeeData?.name || user?.name || 'Employee';
  const canClockIn = employeeData?.type !== 'Casual' || hasApprovedSlot;
  const isClockedIn = clockStatus?.status === 'clocked-in';

  // Debug logging
  console.log('Dashboard: Current render state:', {
    user,
    employeeData,
    employeeClaims: employeeClaims.length,
    attendanceRecords: attendanceData.length,
    pendingClaims,
    hoursThisMonth,
    isClockedIn,
    clockStatus,
    hasApprovedSlot,
    canClockIn,
    isClockingInOut,
    renderTimestamp: new Date().toISOString()
  });

  if (claimsError) {
    console.error('Dashboard: Error loading claims:', claimsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
      </div>

      {/* Casual Employee Slot Booking Warning */}
      {employeeData?.type === 'Casual' && !hasApprovedSlot && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Slot Booking Required</p>
                <p className="text-sm text-orange-700">
                  Casual employees need approved slot booking to clock in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {personalStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                className={`justify-start h-auto p-4 ${
                  isClockedIn ? 'bg-red-600 hover:bg-red-700 text-white' : 
                  canClockIn ? 'bg-green-600 hover:bg-green-700 text-white' : 
                  'bg-gray-400 cursor-not-allowed text-white'
                }`}
                onClick={handleClockInOut}
                disabled={isClockingInOut || (!canClockIn && !isClockedIn)}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left flex-1">
                  <p className="font-medium">
                    {isClockingInOut ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
                  </p>
                  <div className="text-sm opacity-80 flex items-center">
                    {isClockedIn && clockStatus?.clockIn ? (
                      <>
                        Clocked in at {clockStatus.clockIn}
                        {clockStatus.location && (
                          <>
                            <MapPin className="w-3 h-3 mx-1" />
                            {clockStatus.location}
                          </>
                        )}
                      </>
                    ) : !canClockIn ? (
                      'Approved slot booking required'
                    ) : (
                      'Must be within 100m of branch'
                    )}
                  </div>
                </div>
              </Button>
              
              {/* Only show Apply Leave button for full-time employees */}
              {employeeData?.type !== 'Casual' && (
                <Button 
                  className="justify-start h-auto p-4" 
                  variant="outline"
                  onClick={handleApplyLeave}
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Apply Leave</p>
                  </div>
                </Button>
              )}
              
              <Button 
                className="justify-start h-auto p-4" 
                variant="outline"
                onClick={handleSubmitClaim}
              >
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Submit Claim</p>
                </div>
              </Button>
              
              <Button 
                className="justify-start h-auto p-4" 
                variant="outline"
                onClick={handleViewPayslip}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View Payslip</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeClaims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{claim.type}</p>
                    <p className="text-sm text-gray-600">S${claim.amount} • {claim.date}</p>
                  </div>
                  <Badge variant={
                    claim.status === 'Approved' ? 'default' : 
                    claim.status === 'Pending' ? 'secondary' : 'outline'
                  }>
                    {claim.status}
                  </Badge>
                </div>
              ))}
              {employeeClaims.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
