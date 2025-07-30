import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Settings, Check, X, Edit, Filter, UserCheck, UserX, Plus, Users, MapPin, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import SwapEmployeeDialog from '@/components/slot-booking/SwapEmployeeDialog';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import AdminSlotBookingActions from '@/components/admin/AdminSlotBookingActions';
import AdminSlotBookingSummary from '@/components/admin/AdminSlotBookingSummary';
import { useIsMobile } from '@/hooks/use-mobile';
import {
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
import { supabase } from '@/integrations/supabase/client';

const AdminSlotBooking = () => {
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
  const [newSwapEmployee, setNewSwapEmployee] = useState('');
  const [swapNotes, setSwapNotes] = useState('');
  const [swapEmployeeId, setSwapEmployeeId] = useState('');
  const [isSwappingInDialog, setIsSwappingInDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState('');
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);
  const [isPendingApprovalsDialogOpen, setIsPendingApprovalsDialogOpen] = useState(false);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshActive) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshActive]);

  // Pause auto-refresh when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setAutoRefreshActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load initial data from Supabase with timeout
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log('AdminSlotBooking: Loading initial data from Supabase...');

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Loading timeout')), 10000);
        });

        const dataPromise = Promise.all([
          getBranches(),
          getAllSlotBookings(),
          getWeeklySlotConfig(),
          getCasualEmployees()
        ]);

        const [
          branchesData,
          bookingsData,
          weeklyConfigData,
          employeesData
        ] = await Promise.race([dataPromise, timeoutPromise]) as [
          Branch[],
          SlotBooking[],
          { [branchId: string]: WeeklySlotConfig },
          EmployeeProfile[]
        ];

        console.log('AdminSlotBooking: Loaded data successfully');

        setBranches(branchesData);
        setAllBookings(bookingsData);
        setCurrentWeeklySlots(weeklyConfigData);
        setCasualEmployees(employeesData);

        // Load attendance data for the current month
        await loadAttendanceData(bookingsData);
      } catch (error) {
        console.error('AdminSlotBooking: Error loading initial data:', error);
        toast.error('Failed to load slot booking data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadAttendanceData = async (bookings: SlotBooking[]) => {
    try {
      const currentMonth = selectedDate;
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const uniqueEmployeeIds = [...new Set(bookings.map(booking => booking.employeeId))];
      const dateStrings = daysInMonth.map(date => format(date, 'yyyy-MM-dd'));

      if (uniqueEmployeeIds.length > 0) {
        const attendanceData = await getEmployeeAttendanceStatus(uniqueEmployeeIds, dateStrings);

        const statusMap = new Map<string, EmployeeAttendanceStatus>();
        attendanceData.forEach(status => {
          const key = `${status.employeeId}-${status.date}`;
          statusMap.set(key, status);
        });

        setAttendanceStatusMap(statusMap);
        console.log('AdminSlotBooking: Loaded attendance data for', attendanceData.length, 'records');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error loading attendance data:', error);
    }
  };

  const refreshData = async () => {
    try {
      const [bookingsData, weeklyConfigData] = await Promise.all([
        getAllSlotBookings(),
        getWeeklySlotConfig()
      ]);
      setAllBookings(bookingsData);
      setCurrentWeeklySlots(weeklyConfigData);

      // Refresh attendance data
      await loadAttendanceData(bookingsData);

      console.log('AdminSlotBooking: Data refreshed successfully');
    } catch (error) {
      console.error('AdminSlotBooking: Error refreshing data:', error);
    }
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(booking => 
      booking.date === dateString && 
      (selectedBranch === 'all' || booking.branchId === selectedBranch)
    );
  };

  const hasEmployeeClockedIn = (employeeId: string, date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = `${employeeId}-${dateString}`;
    const status = attendanceStatusMap.get(key);
    return status?.hasClockedIn || false;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsBulkBookingDialogOpen(true);
    }
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setSwapEmployeeId(''); // Reset swap selection
    setSelectedBranchForUpdate(booking.branchId); // Set current branch as default
    setIsApprovalDialogOpen(true);
  };

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!selectedBookingForApproval) return;

    try {
      await updateSlotBookingStatus(selectedBookingForApproval.id, status, 'admin');
      toast.success(`Booking ${status} successfully`);
      refreshData();
      setIsApprovalDialogOpen(false);
      setSelectedBookingForApproval(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error(`Failed to ${status === 'approved' ? 'approve' : 'reject'} booking`);
    }
  };

  const handleSwapInDialog = async () => {
    if (!selectedBookingForApproval || !swapEmployeeId) return;
    
    const selectedEmployee = casualEmployees.find(emp => emp.id === swapEmployeeId);
    if (!selectedEmployee) return;

    try {
      setIsSwappingInDialog(true);
      
      // Check if the new employee already has a booking for this date
      const hasExistingBooking = await checkForExistingBooking(swapEmployeeId, selectedBookingForApproval.date);
      
      if (hasExistingBooking) {
        toast.error(`${selectedEmployee.name} already has a booking for this date`);
        return;
      }

      await updateSlotBookingEmployee(
        selectedBookingForApproval.id, 
        swapEmployeeId, 
        selectedEmployee.name,
        `Swapped from ${selectedBookingForApproval.employeeName} to ${selectedEmployee.name}`
      );
      
      toast.success(`Employee swapped successfully to ${selectedEmployee.name}`);
      refreshData();
      setIsApprovalDialogOpen(false);
      setSelectedBookingForApproval(null);
      setSwapEmployeeId('');
    } catch (error) {
      console.error('Error swapping employee:', error);
      toast.error('Failed to swap employee');
    } finally {
      setIsSwappingInDialog(false);
    }
  };

  const handleBranchUpdate = async () => {
    if (!selectedBookingForApproval || !selectedBranchForUpdate) return;
    
    const selectedBranchData = branches.find(branch => branch.id === selectedBranchForUpdate);
    if (!selectedBranchData) return;

    try {
      setIsUpdatingBranch(true);
      
      await updateSlotBookingBranch(
        selectedBookingForApproval.id, 
        selectedBranchForUpdate, 
        selectedBranchData.name,
        `Branch updated from ${selectedBookingForApproval.branchName} to ${selectedBranchData.name}`
      );
      
      toast.success(`Branch updated successfully to ${selectedBranchData.name}`);
      refreshData();
      setIsApprovalDialogOpen(false);
      setSelectedBookingForApproval(null);
      setSelectedBranchForUpdate('');
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;

    try {
      await cancelSlotBooking(selectedBookingForCancel.id, 'admin');
      toast.success('Booking cancelled successfully');
      refreshData();
      setIsCancelDialogOpen(false);
      setSelectedBookingForCancel(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleSettingsSave = async (branchId: string, weeklyConfig: WeeklySlotConfig) => {
    try {
      setIsSavingSettings(true);
      await updateWeeklySlotConfig(branchId, weeklyConfig);
      toast.success('Settings saved successfully');
      
      // Refresh the weekly slot config
      const updatedConfig = await getWeeklySlotConfig();
      setCurrentWeeklySlots(updatedConfig);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleBulkBookingSuccess = () => {
    refreshData();
    setIsBulkBookingDialogOpen(false);
  };

  const getSlotSummary = () => {
    const selectedDateBookings = getBookingsForDate(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek] as keyof WeeklySlotConfig;

    let totalSlots = 0;
    let bookedSlots = 0;
    let pendingSlots = 0;
    let approvedSlots = 0;

    if (selectedBranch === 'all') {
        branches.forEach(branch => {
          const branchConfig = currentWeeklySlots[branch.id];
          if (branchConfig) {
            totalSlots += Number(branchConfig[dayName]) || 0;
          }
        
        const branchBookings = selectedDateBookings.filter(b => b.branchId === branch.id);
        bookedSlots += branchBookings.length;
        pendingSlots += branchBookings.filter(b => b.status === 'pending').length;
        approvedSlots += branchBookings.filter(b => b.status === 'approved').length;
      });
      } else {
        const branchConfig = currentWeeklySlots[selectedBranch];
        if (branchConfig) {
          totalSlots = Number(branchConfig[dayName]) || 0;
        }
      
      bookedSlots = selectedDateBookings.length;
      pendingSlots = selectedDateBookings.filter(b => b.status === 'pending').length;
      approvedSlots = selectedDateBookings.filter(b => b.status === 'approved').length;
    }

    const availableSlots = Math.max(0, totalSlots - bookedSlots);

    return {
      total: totalSlots,
      available: availableSlots,
      booked: bookedSlots,
      pending: pendingSlots,
      approved: approvedSlots
    };
  };

  const getBranchUpdateButtonState = () => {
    const isSameBranch = selectedBookingForApproval?.branchId === selectedBranchForUpdate;
    return {
      disabled: !selectedBranchForUpdate || isUpdatingBranch || isSameBranch,
      loading: isUpdatingBranch,
      text: isUpdatingBranch ? 'Updating...' : (isSameBranch ? 'Same Branch' : 'Update Branch'),
      variant: isSameBranch ? 'outline' as const : 'secondary' as const
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading slot booking data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const slotSummary = getSlotSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} max-w-full`}>
          <div className="space-y-6 max-w-full">
            <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
              <div className={isMobile ? 'text-center' : ''}>
                <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Admin Slot Booking</h2>
                {autoRefreshActive && (
                  <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                    Auto-refreshing every 30 seconds
                  </p>
                )}
              </div>
              
              <AdminSlotBookingActions
                allBookings={allBookings}
                isMobile={isMobile}
                onPendingApprovalsClick={() => setIsPendingApprovalsDialogOpen(true)}
                onSettingsClick={() => setIsSettingsDialogOpen(true)}
                onRefreshData={refreshData}
              />
            </div>
            
            <AdminSlotBookingSummary
              allBookings={allBookings}
              selectedBranch={selectedBranch}
              weeklySlotConfig={Object.values(currentWeeklySlots)}
              currentMonth={selectedDate}
            />
            
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
              <div className={`${isMobile ? '' : 'lg:col-span-2'}`}>
                <Card className="h-fit">
                  <CardHeader className={`${isMobile ? 'p-4' : 'p-6'}`}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                      <CalendarIcon className="w-5 h-5" />
                      {format(selectedDate, 'MMMM yyyy')}
                    </CardTitle>
                    <CardDescription>
                      Click on a date to book slots or view existing bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={`${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="rounded-md border w-full"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: `relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent ${isMobile ? 'h-20' : 'h-24'}`,
                        day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                      components={{
                        Day: ({ date, ...props }) => {
                          const dayBookings = getBookingsForDate(date);
                          const hasBookings = dayBookings.length > 0;
                          const maxVisible = isMobile ? 6 : 10;
                          
                          return (
                            <div className="relative w-full h-full overflow-hidden">
                              <div
                                className={`w-full h-full hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden ${
                                  isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                                } ${hasBookings ? 'bg-blue-50' : ''} ${isMobile ? 'p-0.5' : 'p-1'}`}
                                onClick={() => setSelectedDate(date)}
                              >
                                <div className={`font-normal ${isMobile ? 'text-xs' : 'text-sm'} mb-1`}>
                                  {format(date, 'd')}
                                </div>
                                {hasBookings && (
                                  <div className="flex flex-col gap-0.5 w-full flex-1 overflow-hidden">
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
                                          className={`px-1 py-0.5 rounded text-white ${isMobile ? 'text-[8px]' : 'text-xs'} truncate w-full cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1 ${
                                            booking.status === 'pending' ? 'bg-yellow-500' :
                                            booking.status === 'approved' ? 'bg-green-500' :
                                            booking.status === 'rejected' ? 'bg-red-500' :
                                            'bg-gray-500'
                                          }`}
                                        >
                                          {hasClockedIn && (
                                            <div className="w-1 h-1 bg-white rounded-full flex-shrink-0"></div>
                                          )}
                                          <span className="truncate">
                                            {isMobile 
                                              ? `${booking.employeeName.split(' ')[0]}`
                                              : `${booking.employeeName} - ${branch?.name || booking.branchName}`
                                            }
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {dayBookings.length > maxVisible && (
                                      <div className={`text-gray-600 ${isMobile ? 'text-[8px]' : 'text-xs'} text-center`}>
                                        +{dayBookings.length - maxVisible} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </CardTitle>
                    <CardDescription>
                      {getBookingsForDate(selectedDate).length} booking(s) for this date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getBookingsForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No bookings for this date</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => setIsBulkBookingDialogOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Booking
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getBookingsForDate(selectedDate).map((booking) => {
                          const branch = branches.find(b => b.id === booking.branchId);
                          const hasClockedIn = hasEmployeeClockedIn(booking.employeeId, selectedDate);
                          
                          return (
                            <Card key={booking.id} className={`${isMobile ? 'p-2' : 'p-3'}`}>
                              <div className={`flex items-start ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: branch?.color?.replace('bg-', '') || '#3b82f6' }}
                                  ></div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                        {booking.employeeName}
                                      </h4>
                                      {hasClockedIn && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Clocked In
                                        </Badge>
                                      )}
                                    </div>
                                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                      {branch?.name || booking.branchName}
                                    </p>
                                    <Badge 
                                      variant={
                                        booking.status === 'pending' ? 'secondary' :
                                        booking.status === 'approved' ? 'default' :
                                        booking.status === 'rejected' ? 'destructive' :
                                        'outline'
                                      }
                                      className={`${isMobile ? 'text-xs' : ''} ${
                                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        ''
                                      }`}
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className={`flex space-x-2 ${isMobile ? 'w-full' : ''}`}>
                                  {booking.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApprovalClick(booking, {} as React.MouseEvent)}
                                        className={isMobile ? 'flex-1' : ''}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Manage
                                      </Button>
                                    </>
                                  )}
                                  {booking.status === 'approved' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedBookingForSwap(booking);
                                        setIsSwapDialogOpen(true);
                                      }}
                                      className={isMobile ? 'flex-1' : ''}
                                    >
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      Swap
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBookingForCancel(booking);
                                      setIsCancelDialogOpen(true);
                                    }}
                                    className={`text-red-600 hover:text-red-700 ${isMobile ? 'flex-1' : ''}`}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
          {/* Dialogs */}
          <Dialog open={isPendingApprovalsDialogOpen} onOpenChange={setIsPendingApprovalsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Pending Bookings for Approval</DialogTitle>
                <DialogDescription>Review and approve or reject slot bookings.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {allBookings.filter(b => b.status === 'pending').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No pending bookings require approval</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {allBookings.filter(b => b.status === 'pending').map((booking) => {
                      const branch = branches.find(b => b.id === booking.branchId);
                      return (
                        <Card key={booking.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: branch?.color?.replace('bg-', '') || '#3b82f6' }}
                              ></div>
                              <div>
                                <h4 className="font-medium">{booking.employeeName}</h4>
                                <p className="text-sm text-gray-600">
                                  {branch?.name || booking.branchName} • {booking.date}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprovalClick(booking, {} as React.MouseEvent)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Manage
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Booking</DialogTitle>
                <DialogDescription>
                  Approve, reject, swap employee, or update branch for this booking.
                </DialogDescription>
              </DialogHeader>
              {selectedBookingForApproval && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{selectedBookingForApproval.employeeName}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedBookingForApproval.branchName} • {selectedBookingForApproval.date}
                    </p>
                    <Badge 
                      variant={selectedBookingForApproval.status === 'pending' ? 'secondary' : 'default'}
                      className={selectedBookingForApproval.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                    >
                      {selectedBookingForApproval.status}
                    </Badge>
                  </div>
                  
                  {selectedBookingForApproval.status === 'pending' && (
                    <div className="space-y-2">
                      <Label>Swap Employee (Optional)</Label>
                      <Select value={swapEmployeeId} onValueChange={setSwapEmployeeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee to swap" />
                        </SelectTrigger>
                        <SelectContent>
                          {casualEmployees
                            .filter(emp => emp.id !== selectedBookingForApproval.employeeId)
                            .map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      
                      <Label>Update Branch (Optional)</Label>
                      <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <DialogFooter className="flex-col space-y-2">
                    {swapEmployeeId && (
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSwapInDialog}
                        disabled={isSwappingInDialog}
                        className="w-full"
                      >
                        {isSwappingInDialog ? 'Swapping...' : `Swap to ${casualEmployees.find(emp => emp.id === swapEmployeeId)?.name}`}
                      </Button>
                    )}
                    
                    {(() => {
                      const buttonState = getBranchUpdateButtonState();
                      return (
                        <Button 
                          type="button"
                          variant={buttonState.variant}
                          size="sm"
                          onClick={handleBranchUpdate}
                          disabled={buttonState.disabled}
                          className="w-full"
                        >
                          {buttonState.text}
                        </Button>
                      );
                    })()}
                    
                    {selectedBookingForApproval.status === 'pending' && (
                      <div className="flex space-x-2 w-full">
                        <Button 
                          onClick={() => handleApproval('approved')}
                          className="flex-1"
                          size="sm"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleApproval('rejected')}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsApprovalDialogOpen(false);
                        setSelectedBookingForApproval(null);
                        setSwapEmployeeId('');
                        setSelectedBranchForUpdate('');
                      }}
                      className="w-full"
                      size="sm"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Weekly Slot Configuration</DialogTitle>
                <DialogDescription>
                  Configure the number of available slots for each day of the week for each branch.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {branches.map((branch) => {
                  const config = currentWeeklySlots[branch.id] || {
                    id: '',
                    branchId: branch.id,
                    monday: 0, tuesday: 0, wednesday: 0, thursday: 0, 
                    friday: 0, saturday: 0, sunday: 0
                  };
                  
                  return (
                    <Card key={branch.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: branch.color?.replace('bg-', '') || '#3b82f6' }}
                          ></div>
                          {branch.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day}>
                              <Label className="text-xs capitalize">{day}</Label>
                              <Input
                                type="number"
                                min="0"
                                value={config[day as keyof WeeklySlotConfig] || 0}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 0;
                                  const newConfig: WeeklySlotConfig = {
                                    ...config,
                                    id: config.id || '',
                                    branchId: branch.id,
                                    [day]: newValue
                                  };
                                  setCurrentWeeklySlots(prev => ({
                                    ...prev,
                                    [branch.id]: newConfig
                                  }));
                                }}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={() => handleSettingsSave(branch.id, config)}
                          disabled={isSavingSettings}
                          className="mt-4"
                          size="sm"
                        >
                          {isSavingSettings ? 'Saving...' : 'Save'} {branch.name}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {selectedBookingForCancel && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{selectedBookingForCancel.employeeName}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedBookingForCancel.branchName} • {selectedBookingForCancel.date}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cancelReason">Reason for cancellation (Optional)</Label>
                    <Input
                      id="cancelReason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter reason..."
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                  Keep Booking
                </Button>
                <Button variant="destructive" onClick={handleCancelBooking}>
                  Cancel Booking
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SwapEmployeeDialog
            isOpen={isSwapDialogOpen}
            onClose={() => setIsSwapDialogOpen(false)}
            booking={selectedBookingForSwap}
            onSuccess={() => {
              refreshData();
              setIsSwapDialogOpen(false);
            }}
          />

          <BulkSlotBookingDialog
            isOpen={isBulkBookingDialogOpen}
            onClose={() => setIsBulkBookingDialogOpen(false)}
            selectedDate={selectedDate}
            onSuccess={handleBulkBookingSuccess}
          />
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;