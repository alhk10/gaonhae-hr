import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Clock, DollarSign, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords, updateClockInOut, getClockInOutStatus } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllLeaveRequests } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeProfile } from '@/types/employee';
import { getEmployeeById as getLocalEmployeeById } from '@/data/employeeData';
import { getEmployeeSlotBookings, type SlotBooking } from '@/services/slotBookingService';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [clockLocation, setClockLocation] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [isClockingInOut, setIsClockingInOut] = useState(false);
  const [hasApprovedSlot, setHasApprovedSlot] = useState<boolean>(false);

  // Try to fetch employee data from Supabase first, then fallback to local data
  const { data: supabaseEmployee, error: supabaseError } = useQuery({
    queryKey: ['current-employee', user?.id],
    queryFn: () => getEmployeeById(user?.id || ''),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch leave requests for current employee
  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  // Fetch employee slot bookings from Supabase
  const { data: employeeSlotBookings = [] } = useQuery({
    queryKey: ['employee-slot-bookings', user?.id],
    queryFn: () => getEmployeeSlotBookings(user?.id || ''),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate leave balance for current employee
  const calculateLeaveBalance = () => {
    if (!user?.id) return { remaining: 0 };
    
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

  // Update employee data when query resolves or falls back to local data
  useEffect(() => {
    console.log('EmployeeDashboard: Loading employee data for user:', user);
    
    if (supabaseEmployee) {
      console.log('EmployeeDashboard: Using Supabase employee data:', supabaseEmployee);
      setEmployeeData(supabaseEmployee);
    } else if (supabaseError) {
      console.log('EmployeeDashboard: Supabase error, falling back to local data for:', user?.id);
      const localEmployee = getLocalEmployeeById(user?.id || '');
      if (localEmployee) {
        console.log('EmployeeDashboard: Using local employee data:', localEmployee);
        setEmployeeData(localEmployee);
      } else {
        console.log('EmployeeDashboard: No employee data found in local or Supabase');
        setEmployeeData(null);
      }
    }
  }, [supabaseEmployee, supabaseError, user?.id]);

  // Check clock-in status on load
  useEffect(() => {
    if (user?.id) {
      const clockStatus = getClockInOutStatus(user.id);
      if (clockStatus) {
        setIsClockedIn(clockStatus.status === 'clocked-in');
        setClockTime(clockStatus.clockIn || null);
        setClockLocation(clockStatus.location || null);
      }
    }
  }, [user?.id]);

  // Check slot booking for casual employees using Supabase data
  useEffect(() => {
    if (user?.id && employeeData?.type === 'Casual') {
      const today = new Date().toISOString().split('T')[0];
      
      const approvedSlot = employeeSlotBookings.some((booking: SlotBooking) => 
        booking.employeeId === user.id && 
        booking.date === today && 
        booking.status === 'approved'
      );
      
      setHasApprovedSlot(approvedSlot);
      console.log('Dashboard: Has approved slot for today:', approvedSlot);
    }
  }, [user?.id, employeeData, employeeSlotBookings]);

  // Fetch employee-specific data
  const { data: employeeClaims = [], error: claimsError } = useQuery({
    queryKey: ['employee-claims', user?.id],
    queryFn: () => getEmployeeClaims(user?.id || ''),
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendanceRecords = [], error: attendanceError } = useQuery({
    queryKey: ['employee-attendance', user?.id],
    queryFn: () => getEmployeeAttendanceRecords(user?.id || ''),
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate real stats
  const pendingClaims = employeeClaims.filter(claim => claim.status === 'Pending').length;
  const hoursThisMonth = attendanceRecords.reduce((total, record) => total + (record.hoursWorked || 0), 0);
  
  // Calculate days until 2nd of next month
  const getDaysUntilNextPayroll = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    let nextPayrollDate;
    if (currentDay <= 2) {
      // If today is 1st or 2nd, next payroll is this month's 2nd
      nextPayrollDate = new Date(currentYear, currentMonth, 2);
    } else {
      // Otherwise, next payroll is next month's 2nd
      nextPayrollDate = new Date(currentYear, currentMonth + 1, 2);
    }
    
    const diffTime = nextPayrollDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const personalStats = [
    { title: 'Leave Balance', value: `${leaveBalance.remaining} days`, icon: Calendar, color: 'bg-blue-500' },
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
      const action = isClockedIn ? 'out' : 'in';
      await updateClockInOut(user.id, action);
      
      const currentTime = new Date().toLocaleTimeString('en-SG', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (action === 'out') {
        setIsClockedIn(false);
        setClockTime(null);
        setClockLocation(null);
        toast.success(`Clocked out at ${currentTime}`);
      } else {
        const clockStatus = getClockInOutStatus(user.id);
        setIsClockedIn(true);
        setClockTime(currentTime);
        setClockLocation(clockStatus?.location || null);
        toast.success(`Clocked in at ${currentTime}${clockStatus?.location ? ` at ${clockStatus.location}` : ''}`);
      }
    } catch (error) {
      console.error('Clock in/out error:', error);
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
  const displayDepartment = employeeData?.branch || user?.department || 'Not specified';
  const displayEmployeeId = employeeData?.id || user?.id || user?.employeeId || 'Not specified';
  const canClockIn = employeeData?.type !== 'Casual' || hasApprovedSlot;

  // Debug logging
  console.log('EmployeeDashboard: Current state:', {
    user,
    employeeData,
    employeeClaims: employeeClaims.length,
    attendanceRecords: attendanceRecords.length,
    pendingClaims,
    hoursThisMonth,
    isClockedIn,
    clockTime,
    clockLocation,
    leaveBalance,
    hasApprovedSlot,
    canClockIn
  });

  if (claimsError) {
    console.error('EmployeeDashboard: Error loading claims:', claimsError);
  }
  if (attendanceError) {
    console.error('EmployeeDashboard: Error loading attendance:', attendanceError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
        <p className="text-gray-600">Employee ID: {displayEmployeeId} • {displayDepartment}</p>
        {employeeData?.position && (
          <p className="text-gray-600">Position: {employeeData.position}</p>
        )}
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
                  isClockedIn ? 'bg-red-600 hover:bg-red-700' : 
                  canClockIn ? 'bg-green-600 hover:bg-green-700' : 
                  'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={handleClockInOut}
                disabled={isClockingInOut || (!canClockIn && !isClockedIn)}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left flex-1">
                  <p className="font-medium text-white">
                    {isClockingInOut ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
                  </p>
                  <div className="text-sm text-white/80 flex items-center">
                    {isClockedIn && clockTime ? (
                      <>
                        Clocked in at {clockTime}
                        {clockLocation && (
                          <>
                            <MapPin className="w-3 h-3 mx-1" />
                            {clockLocation}
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
