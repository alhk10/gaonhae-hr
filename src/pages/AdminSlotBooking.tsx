import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Edit, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import SwapEmployeeDialog from '@/components/slot-booking/SwapEmployeeDialog';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import AdminSlotBookingHeader from '@/components/admin/AdminSlotBookingHeader';
import AdminSlotBookingCalendar from '@/components/admin/AdminSlotBookingCalendar';
import AdminSlotBookingDetailsPanel from '@/components/admin/AdminSlotBookingDetailsPanel';
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 max-w-full overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminSlotBookingHeader
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              branches={branches}
              allBookings={allBookings}
              onSettingsClick={() => setIsSettingsDialogOpen(true)}
              onPendingApprovalsClick={() => setIsPendingApprovalsDialogOpen(true)}
              onRefreshData={refreshData}
              autoRefreshActive={autoRefreshActive}
            />
            
            <AdminSlotBookingSummary
              allBookings={allBookings}
              selectedBranch={selectedBranch}
              weeklySlotConfig={Object.values(currentWeeklySlots)}
              currentMonth={selectedDate}
            />
            
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AdminSlotBookingCalendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  allBookings={allBookings}
                  selectedBranch={selectedBranch}
                />
              </div>
              
              <div>
                <AdminSlotBookingDetailsPanel
                  selectedDate={selectedDate}
                  bookings={getBookingsForDate(selectedDate)}
                  weeklySlotConfig={currentWeeklySlots}
                  onApprovalClick={handleApprovalClick}
                  onCancelClick={(booking) => {
                    setSelectedBookingForCancel(booking);
                    setIsCancelDialogOpen(true);
                  }}
                  onCreateBooking={() => setIsBulkBookingDialogOpen(true)}
                  selectedBranch={selectedBranch}
                />
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