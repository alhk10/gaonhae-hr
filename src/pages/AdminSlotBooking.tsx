import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  type SlotBooking,
  type Branch,
  type WeeklySlotConfig,
  type EmployeeAttendanceStatus,
  updateSlotBookingBranch
} from '@/services/slotBookingService';

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

  // New state for swap functionality in approval dialog
  const [swapEmployeeId, setSwapEmployeeId] = useState('');
  const [isSwappingInDialog, setIsSwappingInDialog] = useState(false);
  
  // New state for branch editing functionality
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState('');
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);
  const [isPendingApprovalsDialogOpen, setIsPendingApprovalsDialogOpen] = useState(false);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshActive) return;

    const interval = setInterval(() => {
      // Only refresh if page is visible
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
        
        // Add timeout to prevent infinite loading
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
      // Get unique employee IDs and dates from current month bookings
      const currentMonth = selectedDate;
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const uniqueEmployeeIds = [...new Set(bookings.map(b => b.employeeId))];
      const dateStrings = daysInMonth.map(date => format(date, 'yyyy-MM-dd'));

      if (uniqueEmployeeIds.length > 0 && dateStrings.length > 0) {
        const attendanceData = await getEmployeeAttendanceStatus(uniqueEmployeeIds, dateStrings);
        
        // Create a map for quick lookup
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
    return allBookings.filter(b => 
      b.date === dateString && 
      b.status !== 'rejected' && 
      b.status !== 'cancelled' && // Filter out cancelled slots
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const hasEmployeeClockedIn = (employeeId: string, date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = `${employeeId}-${dateString}`;
    return attendanceStatusMap.has(key) && attendanceStatusMap.get(key)?.hasClockedIn === true;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsBulkBookingDialogOpen(true);
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setSwapEmployeeId(''); // Reset swap selection
    setSelectedBranchForUpdate(booking.branchId); // Set current branch as default
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

  // New function to handle branch updates with proper database update
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
      
      // Check if target branch has available slots for the date
      const bookingDate = selectedBookingForApproval.date;
      const dayOfWeek = new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      const totalSlots = currentWeeklySlots[selectedBranchForUpdate]?.[dayOfWeek] || 0;
      const existingBookings = allBookings.filter(b => 
        b.date === bookingDate && 
        b.branchId === selectedBranchForUpdate && 
        b.status !== 'cancelled' && 
        b.status !== 'rejected' &&
        b.id !== selectedBookingForApproval.id // Exclude current booking
      );

      if (existingBookings.length >= totalSlots) {
        toast.error(`Target branch "${targetBranch.name}" is at full capacity for ${format(new Date(bookingDate), 'MMM dd, yyyy')}`);
        return;
      }

      // Update the booking record in database with new branch details
      const success = await updateSlotBookingBranch(
        selectedBookingForApproval.id,
        selectedBranchForUpdate,
        targetBranch.name,
        `Branch changed from ${selectedBookingForApproval.branchName} to ${targetBranch.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully moved booking to ${targetBranch.name}`);
        
        // Force refresh the data to ensure calendar displays correctly
        await refreshData();
        
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSelectedBranchForUpdate('');
      } else {
        toast.error('Failed to update branch');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error updating branch:', error);
      toast.error('Failed to update branch');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const getSlotSummary = () => {
    const currentMonth = selectedDate;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let totalSlots = 0;
    let bookedSlots = 0;
    let pendingSlots = 0;
    let approvedSlots = 0;

    daysInMonth.forEach(day => {
      const dayBookings = getBookingsForDate(day);
      const dayName = format(day, 'EEEE').toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      
      if (selectedBranch === 'all') {
        branches.forEach(branch => {
          totalSlots += Number(currentWeeklySlots[branch.id]?.[dayName] || 0);
        });
      } else {
        totalSlots += Number(currentWeeklySlots[selectedBranch]?.[dayName] || 0);
      }
      
      bookedSlots += dayBookings.length;
      pendingSlots += dayBookings.filter(b => b.status === 'pending').length;
      approvedSlots += dayBookings.filter(b => b.status === 'approved').length;
    });

    return { totalSlots, bookedSlots, pendingSlots, approvedSlots, availableSlots: totalSlots - bookedSlots };
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
      console.error('AdminSlotBooking: Error updating booking status:', error);
      toast.error("Failed to update booking status");
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
        selectedEmployee.name,
        `Swapped from ${selectedBookingForApproval.employeeName} to ${selectedEmployee.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully swapped employee to ${selectedEmployee.name}`);
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSwapEmployeeId('');
      } else {
        toast.error('Failed to swap employee');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error swapping employee:', error);
      toast.error('Failed to swap employee');
    } finally {
      setIsSwappingInDialog(false);
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
      console.error('AdminSlotBooking: Error cancelling booking:', error);
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
      console.error('AdminSlotBooking: Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      console.log('AdminSlotBooking: Saving settings to Supabase...');
      
      const daysOfWeek: Array<keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      const updatePromises = branches.map(async (branch) => {
        const weeklyConfig: Omit<WeeklySlotConfig, 'id' | 'branchId'> = {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0
        };
        
        daysOfWeek.forEach(day => {
          const fieldName = `${branch.id}-${day}`;
          const value = formData.get(fieldName) as string;
          if (value && !isNaN(parseInt(value))) {
            weeklyConfig[day] = parseInt(value);
          }
        });
        
        console.log(`Updating weekly slots for branch ${branch.id}:`, weeklyConfig);
        return updateWeeklySlotConfig(branch.id, weeklyConfig);
      });

      const results = await Promise.all(updatePromises);
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        const updatedWeeklyConfig = await getWeeklySlotConfig();
        setCurrentWeeklySlots(updatedWeeklyConfig);
        
        setIsSettingsDialogOpen(false);
        toast.success("Settings saved successfully to Supabase");
        console.log('AdminSlotBooking: All settings saved successfully to Supabase');
      } else {
        toast.error("Some settings failed to save. Please try again.");
        console.error('AdminSlotBooking: Some settings failed to save');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error saving settings:', error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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

            {/* Slot Summary */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-5'}`}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    {slotSummary.totalSlots}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    {slotSummary.availableSlots}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Booked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    {slotSummary.bookedSlots}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-yellow-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    {slotSummary.pendingSlots}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                    {slotSummary.approvedSlots}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar and Details */}
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {/* Calendar */}
              <div className={`${isMobile ? '' : 'lg:col-span-2'}`}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        {format(selectedDate, 'MMMM yyyy')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                          <SelectTrigger className={`${isMobile ? 'w-32' : 'w-40'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDate(new Date())}
                          className={isMobile ? 'px-2' : ''}
                        >
                          <CalendarIcon className="w-4 h-4" />
                          {!isMobile && <span className="ml-2">Today</span>}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-md border-0"
                      components={{
                        DayContent: ({ date }) => {
                          const bookings = getBookingsForDate(date);
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          const isToday = isSameDay(date, new Date());
                          
                          return (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                              <span className={`${isToday ? 'font-bold' : ''}`}>
                                {date.getDate()}
                              </span>
                              {bookings.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                  {bookings.slice(0, 3).map((booking, idx) => (
                                    <div
                                      key={booking.id}
                                      className={`w-2 h-2 rounded-full ${
                                        booking.status === 'approved' 
                                          ? 'bg-green-500' 
                                          : booking.status === 'pending' 
                                          ? 'bg-yellow-500' 
                                          : 'bg-gray-400'
                                      }`}
                                    />
                                  ))}
                                  {bookings.length > 3 && (
                                    <span className="text-xs text-gray-500">+{bookings.length - 3}</span>
                                  )}
                                </div>
                              )}
                              {!isPast && bookings.length === 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateClick(date);
                                  }}
                                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-blue-50 rounded"
                                >
                                  <Plus className="w-4 h-4 text-blue-600" />
                                </button>
                              )}
                            </div>
                          );
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Selected Date Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'}`}>
                      {format(selectedDate, 'EEE, MMM dd')}
                    </CardTitle>
                    <CardDescription>
                      {getBookingsForDate(selectedDate).length} booking(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getBookingsForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className={`${isMobile ? 'text-sm' : ''}`}>No bookings for this date</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleDateClick(selectedDate)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Booking
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getBookingsForDate(selectedDate).map((booking) => (
                          <div key={booking.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant={booking.status === 'approved' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'}
                                    className={`text-xs ${
                                      booking.status === 'approved' 
                                        ? 'bg-green-100 text-green-700 border-green-300' 
                                        : booking.status === 'pending' 
                                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                                        : ''
                                    }`}
                                  >
                                    {booking.status}
                                  </Badge>
                                  {hasEmployeeClockedIn(booking.employeeId, selectedDate) && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                      <Check className="w-3 h-3 mr-1" />
                                      Clocked In
                                    </Badge>
                                  )}
                                </div>
                                <h4 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                                  {booking.employeeName}
                                </h4>
                                <p className={`text-gray-600 flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                  <MapPin className="w-3 h-3" />
                                  {booking.branchName}
                                </p>
                                {booking.notes && (
                                  <p className={`text-gray-500 mt-1 italic ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                    {booking.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 pt-2">
                              {booking.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleApprovalClick(booking, e)}
                                  className={`flex-1 ${isMobile ? 'text-xs px-2 py-1' : ''}`}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Review
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleSwapClick(booking, e)}
                                className={`flex-1 ${isMobile ? 'text-xs px-2 py-1' : ''}`}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Swap
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleCancelClick(booking, e)}
                                className={`flex-1 text-red-600 hover:text-red-700 ${isMobile ? 'text-xs px-2 py-1' : ''}`}
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Pending Approvals Dialog */}
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
                  <>
                    <div className="flex gap-2 mb-4">
                      <Button 
                        onClick={async () => {
                          const pendingBookings = allBookings.filter(b => b.status === 'pending');
                          for (const booking of pendingBookings) {
                            await handleApproval(booking.id, 'approved', 'Admin');
                          }
                          setIsPendingApprovalsDialogOpen(false);
                          toast.success(`Approved ${pendingBookings.length} bookings`);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve All
                      </Button>
                      <Button 
                        onClick={async () => {
                          const pendingBookings = allBookings.filter(b => b.status === 'pending');
                          for (const booking of pendingBookings) {
                            await handleApproval(booking.id, 'rejected', 'Admin');
                          }
                          setIsPendingApprovalsDialogOpen(false);
                          toast.success(`Rejected ${pendingBookings.length} bookings`);
                        }}
                        variant="destructive"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {allBookings
                        .filter(b => b.status === 'pending')
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((booking) => (
                        <div key={booking.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  {booking.status}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(booking.date), 'EEE, MMM dd, yyyy')}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900">{booking.employeeName}</h4>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {booking.branchName}
                              </p>
                              {booking.notes && (
                                <p className="text-xs text-gray-500 mt-1 italic">{booking.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproval(booking.id, 'approved', 'Admin')}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproval(booking.id, 'rejected', 'Admin')}
                                className="px-3 py-1"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Settings Dialog */}
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Weekly Slot Settings</DialogTitle>
                <DialogDescription>Configure the number of available slots for each day of the week, per branch.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSettingsSave} className="space-y-6">
                <div className="grid gap-6">
                  {branches.map((branch) => (
                    <Card key={branch.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{branch.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-4">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day}>
                              <Label htmlFor={`${branch.id}-${day}`} className="text-sm font-medium capitalize">
                                {day.slice(0, 3)}
                              </Label>
                              <Input
                                id={`${branch.id}-${day}`}
                                name={`${branch.id}-${day}`}
                                type="number"
                                min="0"
                                max="20"
                                defaultValue={currentWeeklySlots[branch.id]?.[day as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>] || 0}
                                className="mt-1"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingSettings}>
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Individual Booking Review Dialog */}
          <Dialog open={isApprovalDialogOpen} onOpenChange={(open) => {
            setIsApprovalDialogOpen(open);
            if (!open) {
              setSelectedBookingForApproval(null);
              setSwapEmployeeId('');
              setSelectedBranchForUpdate('');
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Review Booking</DialogTitle>
                <DialogDescription>
                  {selectedBookingForApproval && `${selectedBookingForApproval.employeeName} - ${format(new Date(selectedBookingForApproval.date), 'EEE, MMM dd, yyyy')}`}
                </DialogDescription>
              </DialogHeader>
              {selectedBookingForApproval && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-600">Employee</Label>
                      <p className="font-medium">{selectedBookingForApproval.employeeName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Branch</Label>
                      <p className="font-medium">{selectedBookingForApproval.branchName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Date</Label>
                      <p className="font-medium">{format(new Date(selectedBookingForApproval.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Status</Label>
                      <Badge className={`${
                        selectedBookingForApproval.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : selectedBookingForApproval.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedBookingForApproval.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedBookingForApproval.notes && (
                    <div>
                      <Label className="text-gray-600">Notes</Label>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedBookingForApproval.notes}</p>
                    </div>
                  )}

                  {/* Employee Swap Section */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Swap Employee (Optional)</Label>
                    <Select value={swapEmployeeId} onValueChange={setSwapEmployeeId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select employee to swap with..." />
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
                    {swapEmployeeId && (
                      <Button
                        size="sm"
                        onClick={handleSwapInDialog}
                        disabled={isSwappingInDialog}
                        className="mt-2 w-full"
                      >
                        {isSwappingInDialog ? 'Swapping...' : 'Confirm Swap'}
                      </Button>
                    )}
                  </div>

                  {/* Branch Change Section */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Change Branch (Optional)</Label>
                    <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select new branch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBranchForUpdate && selectedBranchForUpdate !== selectedBookingForApproval.branchId && (
                      <Button
                        size="sm"
                        onClick={handleBranchUpdate}
                        disabled={isUpdatingBranch}
                        className="mt-2 w-full"
                      >
                        {isUpdatingBranch ? 'Updating...' : 'Change Branch'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter className="flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <Button
                    type="button" 
                    variant="destructive" 
                    onClick={handleCancelBookingFromApprovalDialog}
                    className="flex-1"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsApprovalDialogOpen(false)} className="flex-1">
                    Close
                  </Button>
                </div>
                {selectedBookingForApproval?.status === 'pending' && (
                  <div className="flex gap-2 w-full">
                    <Button
                      type="button" 
                      variant="destructive" 
                      onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'rejected', 'Admin')}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      type="button" 
                      onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'approved', 'Admin')}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Cancel Booking Dialog */}
          <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
            setIsCancelDialogOpen(open);
            if (!open) setSelectedBookingForCancel(null);
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {selectedBookingForCancel && (
                <div className="space-y-2">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">{selectedBookingForCancel.employeeName}</p>
                    <p className="text-sm text-gray-600">{selectedBookingForCancel.branchName}</p>
                    <p className="text-sm text-gray-600">{format(new Date(selectedBookingForCancel.date), 'EEE, MMM dd, yyyy')}</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
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
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
