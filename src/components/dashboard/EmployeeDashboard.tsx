import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, Clock, MapPin, AlertCircle, RefreshCw, CalendarPlus, DollarSign, Building2, GraduationCap, ArrowRightLeft } from 'lucide-react';
import { History } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords, updateClockInOut, getClockInOutStatus } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { getAllLeaveRequests } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeProfile } from '@/types/employee';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';

import { getEmployeeSlotBookings, type SlotBooking } from '@/services/slotBookingService';
import { supabase } from '@/integrations/supabase/client';
import { isWithinBranchRange } from '@/services/geolocationService';
import { useIsMobile } from '@/hooks/use-mobile';
import AttendanceHistoryDialog from './AttendanceHistoryDialog';
import SlotBookingDialog from './SlotBookingDialog';
import SubmitClaimDialog from './SubmitClaimDialog';
import ViewPayslipDialog from './ViewPayslipDialog';
import ApplyLeaveDialog from './ApplyLeaveDialog';
import BranchProfitLossDialog from './BranchProfitLossDialog';
import BranchDashboard from './BranchDashboard';
import StudentDashboard from './StudentDashboard';
import SlotBookingBranchChangeDialog from './SlotBookingBranchChangeDialog';

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

interface EmployeeDashboardProps {
  simulatedEmployeeId?: string;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ simulatedEmployeeId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Use simulated employee ID if provided (for superadmin viewing as employee)
  const effectiveEmployeeId = simulatedEmployeeId || user?.employeeId;
  const { hasAccess: hasInvoiceAccess, accessibleBranches } = useInvoiceAccess();
  const invoiceAccessBranchIds = accessibleBranches.map(b => b.branch_id);
  const [clockStatus, setClockStatus] = useState<ClockInOutRecord | undefined>();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [isClockingInOut, setIsClockingInOut] = useState(false);
  const [hasApprovedSlot, setHasApprovedSlot] = useState<boolean>(false);
  const [nearestBranch, setNearestBranch] = useState<string>('');
  const [locationCheckPassed, setLocationCheckPassed] = useState<boolean>(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
  const [showSlotBooking, setShowSlotBooking] = useState(false);
  const [showSubmitClaim, setShowSubmitClaim] = useState(false);
  const [showViewPayslip, setShowViewPayslip] = useState(false);
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [showBranchProfitLoss, setShowBranchProfitLoss] = useState(false);
  const [showBranchChange, setShowBranchChange] = useState(false);


  useEffect(() => {
    fetchAttendanceData();
    fetchEmployeeData();
    checkSlotBooking();
    if (!simulatedEmployeeId) {
      checkLocationOnLoad();
    }
  }, [effectiveEmployeeId]);

  useEffect(() => {
    if (attendanceData.length >= 0) {
      checkClockStatus();
    }
  }, [attendanceData, effectiveEmployeeId]);

  const checkLocationOnLoad = async () => {
    if (!effectiveEmployeeId) return;
    
    setIsCheckingLocation(true);
    setLocationError('');
    
    try {
      console.log('Dashboard: Starting location check for user:', effectiveEmployeeId);
      const locationCheck = await isWithinBranchRange(3000, effectiveEmployeeId);
      console.log('Dashboard: Location check result:', locationCheck);
      
      setLocationCheckPassed(locationCheck.withinRange);
      setNearestBranch(locationCheck.nearestBranch || '');
      
      if (!locationCheck.withinRange && !locationCheck.hasException) {
        setLocationError(`You are ${locationCheck.distance}m away from the nearest branch (${locationCheck.nearestBranch}). You must be within 3000m to clock in.`);
      } else if (locationCheck.hasException) {
        setLocationError('');
        console.log('Location exception active - clock in enabled');
      }
    } catch (error: any) {
      console.error('Dashboard: Location check failed:', error);
      setLocationCheckPassed(false);
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'Location check failed. Please check your browser location settings.');
      setLocationError(errorMessage);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const retryLocationCheck = async () => {
    await checkLocationOnLoad();
  };

  const fetchAttendanceData = async () => {
    if (!effectiveEmployeeId) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', effectiveEmployeeId)
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

  const checkClockStatus = async () => {
    if (!effectiveEmployeeId) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      const supabaseStatus = await getClockInOutStatus(effectiveEmployeeId);
      console.log('Dashboard: Supabase clock status:', supabaseStatus);
      
      const todayRecord = attendanceData.find(record => record.date === today);
      console.log('Dashboard: Today attendance record:', todayRecord);
      
      let currentStatus: ClockInOutRecord | undefined;
      
      if (supabaseStatus) {
        currentStatus = {
          status: supabaseStatus.status,
          clockIn: supabaseStatus.clockIn,
          clockOut: supabaseStatus.clockOut,
          location: supabaseStatus.location
        };
      } else if (todayRecord) {
        if (todayRecord.check_in && !todayRecord.check_out) {
          currentStatus = {
            status: 'clocked-in',
            clockIn: todayRecord.check_in,
            location: todayRecord.clock_in_location
          };
        } else if (todayRecord.check_in && todayRecord.check_out) {
          currentStatus = {
            status: 'clocked-out',
            clockIn: todayRecord.check_in,
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

  const fetchEmployeeData = async () => {
    if (!effectiveEmployeeId) return;
    
    try {
      const employee = await getEmployeeById(effectiveEmployeeId);
      if (employee) {
        setEmployeeData(employee);
        console.log('Dashboard: Employee type:', employee.type);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const checkSlotBooking = async () => {
    if (!effectiveEmployeeId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const allSlotBookings = await getEmployeeSlotBookings(effectiveEmployeeId);
      
      const approvedSlot = allSlotBookings.some((booking: SlotBooking) => 
        booking.employeeId === effectiveEmployeeId && 
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

  const { data: employeeClaims = [], error: claimsError } = useQuery({
    queryKey: ['employee-claims', effectiveEmployeeId],
    queryFn: () => getEmployeeClaims(effectiveEmployeeId || ''),
    enabled: !!effectiveEmployeeId,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  // Fetch proper leave entitlement from database
  const { data: leaveEntitlement } = useQuery({
    queryKey: ['leave-entitlement', effectiveEmployeeId, new Date().getFullYear()],
    queryFn: async () => {
      if (!effectiveEmployeeId) return null;
      const { calculateEmployeeLeaveEntitlement } = await import('@/services/enhancedLeaveService');
      return calculateEmployeeLeaveEntitlement(effectiveEmployeeId, new Date().getFullYear());
    },
    enabled: !!effectiveEmployeeId && employeeData?.type === 'Full-Time',
    staleTime: 5 * 60 * 1000,
  });

  const calculateLeaveBalance = () => {
    if (!effectiveEmployeeId || employeeData?.type === 'Casual') return { remaining: 0, entitlement: 0 };
    
    const currentYear = new Date().getFullYear();
    const employeeLeaves = allLeaveRequests.filter(leave => 
      leave.employeeId === effectiveEmployeeId && 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.status === 'Approved'
    );
    
    const annualLeaveUsed = employeeLeaves
      .filter(leave => leave.type === 'Annual Leave')
      .reduce((total, leave) => total + leave.days, 0);
    
    const entitlement = leaveEntitlement?.finalAnnualLeave || 0;
    return { remaining: entitlement - annualLeaveUsed, entitlement };
  };

  const leaveBalance = calculateLeaveBalance();

  const pendingClaims = employeeClaims.filter(claim => claim.status === 'Pending').length;
  const hoursThisMonth = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyHours = attendanceData
      .filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear;
      })
      .reduce((total, record) => total + (record.hours_worked || 0), 0);
    
    return Math.round(monthlyHours * 10) / 10;
  })();

  // Calculate total earnings this month from slot bookings with dynamic pricing
  const currentPeriod = (() => {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  })();

  const { data: earningsData } = useQuery({
    queryKey: ['employee-earnings-month', effectiveEmployeeId, currentPeriod],
    queryFn: async () => {
      if (!effectiveEmployeeId || !employeeData) return { totalPay: 0 };
      const { getSlotBookingPayForPeriod } = await import('@/services/slotBookingPayrollService');
      return getSlotBookingPayForPeriod(effectiveEmployeeId, currentPeriod, employeeData);
    },
    enabled: !!effectiveEmployeeId && !!employeeData,
    staleTime: 5 * 60 * 1000,
  });

  const earningsThisMonth = Math.round((earningsData?.totalPay || 0) * 100) / 100;

  const isPartnerPosition = employeeData?.position?.toLowerCase() === 'partner' || 
                            employeeData?.position?.toLowerCase() === 'senior partner';

  // Query partner branch shares for P&L access
  const { data: partnerBranchShares = [] } = useQuery({
    queryKey: ['partner-branch-shares', effectiveEmployeeId],
    queryFn: async () => {
      if (!effectiveEmployeeId) return [];
      const { data, error } = await supabase
        .from('partner_branch_shares')
        .select('branch_id, share_percentage')
        .eq('employee_id', effectiveEmployeeId)
        .is('effective_to', null);
      
      if (error) {
        console.error('Error fetching partner shares:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!effectiveEmployeeId && isPartnerPosition,
    staleTime: 5 * 60 * 1000,
  });

  const hasPartnerBranchShares = partnerBranchShares.length > 0;

  const isFullTime = employeeData?.type === 'Full-Time';
  
  const personalStats = [
    // Leave Balance only for non-casual, non-partner employees
    ...(employeeData?.type !== 'Casual' && !isPartnerPosition ? [
      { title: 'Leave Balance', value: `${leaveBalance.remaining} days`, icon: Calendar, color: 'bg-blue-500' }
    ] : []),
    // Hide Pending Claims, Hours This Month, and Earnings This Month for full-time employees
    ...(!isFullTime ? [
      { title: 'Pending Claims', value: pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    ] : []),
    ...(!isPartnerPosition && !isFullTime ? [
      { title: 'Hours This Month', value: `${hoursThisMonth}h`, icon: Clock, color: 'bg-green-500' },
      { title: 'Earnings This Month', value: `S$${earningsThisMonth.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
    ] : []),
  ];

  const handleClockInOut = async () => {
    if (!effectiveEmployeeId) {
      toast.error("Employee ID not found. Please contact administrator.");
      return;
    }

    // Always do a fresh location check when trying to clock in/out
    if (!locationCheckPassed) {
      setIsCheckingLocation(true);
      try {
        const locationCheck = await isWithinBranchRange(3000, effectiveEmployeeId);
        if (!locationCheck.withinRange && !locationCheck.hasException) {
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
        
        if (locationCheck.hasException) {
          console.log('Using admin location exception for clock in/out');
        }
      } catch (error: any) {
        const errorMessage = error?.message || (error instanceof Error ? error.message : 'Location access failed. Please check settings.');
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
      
      await fetchAttendanceData();
      
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

  const handleApplyLeave = () => {
    console.log('Opening apply leave dialog');
    setShowApplyLeave(true);
  };

  const handleSubmitClaim = () => {
    console.log('Opening submit claim dialog');
    setShowSubmitClaim(true);
  };

  const handleViewPayslip = () => {
    console.log('Opening view payslip dialog');
    setShowViewPayslip(true);
  };

  const displayName = employeeData?.name || user?.name || 'Employee';
  const canClockIn = (employeeData?.type !== 'Casual' || hasApprovedSlot) && locationCheckPassed;
  const isClockedIn = clockStatus?.status === 'clocked-in';

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
    locationCheckPassed,
    nearestBranch,
    isCheckingLocation,
    locationError,
    renderTimestamp: new Date().toISOString()
  });

  if (claimsError) {
    console.error('Dashboard: Error loading claims:', claimsError);
  }

  const dashboardContent = (
    <>
      <div className="space-y-4 md:space-y-6">
        <div>
        <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          Welcome back, {isMobile ? displayName.split(' ')[0] : displayName}
        </h2>
      </div>

      {!user?.employeeId && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-3">
              <AlertCircle className={`text-red-600 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <div>
                <p className={`font-medium text-red-800 ${isMobile ? 'text-sm' : 'text-sm'}`}>
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

      {(!locationCheckPassed || locationError) && !isPartnerPosition && !isFullTime && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className={`text-orange-600 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <div>
                  <p className={`font-medium text-orange-800 ${isMobile ? 'text-sm' : 'text-sm'}`}>
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

      {employeeData?.type === 'Casual' && !hasApprovedSlot && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-3">
              <AlertCircle className={`text-orange-600 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <div>
                <p className={`font-medium text-orange-800 ${isMobile ? 'text-sm' : 'text-sm'}`}>Slot Booking Required</p>
                <p className={`text-orange-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Casual employees need approved slot booking to clock in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-3 md:gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {personalStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{stat.title}</p>
                  <p className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2 md:p-3 rounded-lg`}>
                  <stat.icon className={`text-white ${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <Card>
          <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-lg' : ''}>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4 pt-2' : ''}>
            <div className={`grid grid-cols-1 gap-2 md:gap-3`}>
              {!isPartnerPosition && !isFullTime && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4 ${
                    isClockedIn ? 'bg-red-600 hover:bg-red-700' : 
                    canClockIn ? 'bg-green-600 hover:bg-green-700' : 
                    'bg-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleClockInOut}
                  disabled={isClockingInOut || isCheckingLocation || (!canClockIn && !isClockedIn) || !user?.employeeId}
                >
                  <Clock className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left flex-1">
                    <p className={`font-medium text-white ${isMobile ? 'text-sm' : ''}`}>
                      {isClockingInOut ? 'Processing...' : 
                       isCheckingLocation ? 'Checking location...' :
                       !user?.employeeId ? 'Employee ID Required' :
                       (isClockedIn ? 'Clock Out' : 'Clock In')}
                    </p>
                    <div className={`text-white/80 flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {isClockedIn && clockStatus?.clockIn ? (
                        <>
                          Clocked in at {clockStatus.clockIn}
                          {clockStatus.location && (
                            <>
                              <MapPin className={`mx-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
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
                          <MapPin className={`mr-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                          {nearestBranch}
                        </>
                      ) : (
                        'Within 100m of branch'
                      )}
                    </div>
                  </div>
                </Button>
              )}
              
              {/* Hide Apply Leave for partners */}
              {employeeData?.type !== 'Casual' && 
               employeeData?.position?.toLowerCase() !== 'partner' && 
               employeeData?.position?.toLowerCase() !== 'senior partner' && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4`} 
                  variant="outline"
                  onClick={handleApplyLeave}
                >
                  <Calendar className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left">
                    <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Apply Leave</p>
                  </div>
                </Button>
              )}
              
              {employeeData?.type === 'Casual' && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4`} 
                  variant="outline"
                  onClick={() => setShowSlotBooking(true)}
                >
                  <CalendarPlus className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left">
                    <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Book Slots</p>
                  </div>
                </Button>
              )}

              {employeeData?.type === 'Casual' && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4`} 
                  variant="outline"
                  onClick={() => setShowBranchChange(true)}
                >
                  <ArrowRightLeft className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left flex-1">
                    <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                      Change Booking Branch
                    </p>
                  </div>
                </Button>
              )}
              <Button
                className={`justify-start h-auto p-3 md:p-4`} 
                variant="outline"
                onClick={handleSubmitClaim}
              >
                <FileText className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <div className="text-left">
                  <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                    {employeeData?.position?.toLowerCase() === 'partner' || 
                     employeeData?.position?.toLowerCase() === 'senior partner' 
                      ? 'Submit Partners Claim' 
                      : 'Submit Claim'}
                  </p>
                </div>
              </Button>
              
              <Button 
                className={`justify-start h-auto p-3 md:p-4`} 
                variant="outline"
                onClick={handleViewPayslip}
              >
                <Clock className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <div className="text-left">
                  <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>View Payslip</p>
                </div>
              </Button>
              
              {!isPartnerPosition && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4`} 
                  variant="outline"
                  onClick={() => setShowAttendanceHistory(true)}
                >
                  <History className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left">
                    <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Attendance History</p>
                  </div>
                </Button>
              )}

              {isPartnerPosition && hasPartnerBranchShares && (
                <Button 
                  className={`justify-start h-auto p-3 md:p-4`} 
                  variant="outline"
                  onClick={() => setShowBranchProfitLoss(true)}
                >
                  <Building2 className={`mr-3 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <div className="text-left">
                    <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>View Branch Profit & Loss</p>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-lg' : ''}>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4 pt-2' : ''}>
            <div className={`space-y-3 md:space-y-4`}>
              {employeeClaims.slice(0, 3).map((claim) => (
                <div key={claim.id} className={`flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg`}>
                  <div>
                    <p className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>{claim.type}</p>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>S${claim.amount} • {claim.date}</p>
                  </div>
                  <Badge variant={
                    claim.status === 'Approved' ? 'default' : 
                    claim.status === 'Pending' ? 'secondary' : 'outline'
                  } className={isMobile ? 'text-xs px-2 py-0.5' : ''}>
                    {claim.status}
                  </Badge>
                </div>
              ))}
              {employeeClaims.length === 0 && (
                <p className={`text-gray-500 text-center py-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

      {effectiveEmployeeId && (
        <AttendanceHistoryDialog
          open={showAttendanceHistory}
          onOpenChange={setShowAttendanceHistory}
          employeeId={effectiveEmployeeId}
        />
      )}

      {effectiveEmployeeId && employeeData?.type === 'Casual' && (
        <SlotBookingDialog
          open={showSlotBooking}
          onOpenChange={setShowSlotBooking}
          employeeId={effectiveEmployeeId}
          employeeName={employeeData.name}
          employeeType={employeeData.type}
          qualifications={employeeData.qualifications}
          joinDate={employeeData.joinDate}
        />
      )}

      {effectiveEmployeeId && employeeData && (
        <SubmitClaimDialog
          open={showSubmitClaim}
          onOpenChange={setShowSubmitClaim}
          employeeId={effectiveEmployeeId}
          employee={employeeData}
        />
      )}

      {effectiveEmployeeId && employeeData && (
        <ViewPayslipDialog
          open={showViewPayslip}
          onOpenChange={setShowViewPayslip}
          employeeId={effectiveEmployeeId}
          employee={employeeData}
        />
      )}

      {effectiveEmployeeId && employeeData && employeeData.type !== 'Casual' && (
        <ApplyLeaveDialog
          open={showApplyLeave}
          onOpenChange={setShowApplyLeave}
          employeeId={effectiveEmployeeId}
          employee={employeeData}
        />
      )}

      {effectiveEmployeeId && isPartnerPosition && hasPartnerBranchShares && (
        <BranchProfitLossDialog
          open={showBranchProfitLoss}
          onOpenChange={setShowBranchProfitLoss}
          employeeId={effectiveEmployeeId}
        />
      )}

      {effectiveEmployeeId && employeeData?.type === 'Casual' && (
        <SlotBookingBranchChangeDialog
          open={showBranchChange}
          onOpenChange={setShowBranchChange}
          employeeId={effectiveEmployeeId}
          employeeName={employeeData.name}
        />
      )}
    </>
  );

  if (!hasInvoiceAccess || simulatedEmployeeId) {
    return dashboardContent;
  }

  return (
    <EmployeeDashboardWithTabs
      dashboardContent={dashboardContent}
      invoiceAccessBranchIds={invoiceAccessBranchIds}
    />
  );
};

const EmployeeDashboardWithTabs: React.FC<{
  dashboardContent: React.ReactNode;
  invoiceAccessBranchIds: string[];
}> = ({ dashboardContent, invoiceAccessBranchIds }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['employee-branch-students', invoiceAccessBranchIds],
    queryFn: async () => {
      if (!invoiceAccessBranchIds.length) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, status')
        .in('branch_id', invoiceAccessBranchIds)
        .ilike('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'students' && invoiceAccessBranchIds.length > 0,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="students" className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 hidden sm:block" />
                  Students
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab === 'students' && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <span className="uppercase">{student.first_name} {student.last_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'dashboard' && dashboardContent}

      {activeTab === 'branch' && invoiceAccessBranchIds.length > 0 && (
        <BranchDashboard branchId={invoiceAccessBranchIds[0]} />
      )}

      {activeTab === 'students' && (
        selectedStudent ? (
          <StudentDashboard studentId={selectedStudent} isSimulated readOnly />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a student to view their portal</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};

export default EmployeeDashboard;
