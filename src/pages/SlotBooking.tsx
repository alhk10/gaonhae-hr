import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Plus, DollarSign, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById } from '@/services/employeeService';
import { EmployeeQualifications } from '@/types/employee';
import { calculateSlotPay, getPayBreakdown, isFromNovember2024 } from '@/utils/slotPayCalculation';
import { formatDate, formatMonthShort } from '@/utils/dateFormat';
import {
  getBranches,
  addSlotBooking,
  getEmployeeSlotBookings,
  getBranchSlotBookings,
  updateBranchColors,
  checkForExistingBooking,
  verifyEmployeeExists,
  getAvailableSlotsForDate,
  getWeeklySlotConfig,
  type Branch,
  type SlotBooking as SlotBookingType,
  type WeeklySlotConfig
} from '@/services/slotBookingService';
import EnhancedCalendar from '@/components/slot-booking/EnhancedCalendar';
import EnhancedBranchSelector from '@/components/slot-booking/EnhancedBranchSelector';
import SelectedDatesManager from '@/components/slot-booking/SelectedDatesManager';
import BookingActions from '@/components/slot-booking/BookingActions';
import SlotBookingManagementContent from '@/components/slot-booking/SlotBookingManagementContent';
import { useIsMobile } from '@/hooks/use-mobile';

const SlotBooking = () => {
  const { user, userDetails, userrole } = useAuth();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [approvedBookingsCount, setApprovedBookingsCount] = useState(0);
  const [employeeBookings, setEmployeeBookings] = useState<SlotBookingType[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<SlotBookingType[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [approvedBookingDates, setApprovedBookingDates] = useState<Set<string>>(new Set());
  const [employeeBookingDates, setEmployeeBookingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [employeeVerified, setEmployeeVerified] = useState<boolean | null>(null);
  const [isBranchDataLoading, setIsBranchDataLoading] = useState(false);
  const [weeklySlotConfig, setWeeklySlotConfig] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [employeeQualifications, setEmployeeQualifications] = useState<EmployeeQualifications | null>(null);
  const [employeeJoinDate, setEmployeeJoinDate] = useState<string | null>(null);
  const [calculatedPay, setCalculatedPay] = useState<{ date: string; amount: number; breakdown: { item: string; amount: number }[] }[]>([]);
  const [bookingPayData, setBookingPayData] = useState<Map<string, { amount: number; breakdown: { item: string; amount: number }[] }>>(new Map());
  const [totalEstimatedEarnings, setTotalEstimatedEarnings] = useState<number>(0);
  const [selectedPayBreakdown, setSelectedPayBreakdown] = useState<{
    bookingId: string;
    branchName: string;
    date: string;
    amount: number;
    breakdown: { item: string; amount: number }[];
  } | null>(null);

  const currentBranch = branches.find(b => b.id === selectedBranch);

  // Check if user can manage slot bookings (Senior Partner or Superadmin)
  const isSeniorPartner = currentEmployee?.position?.toLowerCase() === 'senior partner';
  const canManageSlotBooking = userrole === 'superadmin' || isSeniorPartner;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.employeeId) {
      loadEmployeeBookings();
      verifyCurrentEmployee();
      loadEmployeeQualifications();
      loadCurrentEmployee();
    }
  }, [user?.employeeId]);

  const loadCurrentEmployee = async () => {
    if (!user?.employeeId) return;
    try {
      const employee = await getEmployeeById(user.employeeId);
      setCurrentEmployee(employee);
    } catch (error) {
      console.error('Error loading current employee:', error);
    }
  };

  useEffect(() => {
    calculatePayForSelectedDates();
  }, [selectedDates, employeeQualifications, employeeJoinDate]);

  useEffect(() => {
    if (selectedBranch && branches.length > 0) {
      console.log('SlotBooking: Branch changed to:', selectedBranch);
      loadApprovedBookingDates();
    }
  }, [selectedBranch, branches]);

  useEffect(() => {
    filterBookingsByMonth();
  }, [employeeBookings, selectedMonth]);

  useEffect(() => {
    calculateApprovedBookings();
  }, [employeeBookings, employeeQualifications, employeeJoinDate]);

  useEffect(() => {
    calculateBookingHistoryPay();
  }, [filteredBookings, employeeQualifications, employeeJoinDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('SlotBooking: Loading initial slot booking data from Supabase...');
      
      await updateBranchColors();
      
      const [branchesData, weeklyConfig] = await Promise.all([
        getBranches(),
        getWeeklySlotConfig()
      ]);
      
      // Filter out branches with no slots available
      const filteredBranches = branchesData.filter(branch => {
        const config = weeklyConfig[branch.id];
        if (!config) return false;
        
        // Check if branch has at least one day with slots > 0
        const hasSlots = Object.values(config).some(slots => (slots as number) > 0);
        return hasSlots;
      });
      
      setBranches(filteredBranches);
      setWeeklySlotConfig(weeklyConfig);
      
      // Set first available branch as default if current selection has no slots
      if (filteredBranches.length > 0) {
        const currentBranchHasSlots = filteredBranches.some(b => b.id === selectedBranch);
        if (!currentBranchHasSlots) {
          setSelectedBranch(filteredBranches[0].id);
          console.log('SlotBooking: Auto-selected first available branch:', filteredBranches[0].id);
        }
      }
      
      console.log('SlotBooking: Loaded branches with colors:', filteredBranches);
      console.log('SlotBooking: Loaded weekly slot config:', weeklyConfig);
    } catch (error) {
      console.error('SlotBooking: Error loading initial data:', error);
      toast.error('Failed to load slot booking data');
    } finally {
      setLoading(false);
    }
  };

  const verifyCurrentEmployee = async () => {
    if (!user?.employeeId) {
      console.error('SlotBooking: No employeeId found for user:', user);
      setEmployeeVerified(false);
      return;
    }
    
    try {
      console.log('SlotBooking: Verifying current employee:', user.employeeId);
      const verification = await verifyEmployeeExists(user.employeeId);
      setEmployeeVerified(verification.exists);
      
      if (!verification.exists) {
        console.error('SlotBooking: Current user not found in employees table:', user.employeeId);
        toast.error('Your employee record was not found. Please contact administrator.');
      } else {
        console.log('SlotBooking: Employee verified successfully:', verification.employeeName);
      }
    } catch (error) {
      console.error('SlotBooking: Error verifying employee:', error);
      setEmployeeVerified(false);
    }
  };

  const loadEmployeeQualifications = async () => {
    if (!user?.employeeId) return;
    
    try {
      const employee = await getEmployeeById(user.employeeId);
      setEmployeeQualifications(employee?.qualifications || null);
      setEmployeeJoinDate(employee?.joinDate || null);
      console.log('SlotBooking: Loaded employee join date:', employee?.joinDate);
    } catch (error) {
      console.error('SlotBooking: Error loading employee qualifications:', error);
    }
  };

  const calculatePayForSelectedDates = async () => {
    if (selectedDates.length === 0) {
      setCalculatedPay([]);
      return;
    }

    const payData = await Promise.all(
      selectedDates.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const amount = await calculateSlotPay(dateStr, employeeQualifications || undefined, employeeJoinDate || undefined);
        const breakdown = await getPayBreakdown(dateStr, employeeQualifications || undefined, employeeJoinDate || undefined);
        
        return {
          date: dateStr,
          amount,
          breakdown
        };
      })
    );

    setCalculatedPay(payData);
  };

  const calculateBookingHistoryPay = async () => {
    if (filteredBookings.length === 0) {
      setBookingPayData(new Map());
      return;
    }

    // Don't calculate if qualifications haven't been loaded yet
    if (!employeeQualifications || !employeeJoinDate) {
      console.log('SlotBooking: Skipping booking history pay calculation - qualifications not loaded yet');
      return;
    }

    const payMap = new Map<string, { amount: number; breakdown: { item: string; amount: number }[] }>();
    
    for (const booking of filteredBookings) {
      // Only calculate for approved bookings from Nov 2025+
      if (booking.status === 'approved' && isFromNovember2024(booking.date)) {
        try {
          const amount = await calculateSlotPay(
            booking.date,
            employeeQualifications || undefined,
            employeeJoinDate || undefined
          );
          const breakdown = await getPayBreakdown(
            booking.date,
            employeeQualifications || undefined,
            employeeJoinDate || undefined
          );
          payMap.set(booking.id, { amount, breakdown });
        } catch (error) {
          console.error('SlotBooking: Error calculating pay for booking:', booking.id, error);
        }
      }
    }
    
    setBookingPayData(payMap);
  };

  const loadEmployeeBookings = async () => {
    if (!user?.employeeId) return;
    
    try {
      console.log('SlotBooking: Loading employee bookings for:', user.employeeId);
      const bookings = await getEmployeeSlotBookings(user.employeeId);
      setEmployeeBookings(bookings);
      
      const employeeDates = new Set<string>(
        bookings
          .filter(booking => booking.status !== 'cancelled')
          .map(booking => booking.date)
      );
      setEmployeeBookingDates(employeeDates);
      
      console.log('SlotBooking: Employee bookings loaded:', bookings.length);
      console.log('SlotBooking: Employee booking dates:', employeeDates.size);
    } catch (error) {
      console.error('SlotBooking: Error loading employee bookings:', error);
      toast.error('Failed to load your booking history');
    }
  };

  const loadApprovedBookingDates = async () => {
    if (!selectedBranch) return;
    
    try {
      setIsBranchDataLoading(true);
      console.log('SlotBooking: Loading approved bookings for branch:', selectedBranch);
      const branchBookings = await getBranchSlotBookings(selectedBranch);
      
      const approvedDates = new Set<string>(
        branchBookings
          .filter(booking => booking.status === 'approved')
          .map(booking => booking.date)
      );
      
      setApprovedBookingDates(approvedDates);
      console.log('SlotBooking: Approved booking dates loaded for branch', selectedBranch, ':', approvedDates.size);
    } catch (error) {
      console.error('SlotBooking: Error loading approved booking dates:', error);
      toast.error('Failed to load branch booking data');
    } finally {
      setIsBranchDataLoading(false);
    }
  };

  const calculateApprovedBookings = async () => {
    const currentMonth = new Date();
    const approvedThisMonth = employeeBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return booking.status === 'approved' &&
             bookingDate.getMonth() === currentMonth.getMonth() && 
             bookingDate.getFullYear() === currentMonth.getFullYear();
    });
    
    setApprovedBookingsCount(approvedThisMonth.length);
    console.log('SlotBooking: Approved bookings this month:', approvedThisMonth.length);
    
    // Calculate total earnings for Nov 2025+ approved bookings
    let totalEarnings = 0;
    for (const booking of approvedThisMonth) {
      if (isFromNovember2024(booking.date)) {
        try {
          const amount = await calculateSlotPay(
            booking.date,
            employeeQualifications || undefined,
            employeeJoinDate || undefined
          );
          totalEarnings += amount;
        } catch (error) {
          console.error('Error calculating pay for booking:', booking.id, error);
        }
      }
    }
    setTotalEstimatedEarnings(totalEarnings);
  };

  const filterBookingsByMonth = () => {
    if (!selectedMonth) {
      setFilteredBookings(employeeBookings);
      return;
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    const filtered = employeeBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate.getFullYear() === year && bookingDate.getMonth() === month - 1;
    });
    
    setFilteredBookings(filtered);
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    
    return options;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    const dateString = format(date, 'yyyy-MM-dd');
    if (employeeBookingDates.has(dateString)) return true;
    
    // Check if branch has 0 slots available for this day
    const dayName =formatDate( date).toLowerCase() as keyof WeeklySlotConfig;
    const branchConfig = weeklySlotConfig[selectedBranch];
    const totalSlots = branchConfig ? branchConfig[dayName] : 0;
    
    if (totalSlots === 0) return true;
    
    return false;
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    if (!user?.employeeId) {
      toast.error('Employee ID not found. Please contact administrator.');
      return;
    }
    
    if (employeeVerified === false) {
      toast.error('Your employee record was not found. Please contact administrator before booking slots.');
      return;
    }
    
    if (isDateDisabled(date)) {
      const dateString = format(date, 'yyyy-MM-dd');
      if (employeeBookingDates.has(dateString)) {
        // Find existing booking to show more details
        const existingBooking = employeeBookings.find(b => b.date === dateString);
        const branchName = existingBooking?.branchName || 'unknown branch';
        const status = existingBooking?.status || 'unknown status';
        toast.error(`You already have a ${status} booking for ${formatDate(date)} at ${branchName}. Contact admin if you need to modify this booking.`);
      } else {
        toast.error("This date is not available for booking");
      }
      return;
    }

    const dateString = format(date, 'yyyy-MM-dd');
    
    // Allow date selection for all employees, but show warning for non-casual employees
    if (userDetails?.type !== 'Casual') {
      console.log('SlotBooking: Non-casual employee selecting date. UserDetails:', userDetails);
      // Still allow selection but they won't be able to book
    }
    
    // Enhanced existing booking check with detailed feedback
    try {
      const hasExistingBooking = await checkForExistingBooking(user.employeeId, dateString);
      if (hasExistingBooking) {
        // Get existing booking details for better error message
        const existingBooking = employeeBookings.find(b => b.date === dateString);
        if (existingBooking) {
          toast.error(`You already have a ${existingBooking.status} booking for ${formatDate(date)} at ${existingBooking.branchName}. Contact admin if you need to modify this booking.`);
        } else {
          toast.error("You already have a booking on this date. Double bookings are not allowed.");
        }
        return;
      }
    } catch (error) {
      console.error('SlotBooking: Error checking existing booking:', error);
      toast.error("Error checking booking availability");
      return;
    }
    
    // Enhanced slot availability check with weekend-specific logic
    try {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayName =formatDate( date);
      
      const availableSlots = await getAvailableSlotsForDate(dateString, selectedBranch);
      
      // Get total slots for this day to provide better feedback
      const branchConfig = weeklySlotConfig[selectedBranch];
      const totalSlots = branchConfig ? branchConfig[dayName.toLowerCase() as keyof WeeklySlotConfig] : 0;
      
      if (availableSlots <= 0) {
        if (totalSlots === 0) {
          if (isWeekend) {
            toast.error(`${currentBranch?.name} doesn't operate on ${dayName}s. Try Balmoral, Kembangan, Yishun, or Jurong West for weekend bookings.`);
          } else {
            toast.error(`${currentBranch?.name} doesn't operate on ${dayName}s. Please select a different day.`);
          }
        } else {
          toast.error(`All ${totalSlots} slots are booked for ${currentBranch?.name} on ${formatDate(date)}. Please select a different date.`);
        }
        return;
      }
      
      // Show available slots info for confirmation
      if (availableSlots === 1) {
        toast.info(`⚠️ Only 1 slot remaining for ${currentBranch?.name} on ${formatDate(date)}`);
      } else if (availableSlots <= 3) {
        toast.info(`${availableSlots} slots available for ${currentBranch?.name} on ${formatDate(date)}`);
      }
      
    } catch (error) {
      console.error('SlotBooking: Error checking available slots:', error);
      toast.error('Error checking slot availability. Please try again.');
      return;
    }

    setSelectedDates(prevDates => {
      const existingIndex = prevDates.findIndex(d => format(d, 'yyyy-MM-dd') === dateString);
      
      if (existingIndex > -1) {
        return prevDates.filter((_, index) => index !== existingIndex);
      } else {
        return [...prevDates, date];
      }
    });
  };

  const handleBranchChange = async (branchId: string) => {
    console.log('SlotBooking: Branch change requested from', selectedBranch, 'to', branchId);
    
    setSelectedDates([]);
    setApprovedBookingDates(new Set());
    
    setSelectedBranch(branchId);
    
    toast.info(`Loading ${branches.find(b => b.id === branchId)?.name} booking data...`);
  };

  const handleRemoveDate = (index: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllDates = () => {
    setSelectedDates([]);
  };

  const handleBookSlots = async () => {
    if (selectedDates.length === 0 || !currentBranch || !user) {
      toast.error("Please select at least one date and ensure you're logged in");
      return;
    }

    if (!user.employeeId) {
      toast.error('Employee ID not found. Please contact administrator.');
      return;
    }

    if (employeeVerified === false) {
      toast.error('Your employee record was not found. Please contact administrator before booking slots.');
      return;
    }

    setIsBooking(true);
    const successful = [];
    const failed = [];
    
    try {
      console.log('SlotBooking: Starting booking process for', selectedDates.length, 'dates');
      
      // Process bookings one by one to provide detailed feedback
      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        try {
          console.log('SlotBooking: Booking slot for date:', dateStr);
          
          const bookingId = await addSlotBooking({
            employeeId: user.employeeId,
            employeeName: userDetails?.display_name || userDetails?.name || user.name,
            branchId: selectedBranch,
            branchName: currentBranch.name,
            date: dateStr,
            status: 'pending'
          });
          
          successful.push({ date: dateStr, bookingId });
          console.log('SlotBooking: Successfully booked:', { date: dateStr, bookingId });
          
        } catch (bookingError) {
          console.error('SlotBooking: Failed to book date', dateStr, ':', bookingError);
          failed.push({ 
            date: dateStr, 
            error: bookingError instanceof Error ? bookingError.message : 'Unknown error'
          });
        }
      }
      
      // Provide detailed feedback
      if (successful.length > 0) {
        toast.success(`✅ Successfully booked ${successful.length} slot${successful.length > 1 ? 's' : ''} at ${currentBranch.name}`);
      }
      
      if (failed.length > 0) {
        failed.forEach(failure => {
          toast.error(`❌ Failed to book ${formatMonthShort(new Date(failure.date))}: ${failure.error}`);
        });
        
        // If some bookings failed, suggest contacting admin
        if (failed.length === selectedDates.length) {
          toast.error('All bookings failed. Please contact administrator if this issue persists.');
        } else {
          toast.warning(`${failed.length} booking${failed.length > 1 ? 's' : ''} failed. Contact admin if needed.`);
        }
      }
      
      setSelectedDates([]);
      await Promise.all([
        loadEmployeeBookings(),
        loadApprovedBookingDates()
      ]);
      
    } catch (error) {
      console.error('SlotBooking: Unexpected error during booking process:', error);
      toast.error('An unexpected error occurred. Please try again or contact administrator.');
    } finally {
      setIsBooking(false);
    }
  };

  const getBranchColorStyle = (color: string) => {
    return color || '#3b82f6';
  };

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className={`space-y-6 ${isMobile ? 'space-y-4' : ''}`}>
        <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Slot Booking</h2>
            {user?.role === 'employee' && employeeVerified === false && (
              <div className="flex items-center space-x-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Employee record not found. Contact administrator.
                </p>
              </div>
            )}
            {!user?.employeeId && (
              <div className="flex items-center space-x-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Employee ID not found. Please contact administrator.
                </p>
              </div>
            )}
          </div>
          
        </div>

            {/* Stats Card */}
            <Card>
              <CardContent className={isMobile ? 'p-4' : 'p-6'}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>My Approved Bookings</p>
                    <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{approvedBookingsCount}</p>
                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>This month</p>
                    
                    {/* Total Estimated Earnings - only show for Nov 2025+ */}
                    {totalEstimatedEarnings > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Estimated Earnings</p>
                        <p className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                          S${totalEstimatedEarnings.toFixed(2)}
                        </p>
                        <p className={`text-amber-600 italic ${isMobile ? 'text-xs' : 'text-xs'}`}>
                          *subjected to attendance
                        </p>
                      </div>
                    )}
                  </div>
                  <CheckCircle className={`text-green-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                </div>
              </CardContent>
            </Card>

        {/* Show restriction message for full-time employees */}
        {user?.role === 'employee' && userDetails && userDetails.type !== 'Casual' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Slot Booking Unavailable</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Slot booking is only available for casual employees. Full-time employees do not need to book slots.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs - Only show for casual employees and admins */}
        {(user?.role !== 'employee' || userDetails?.type === 'Casual' || userDetails === null || canManageSlotBooking) && (
          <Tabs defaultValue="booking" className="w-full">
            <TabsList className={`grid w-full ${canManageSlotBooking ? 'grid-cols-3' : 'grid-cols-2'} ${isMobile ? 'h-12' : ''}`}>
              <TabsTrigger value="booking" className={isMobile ? 'text-sm' : ''}>Select Date & Branch</TabsTrigger>
              <TabsTrigger value="history" className={isMobile ? 'text-sm' : ''}>Booking History</TabsTrigger>
              {canManageSlotBooking && (
                <TabsTrigger value="manage" className={isMobile ? 'text-sm' : ''}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Bookings
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="booking" className="mt-6">
            {/* Single Column Layout */}
            <div className="space-y-6">
              <EnhancedBranchSelector
                branches={branches}
                selectedBranch={selectedBranch}
                onBranchChange={handleBranchChange}
                currentBranch={currentBranch}
                isLoading={isBranchDataLoading}
              />
              
              <EnhancedCalendar
                selectedDates={selectedDates}
                onDateSelect={handleDateSelect}
                onDatesChange={setSelectedDates}
                isDateDisabled={isDateDisabled}
                approvedBookingDates={approvedBookingDates}
                employeeBookingDates={employeeBookingDates}
                branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                isLoading={isBranchDataLoading}
                currentBranch={currentBranch}
                weeklySlotConfig={weeklySlotConfig}
              />
              
              <SelectedDatesManager
                selectedDates={selectedDates}
                onRemoveDate={handleRemoveDate}
                onClearAll={handleClearAllDates}
                branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                branchName={currentBranch?.name || ''}
                calculatedPay={calculatedPay}
              />
              
              <BookingActions
                selectedDates={selectedDates}
                branchName={currentBranch?.name || ''}
                branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                isBooking={isBooking}
                employeeVerified={employeeVerified}
                onBookSlots={handleBookSlots}
              />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-4' : ''}`}>
                  <CardTitle className={isMobile ? 'text-lg' : ''}>Booking History</CardTitle>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'w-full' : ''}`}>
                    <label htmlFor="month-filter" className={`font-medium text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      Filter by Month:
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className={isMobile ? 'flex-1' : 'w-40'}>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBookings.length > 0 ? (
                  <div className="space-y-3">
                    {filteredBookings.map((booking) => {
                      const bookingBranch = branches.find(b => b.id === booking.branchId);
                      const branchColor = getBranchColorStyle(bookingBranch?.color || '#6b7280');
                      const payData = bookingPayData.get(booking.id);
                      
                      return (
                        <div 
                          key={booking.id} 
                          className={`flex items-center justify-between rounded-lg ${isMobile ? 'p-3' : 'p-3'}`} 
                          style={{ 
                            backgroundColor: `${branchColor}10`,
                            border: `1px solid ${branchColor}30`
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: branchColor }}
                            ></div>
                            <div>
                              <p className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>{booking.branchName}</p>
                              <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>{formatDate(new Date(booking.date))}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Pay Badge - only for approved bookings with dynamic pricing */}
                            {booking.status === 'approved' && payData && (
                              <Badge 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer transition-colors"
                                onClick={() => setSelectedPayBreakdown({
                                  bookingId: booking.id,
                                  branchName: booking.branchName,
                                  date: booking.date,
                                  amount: payData.amount,
                                  breakdown: payData.breakdown
                                })}
                              >
                                <DollarSign className="w-3 h-3 mr-1" />
                                S${payData.amount.toFixed(2)}
                              </Badge>
                            )}
                            <Badge 
                              variant={
                                booking.status === 'approved' ? 'default' :
                                booking.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                              className={isMobile ? 'text-xs' : 'text-xs'}
                              style={booking.status === 'approved' ? { 
                                backgroundColor: branchColor,
                                color: 'white'
                              } : {}}
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center text-gray-500 ${isMobile ? 'py-6' : 'py-8'}`}>
                    <p className={isMobile ? 'text-sm' : ''}>No bookings found for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Management Tab - Senior Partners and Superadmins only */}
          {canManageSlotBooking && (
            <TabsContent value="manage" className="mt-6">
              <SlotBookingManagementContent />
            </TabsContent>
          )}
          </Tabs>
        )}
      </div>

      {/* Pay Breakdown Dialog */}
      <Dialog open={!!selectedPayBreakdown} onOpenChange={(open) => !open && setSelectedPayBreakdown(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Breakdown</DialogTitle>
            <DialogDescription>
              {selectedPayBreakdown && (
                <>
                  {selectedPayBreakdown.branchName} - {formatDate(new Date(selectedPayBreakdown.date))}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPayBreakdown && (
            <div className="space-y-3">
              {selectedPayBreakdown.breakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.item}</span>
                  <span className="font-medium">S${item.amount.toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="text-green-600">S${selectedPayBreakdown.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </ResponsiveLayout>
  );
};

export default SlotBooking;
