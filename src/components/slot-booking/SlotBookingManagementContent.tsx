import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon, Settings, Check, X, Edit, Filter, UserCheck, UserX, Plus, Users, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees, getEmployeeById } from '@/services/employeeService';
import { EmployeeProfile, EmployeeQualifications } from '@/types/employee';
import SwapEmployeeDialog from '@/components/slot-booking/SwapEmployeeDialog';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import { BookingCardWithPay } from '@/components/slot-booking/BookingCardWithPay';
import AdminSlotBookingActions from '@/components/admin/AdminSlotBookingActions';
import AdminSlotBookingSummary from '@/components/admin/AdminSlotBookingSummary';
import PricingSettingsTab from '@/components/slot-booking/PricingSettingsTab';
import { SlotTimingSettingsTab } from '@/components/slot-booking/SlotTimingSettingsTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { isFromNovember2024, clearPricingCache } from '@/utils/slotPayCalculation';
import { updatePricingConfig, SlotPricingConfig, SlotTimingConfig } from '@/services/slotPricingService';
import {
import { formatDate } from '@/utils/dateFormat';
  getBranches,
  getAllSlotBookings,
  updateSlotBookingStatus,
  getWeeklySlotConfig,
  updateWeeklySlotConfig,
  cancelSlotBooking,
  updateSlotBookingEmployee,
  getEmployeeAttendanceStatus,
  checkForExistingBooking,
  createEmergencyBooking,
  type SlotBooking,
  type Branch,
  type WeeklySlotConfig,
  type EmployeeAttendanceStatus,
  updateSlotBookingBranch
} from '@/services/slotBookingService';
import { convertTailwindColorToHex } from '@/utils/colorUtils';

const SlotBookingManagementContent = () => {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isBulkBookingDialogOpen, setIsBulkBookingDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<SlotBooking | null>(null);
  const [selectedBookingForSwap, setSelectedBookingForSwap] = useState<SlotBooking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<SlotBooking | null>(null);
  const [casualEmployees, setCasualEmployees] = useState<EmployeeProfile[]>([]);
  const [allBookings, setAllBookings] = useState<SlotBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentWeeklySlots, setCurrentWeeklySlots] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Map<string, EmployeeAttendanceStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [editingWeeklySlots, setEditingWeeklySlots] = useState<{ [branchId: string]: Partial<WeeklySlotConfig> }>({});
  const [swapEmployeeId, setSwapEmployeeId] = useState('');
  const [isSwappingInDialog, setIsSwappingInDialog] = useState(false);
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState('');
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);
  const [isPendingApprovalsDialogOpen, setIsPendingApprovalsDialogOpen] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<Partial<SlotPricingConfig> | null>(null);
  const [employeeQualificationsCache, setEmployeeQualificationsCache] = useState<Map<string, EmployeeQualifications | null>>(new Map());

  useEffect(() => {
    if (!autoRefreshActive) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setAutoRefreshActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Loading timeout')), 10000);
        });
        
        const dataPromise = Promise.all([
          getBranches(),
          getAllSlotBookings(),
          getWeeklySlotConfig(),
          getCasualEmployees()
        ]);

        const [branchesData, bookingsData, weeklyConfigData, employeesData] = await Promise.race([
          dataPromise,
          timeoutPromise
        ]);

        if (branchesData && branchesData.length > 0) {
          setBranches(branchesData);
        }
        
        if (bookingsData) {
          setAllBookings(bookingsData);
        }
        
        if (weeklyConfigData && Object.keys(weeklyConfigData).length > 0) {
          setCurrentWeeklySlots(weeklyConfigData);
        }
        
        if (employeesData) {
          setCasualEmployees(employeesData);
        }

        if (bookingsData && bookingsData.length > 0) {
          await loadAttendanceData(bookingsData);
        }
      } catch (error) {
        console.error('SlotBookingManagement: Error loading initial data:', error);
        toast.error('Failed to load slot booking data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (isSettingsDialogOpen) {
      setEditingWeeklySlots(currentWeeklySlots);
    }
  }, [isSettingsDialogOpen, currentWeeklySlots]);

  const loadAttendanceData = async (bookings: SlotBooking[]) => {
    try {
      const uniqueEmployeeIds = [...new Set(bookings.map(b => b.employeeId))];
      const uniqueDates = [...new Set(bookings.map(b => b.date))];

      if (uniqueEmployeeIds.length > 0 && uniqueDates.length > 0) {
        const attendanceData = await getEmployeeAttendanceStatus(uniqueEmployeeIds, uniqueDates);
        
        const statusMap = new Map<string, EmployeeAttendanceStatus>();
        attendanceData.forEach(status => {
          const key = `${status.employeeId}-${status.date}`;
          statusMap.set(key, status);
        });
        
        setAttendanceStatusMap(statusMap);
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error loading attendance data:', error);
    }
  };

  const refreshData = async () => {
    try {
      const [bookingsData, weeklyConfigData] = await Promise.all([
        getAllSlotBookings(),
        getWeeklySlotConfig()
      ]);
      
      if (bookingsData) {
        setAllBookings(bookingsData);
      }
      
      if (weeklyConfigData && Object.keys(weeklyConfigData).length > 0) {
        setCurrentWeeklySlots(weeklyConfigData);
      }
      
      if (bookingsData && bookingsData.length > 0) {
        await loadAttendanceData(bookingsData);
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error refreshing data:', error);
    }
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(b => 
      b.date === dateString && 
      b.status !== 'rejected' && 
      b.status !== 'cancelled' &&
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const hasEmployeeClockedIn = (employeeId: string, date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = `${employeeId}-${dateString}`;
    const attendanceStatus = attendanceStatusMap.get(key);
    return attendanceStatusMap.has(key) && attendanceStatus?.hasClockedIn === true;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsBulkBookingDialogOpen(true);
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setSwapEmployeeId('');
    setSelectedBranchForUpdate(booking.branchId);
    setIsApprovalDialogOpen(true);
  };

  const handleSwapClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForSwap(booking);
    setIsSwapDialogOpen(true);
  };

  const handleCancelClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForCancel(booking);
    setIsCancelDialogOpen(true);
  };

  const handleSwapSuccess = async () => {
    await refreshData();
  };

  const handleBulkBookingSuccess = async () => {
    await refreshData();
  };

  const handleApproval = async (bookingId: string, status: 'approved' | 'rejected', approvedBy?: string) => {
    try {
      const success = await updateSlotBookingStatus(bookingId, status, approvedBy || 'Admin');
      if (success) {
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        toast.success(`Booking ${status}`);
      } else {
        toast.error("Failed to update booking status");
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error updating booking status:', error);
      toast.error("Failed to update booking status");
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    
    try {
      const success = await cancelSlotBooking(selectedBookingForCancel.id, 'Admin');
      if (success) {
        await refreshData();
        setIsCancelDialogOpen(false);
        setSelectedBookingForCancel(null);
        toast.success('Booking cancelled successfully');
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleCancelBookingFromApprovalDialog = async () => {
    if (!selectedBookingForApproval) return;
    
    try {
      const success = await cancelSlotBooking(selectedBookingForApproval.id, 'Admin');
      if (success) {
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        toast.success('Booking cancelled successfully');
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleSwapInDialog = async () => {
    if (!selectedBookingForApproval || !swapEmployeeId) return;
    
    const selectedEmployee = casualEmployees.find(emp => emp.id === swapEmployeeId);
    if (!selectedEmployee) return;

    try {
      setIsSwappingInDialog(true);
      const success = await updateSlotBookingEmployee(
        selectedBookingForApproval.id,
        swapEmployeeId,
        selectedEmployee.display_name || selectedEmployee.name,
        `Swapped from ${selectedBookingForApproval.employeeName} to ${selectedEmployee.display_name || selectedEmployee.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully swapped employee to ${selectedEmployee.display_name || selectedEmployee.name}`);
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSwapEmployeeId('');
      } else {
        toast.error('Failed to swap employee');
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error swapping employee:', error);
      toast.error('Failed to swap employee');
    } finally {
      setIsSwappingInDialog(false);
    }
  };

  const handleBranchUpdate = async () => {
    if (!selectedBookingForApproval || !selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval.branchId) {
      return;
    }

    const targetBranch = branches.find(b => b.id === selectedBranchForUpdate);
    if (!targetBranch) {
      toast.error('Selected branch not found');
      return;
    }

    try {
      setIsUpdatingBranch(true);
      
      const bookingDate = selectedBookingForApproval.date;
      const dayOfWeek =formatDate( new Date(bookingDate)).toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      const totalSlots = currentWeeklySlots[selectedBranchForUpdate]?.[dayOfWeek] || 0;
      const existingBookings = allBookings.filter(b => 
        b.date === bookingDate && 
        b.branchId === selectedBranchForUpdate && 
        b.status !== 'cancelled' && 
        b.status !== 'rejected' &&
        b.id !== selectedBookingForApproval.id
      );

      if (existingBookings.length >= totalSlots) {
        toast.error(`Target branch "${targetBranch.name}" is at full capacity for ${formatDate(new Date(bookingDate))}`);
        return;
      }

      const success = await updateSlotBookingBranch(
        selectedBookingForApproval.id,
        selectedBranchForUpdate,
        targetBranch.name,
        `Branch changed from ${selectedBookingForApproval.branchName} to ${targetBranch.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully moved booking to ${targetBranch.name}`);
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSelectedBranchForUpdate('');
      } else {
        toast.error('Failed to update branch');
      }
    } catch (error) {
      console.error('SlotBookingManagement: Error updating branch:', error);
      toast.error('Failed to update branch');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const getEmployeeQualifications = async (employeeId: string): Promise<EmployeeQualifications | null> => {
    if (employeeQualificationsCache.has(employeeId)) {
      return employeeQualificationsCache.get(employeeId) || null;
    }

    try {
      const employee = await getEmployeeById(employeeId);
      const qualifications = employee?.qualifications || null;
      setEmployeeQualificationsCache(prev => new Map(prev).set(employeeId, qualifications));
      return qualifications;
    } catch (error) {
      console.error('SlotBookingManagement: Error fetching employee qualifications:', error);
      setEmployeeQualificationsCache(prev => new Map(prev).set(employeeId, null));
      return null;
    }
  };

  const getSlotSummary = () => {
    const currentMonth = selectedDate;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let totalSlots = 0;
    let approvedSlots = 0;
    let pendingSlots = 0;

    daysInMonth.forEach(day => {
      const dayBookings = getBookingsForDate(day);
      const dayName = format(day, 'EEEE').toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      
      if (selectedBranch === 'all') {
        branches.forEach(branch => {
          const slotCount = Number(currentWeeklySlots[branch.id]?.[dayName] || 0);
          totalSlots += slotCount;
        });
      } else {
        const slotCount = Number(currentWeeklySlots[selectedBranch]?.[dayName] || 0);
        totalSlots += slotCount;
      }
      
      const activeBookings = dayBookings.filter(b => b.status !== 'cancelled');
      approvedSlots += activeBookings.filter(b => b.status === 'approved').length;
      pendingSlots += activeBookings.filter(b => b.status === 'pending').length;
    });

    const bookedSlots = approvedSlots + pendingSlots;
    const availableSlots = Math.max(0, totalSlots - bookedSlots);

    return { totalSlots, approvedSlots, pendingSlots, availableSlots };
  };

  const getPendingBookings = () => {
    return allBookings.filter(b => 
      b.status === 'pending' && 
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const getBranchUpdateButtonState = () => {
    const isSameBranch = !selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval?.branchId;
    return {
      disabled: isSameBranch,
      text: isSameBranch ? 'Select Different Branch' : 'Update Branch',
      variant: isSameBranch ? 'outline' as const : 'secondary' as const
    };
  };

  const summary = getSlotSummary();
  const pendingBookings = getPendingBookings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Slots</div>
            <div className="text-2xl font-bold">{summary.totalSlots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-2xl font-bold text-green-600">{summary.approvedSlots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-amber-600">{summary.pendingSlots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Available</div>
            <div className="text-2xl font-bold text-blue-600">{summary.availableSlots}</div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setIsBulkBookingDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Booking
        </Button>

        <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Pending Approvals */}
      {pendingBookings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Approvals ({pendingBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingBookings.slice(0, 10).map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{booking.employeeName}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span>{booking.branchName}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span>{formatDate(new Date(booking.date))}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleApproval(booking.id, 'rejected')}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleApproval(booking.id, 'approved')}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="w-full">
        <CardHeader>
          <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
            <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-lg' : ''}`}>
              <CalendarIcon className="w-5 h-5" />
              <span>Monthly Calendar</span>
            </CardTitle>
            <div className={`flex items-center space-x-2 ${isMobile ? 'w-full' : ''}`}>
              <Filter className="w-4 h-4" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className={isMobile ? 'flex-1' : 'w-48'}>
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: convertTailwindColorToHex(branch.color || '#6b7280') }}
                        ></div>
                        <span>{branch.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-2 pb-3 w-full overflow-hidden">
          <div className="w-full max-w-full">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full max-w-full border-0 p-0"
              classNames={{
                months: "flex flex-col w-full max-w-full",
                month: "space-y-1 w-full max-w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: isMobile ? "text-sm font-medium" : "text-base font-medium",
                nav: "space-x-1 flex items-center",
                table: "w-full max-w-full border-collapse",
                head_row: "flex w-full",
                head_cell: `text-muted-foreground font-normal flex-1 min-w-0 text-center ${isMobile ? 'text-[10px] py-1' : 'text-xs py-1'}`,
                row: "flex w-full",
                cell: `text-center relative flex-1 min-w-0 focus-within:relative focus-within:z-20 p-0`,
                day: `w-full h-full font-normal aria-selected:opacity-100 hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden p-0.5`,
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-semibold",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              components={{
                Day: ({ date, ...props }) => {
                  const dayBookings = getBookingsForDate(date);
                  const hasBookings = dayBookings.length > 0;
                  const maxVisible = isMobile ? 3 : 4;
                  
                  return (
                    <div className="relative w-full overflow-hidden border-r border-b border-border last:border-r-0" style={{ minHeight: isMobile ? '3.5rem' : '4.5rem' }}>
                      <div
                        className={`w-full h-full hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden ${
                          isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                        } ${hasBookings ? 'bg-blue-50' : ''} p-0.5`}
                        onClick={() => handleDateClick(date)}
                      >
                        <div className="w-full h-full flex flex-col overflow-hidden">
                          <span className={`font-medium text-left flex-shrink-0 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{date.getDate()}</span>
                          {hasBookings && (
                            <div className="flex flex-col gap-px w-full flex-1 overflow-hidden">
                              {dayBookings.slice(0, maxVisible).map((booking, idx) => {
                                const branch = branches.find(b => b.id === booking.branchId);
                                const hasClockedIn = hasEmployeeClockedIn(booking.employeeId, date);
                                
                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprovalClick(booking, e);
                                    }}
                                    className={`px-0.5 rounded text-white truncate hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 ${isMobile ? 'text-[8px] leading-[1.2]' : 'text-[10px] leading-tight'}`}
                                     style={{ 
                                       backgroundColor: convertTailwindColorToHex(branch?.color || '#6b7280'),
                                       ...(booking.status === 'pending' && { border: '1px solid #fbbf24' }),
                                       ...(booking.status === 'approved' && { border: '1px solid #10b981' })
                                     }}
                                     title={`${booking.employeeName} - ${branch?.name} (${booking.status})${hasClockedIn ? ' - Clocked In' : ''} - Click to manage booking`}
                                   >
                                     <span className="truncate">
                                       {isMobile ? 
                                         booking.employeeName.slice(0, 8) : 
                                         booking.employeeName.slice(0, 12)
                                       }
                                       {booking.status === 'pending' && ' ⏳'}
                                       {booking.status === 'approved' && !hasClockedIn && ' ✅'}
                                       {booking.status === 'approved' && hasClockedIn && ' ✅✅'}
                                     </span>
                                  </div>
                                );
                              })}
                              {dayBookings.length > maxVisible && (
                                <span className={`text-muted-foreground flex-shrink-0 ${isMobile ? 'text-[7px]' : 'text-[9px]'}`}>+{dayBookings.length - maxVisible}</span>
                              )}
                            </div>
                          )}
                          {!hasBookings && (
                            <div className="flex items-center justify-center flex-1">
                              <Plus className="w-3 h-3 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className={isMobile ? 'text-lg' : ''}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
          <CardDescription>
            {getBookingsForDate(selectedDate).length} booking(s) scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="space-y-3">
              {getBookingsForDate(selectedDate).map((booking) => {
                const branch = branches.find(b => b.id === booking.branchId);
                const hasClockedIn = hasEmployeeClockedIn(booking.employeeId, selectedDate);
                const showPay = isFromNovember2024(booking.date);
                
                return (
                  <BookingCardWithPay
                    key={booking.id}
                    booking={booking}
                    branch={branch}
                    hasClockedIn={hasClockedIn}
                    showPay={showPay}
                    isMobile={isMobile}
                    getEmployeeQualifications={getEmployeeQualifications}
                    handleApproval={handleApproval}
                    handleSwapClick={handleSwapClick}
                    handleCancelClick={handleCancelClick}
                    handleApprovalClick={handleApprovalClick}
                  />
                );
              })}

              {getBookingsForDate(selectedDate).length === 0 && (
                <p className={`text-gray-500 text-center ${isMobile ? 'py-3 text-sm' : 'py-4 text-sm'}`}>
                  No bookings for this date. Click on a date to add bulk bookings.
                </p>
              )}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SwapEmployeeDialog
        isOpen={isSwapDialogOpen}
        onClose={() => setIsSwapDialogOpen(false)}
        booking={selectedBookingForSwap}
        onSuccess={handleSwapSuccess}
      />

      <BulkSlotBookingDialog
        isOpen={isBulkBookingDialogOpen}
        onClose={() => setIsBulkBookingDialogOpen(false)}
        selectedDate={selectedDate}
        onSuccess={handleBulkBookingSuccess}
      />

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
        setIsCancelDialogOpen(open);
        if (!open) setSelectedBookingForCancel(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              {selectedBookingForCancel && 
                `Are you sure you want to cancel this booking for ${selectedBookingForCancel.employeeName}?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <p><strong>Employee:</strong> {selectedBookingForCancel?.employeeName}</p>
              <p><strong>Branch:</strong> {selectedBookingForCancel?.branchName}</p>
              <p><strong>Date:</strong> {selectedBookingForCancel && formatDate(new Date(selectedBookingForCancel.date))}</p>
              <p><strong>Current Status:</strong> <Badge variant="secondary">{selectedBookingForCancel?.status}</Badge></p>
            </div>
            <p className="text-sm text-red-600 mt-3">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsCancelDialogOpen(false);
              setSelectedBookingForCancel(null);
            }}>
              Keep Booking
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancelBooking}
            >
              <UserX className="w-4 h-4 mr-2" />
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog with Branch Edit and Swap functionality */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={(open) => {
        setIsApprovalDialogOpen(open);
        if (!open) {
          setSelectedBookingForApproval(null);
          setSwapEmployeeId('');
          setSelectedBranchForUpdate('');
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Manage Booking</span>
            </DialogTitle>
            <DialogDescription>
              {selectedBookingForApproval && 
                `Review booking for ${selectedBookingForApproval.employeeName} on ${formatDate(new Date(selectedBookingForApproval.date))}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Employee:</span>
                <span>{selectedBookingForApproval?.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Current Branch:</span>
                <span>{selectedBookingForApproval?.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{selectedBookingForApproval && formatDate(new Date(selectedBookingForApproval.date))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant="secondary">{selectedBookingForApproval?.status}</Badge>
              </div>
              {selectedBookingForApproval && hasEmployeeClockedIn(selectedBookingForApproval.employeeId, new Date(selectedBookingForApproval.date)) && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Clock-in Status:</span>
                  <span className="text-green-600 text-sm">✅ Clocked In</span>
                </div>
              )}
            </div>

            {/* Branch Selection Section */}
            <div className="border-t pt-4 space-y-3">
              <Label htmlFor="branch-select" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Change Branch
              </Label>
              <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch to move booking" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem 
                      key={branch.id} 
                      value={branch.id}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: convertTailwindColorToHex(branch.color || '#6b7280') }}
                        ></div>
                        <span>{branch.name}</span>
                        {branch.id === selectedBookingForApproval?.branchId && (
                          <span className="text-gray-500 text-xs">(Current)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval?.branchId ? (
                <p className="text-xs text-gray-500">Select a different branch to enable the update button</p>
              ) : (
                <p className="text-xs text-blue-600">Ready to move booking to selected branch</p>
              )}
            </div>

            {/* Swap Employee Section */}
            <div className="border-t pt-4 space-y-3">
              <Label htmlFor="swap-employee" className="text-sm font-medium">Swap Employee (Optional)</Label>
              <Select value={swapEmployeeId} onValueChange={setSwapEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new employee to swap" />
                </SelectTrigger>
                <SelectContent>
                  {casualEmployees
                    .filter(emp => emp.id !== selectedBookingForApproval?.employeeId)
                    .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.display_name || employee.name} ({employee.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <div className="flex flex-wrap gap-2 justify-start">
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={handleCancelBookingFromApprovalDialog}
              >
                <UserX className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              {selectedBookingForApproval?.status === 'pending' && (
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'rejected', 'Admin')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              )}
              {swapEmployeeId && (
                <Button 
                  type="button" 
                  variant="secondary"
                  size="sm"
                  onClick={handleSwapInDialog}
                  disabled={isSwappingInDialog}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isSwappingInDialog ? 'Swapping...' : 'Swap'}
                </Button>
              )}
              <Button 
                type="button" 
                variant={getBranchUpdateButtonState().variant}
                size="sm"
                onClick={handleBranchUpdate}
                disabled={getBranchUpdateButtonState().disabled || isUpdatingBranch}
              >
                <MapPin className="w-4 h-4 mr-1" />
                {isUpdatingBranch ? 'Updating...' : getBranchUpdateButtonState().text}
              </Button>
              {selectedBookingForApproval?.status === 'pending' && (
                <Button 
                  type="button"
                  size="sm"
                  onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'approved', 'Admin')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Slot Booking Settings</DialogTitle>
            <DialogDescription>Configure slot availability and pricing</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="slots" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="slots">Weekly Slots</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
            </TabsList>
            <TabsContent value="slots" className="space-y-4">
              {branches.map(branch => (
                <Card key={branch.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <div key={day} className="text-center">
                          <Label className="text-xs capitalize">{day.slice(0, 3)}</Label>
                          <Input
                            type="number"
                            min="0"
                            className="text-center mt-1"
                            value={editingWeeklySlots[branch.id]?.[day as keyof WeeklySlotConfig] ?? currentWeeklySlots[branch.id]?.[day as keyof WeeklySlotConfig] ?? 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setEditingWeeklySlots(prev => ({
                                ...prev,
                                [branch.id]: {
                                  ...prev[branch.id],
                                  [day]: value
                                }
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button 
                className="w-full" 
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    for (const branch of branches) {
                      const edited = editingWeeklySlots[branch.id] || {};
                      await updateWeeklySlotConfig(branch.id, {
                        monday: Number(edited.monday ?? currentWeeklySlots[branch.id]?.monday ?? 0),
                        tuesday: Number(edited.tuesday ?? currentWeeklySlots[branch.id]?.tuesday ?? 0),
                        wednesday: Number(edited.wednesday ?? currentWeeklySlots[branch.id]?.wednesday ?? 0),
                        thursday: Number(edited.thursday ?? currentWeeklySlots[branch.id]?.thursday ?? 0),
                        friday: Number(edited.friday ?? currentWeeklySlots[branch.id]?.friday ?? 0),
                        saturday: Number(edited.saturday ?? currentWeeklySlots[branch.id]?.saturday ?? 0),
                        sunday: Number(edited.sunday ?? currentWeeklySlots[branch.id]?.sunday ?? 0),
                      });
                    }
                    await refreshData();
                    toast.success('Settings saved successfully');
                    setIsSettingsDialogOpen(false);
                  } catch (error) {
                    toast.error('Failed to save settings');
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </TabsContent>
            <TabsContent value="pricing">
              <PricingSettingsTab />
            </TabsContent>
            <TabsContent value="timing">
              <SlotTimingSettingsTab />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SlotBookingManagementContent;
