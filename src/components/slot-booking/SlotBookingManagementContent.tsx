import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
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
                    <span>{format(new Date(booking.date), 'dd MMM yyyy')}</span>
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
      <Card>
        <CardHeader>
          <CardTitle>Booking Calendar</CardTitle>
          <CardDescription>Click on a date to add bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            onDayClick={handleDateClick}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Bookings for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings for {format(selectedDate, 'MMMM dd, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {getBookingsForDate(selectedDate).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No bookings for this date</p>
          ) : (
            <div className="space-y-2">
              {getBookingsForDate(selectedDate).map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{booking.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{booking.branchName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      booking.status === 'approved' ? 'default' :
                      booking.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {booking.status}
                    </Badge>
                    {hasEmployeeClockedIn(booking.employeeId, selectedDate) && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Clocked In
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={(e) => handleCancelClick(booking, e)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <p><strong>Date:</strong> {selectedBookingForCancel && format(new Date(selectedBookingForCancel.date), 'dd/MM/yyyy')}</p>
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
