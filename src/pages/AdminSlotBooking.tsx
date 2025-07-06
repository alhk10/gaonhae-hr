
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
import { Calendar as CalendarIcon, Settings, Check, X, Edit, Filter, UserCheck } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import SwapEmployeeDialog from '@/components/slot-booking/SwapEmployeeDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getBranches,
  getAllSlotBookings,
  updateSlotBookingStatus,
  getWeeklySlotConfig,
  updateWeeklySlotConfig,
  type SlotBooking,
  type Branch,
  type WeeklySlotConfig
} from '@/services/slotBookingService';

const AdminSlotBooking = () => {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<SlotBooking | null>(null);
  const [selectedBookingForSwap, setSelectedBookingForSwap] = useState<SlotBooking | null>(null);
  const [casualEmployees, setCasualEmployees] = useState<EmployeeProfile[]>([]);
  const [allBookings, setAllBookings] = useState<SlotBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentWeeklySlots, setCurrentWeeklySlots] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);

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

  // Load initial data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log('AdminSlotBooking: Loading initial data from Supabase...');
        
        const [branchesData, bookingsData, weeklyConfigData, employeesData] = await Promise.all([
          getBranches(),
          getAllSlotBookings(),
          getWeeklySlotConfig(),
          getCasualEmployees()
        ]);

        console.log('AdminSlotBooking: Loaded data:', {
          branches: branchesData,
          bookings: bookingsData,
          config: weeklyConfigData,
          employees: employeesData
        });

        setBranches(branchesData);
        setAllBookings(bookingsData);
        setCurrentWeeklySlots(weeklyConfigData);
        setCasualEmployees(employeesData);
      } catch (error) {
        console.error('AdminSlotBooking: Error loading initial data:', error);
        toast.error('Failed to load slot booking data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const refreshData = async () => {
    try {
      const [bookingsData, weeklyConfigData] = await Promise.all([
        getAllSlotBookings(),
        getWeeklySlotConfig()
      ]);
      setAllBookings(bookingsData);
      setCurrentWeeklySlots(weeklyConfigData);
      console.log('AdminSlotBooking: Data refreshed successfully');
    } catch (error) {
      console.error('AdminSlotBooking: Error refreshing data:', error);
    }
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(b => 
      b.date === dateString && 
      b.status !== 'rejected' && // Filter out rejected slots
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setIsApprovalDialogOpen(true);
  };

  const handleSwapClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForSwap(booking);
    setIsSwapDialogOpen(true);
  };

  const handleSwapSuccess = async () => {
    await refreshData();
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
      toast.error("Error saving settings");
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
              
              <div className={`flex space-x-2 ${isMobile ? 'w-full' : ''}`}>
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className={isMobile ? 'flex-1' : ''}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Slot Booking Settings</DialogTitle>
                      <DialogDescription>Configure weekly slot allocations for each branch. All changes will be saved to Supabase.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSettingsSave}>
                      <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Weekly Slot Configuration</h3>
                          <p className="text-sm text-gray-600">Configure the number of available slots for each branch by day of the week. Changes will be immediately saved to Supabase.</p>
                          
                          <div className="space-y-6">
                            {branches.map((branch) => (
                              <div key={branch.id} className="border rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: branch.color }}
                                  ></div>
                                  <h4 className="font-medium">{branch.name}</h4>
                                </div>
                                <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-7'}`}>
                                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                                    <div key={day} className="space-y-1">
                                      <Label className={`font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                        {isMobile ? day.slice(0, 2) : day.slice(0, 3)}
                                      </Label>
                                      <Input
                                        name={`${branch.id}-${day}`}
                                        type="number"
                                        min="0"
                                        max="50"
                                        defaultValue={currentWeeklySlots[branch.id]?.[day] || 0}
                                        className="text-center"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
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
              </div>
            </div>

            {/* Slot Summary */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-5'}`}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.totalSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.availableSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Booked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.bookedSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-yellow-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.pendingSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.approvedSlots}</div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Filter and Calendar */}
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
                                style={{ backgroundColor: branch.color }}
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
              <CardContent className="p-0 w-full overflow-hidden">
                <div className="w-full max-w-full">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full max-w-full border-0"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full max-w-full",
                      month: "space-y-4 w-full max-w-full",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: isMobile ? "text-sm font-medium" : "text-lg font-medium",
                      nav: "space-x-1 flex items-center",
                      table: "w-full max-w-full border-collapse space-y-1",
                      head_row: "flex w-full max-w-full",
                      head_cell: `text-muted-foreground rounded-md w-full font-normal flex-1 text-center ${isMobile ? 'text-xs p-1' : 'text-sm p-2'}`,
                      row: "flex w-full max-w-full mt-2",
                      cell: `text-center relative flex-1 border-r border-b focus-within:relative focus-within:z-20 ${isMobile ? 'h-24 p-0.5' : 'h-32 p-1'}`,
                      day: `w-full h-full font-normal aria-selected:opacity-100 hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden ${isMobile ? 'p-0.5' : 'p-1'}`,
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
                        const maxVisible = isMobile ? 2 : 4; // Increased from 1/3 to 2/4
                        
                        return (
                          <div className="relative w-full h-full overflow-hidden">
                            <div
                              className={`w-full h-full hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden ${
                                isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                              } ${hasBookings ? 'bg-blue-50' : ''} ${isMobile ? 'p-0.5' : 'p-1'}`}
                              onClick={() => setSelectedDate(date)}
                            >
                              <div className="w-full h-full flex flex-col overflow-hidden">
                                <span className={`font-medium text-left mb-0.5 flex-shrink-0 ${isMobile ? 'text-xs' : 'text-sm'}`}>{date.getDate()}</span>
                                {hasBookings && (
                                  <div className="flex flex-col gap-0.5 w-full flex-1 overflow-hidden">
                                    {dayBookings.slice(0, maxVisible).map((booking, idx) => {
                                      const branch = branches.find(b => b.id === booking.branchId);
                                      return (
                                        <div
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprovalClick(booking, e);
                                          }}
                                          className={`px-0.5 py-0.5 rounded text-white truncate hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 ${isMobile ? 'text-xs leading-tight' : 'text-xs'}`}
                                          style={{ 
                                            backgroundColor: branch?.color || '#6b7280',
                                            ...(booking.status === 'pending' && { border: '1px solid #fbbf24' }),
                                            ...(booking.status === 'approved' && { border: '1px solid #10b981' })
                                          }}
                                          title={`${booking.employeeName} - ${branch?.name} (${booking.status}) - Click to approve/reject`}
                                        >
                                          <span className="truncate">
                                            {isMobile ? 
                                              booking.employeeName.split(' ')[0].slice(0, 4) : 
                                              booking.employeeName.split(' ')[0].slice(0, 10)
                                            }
                                            {booking.status === 'pending' && ' ⏳'}
                                            {booking.status === 'approved' && ' ✅'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {dayBookings.length > maxVisible && (
                                      <span className={`text-gray-600 flex-shrink-0 ${isMobile ? 'text-xs' : 'text-xs'}`}>+{dayBookings.length - maxVisible}</span>
                                    )}
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
                <div className="space-y-3">
                  {getBookingsForDate(selectedDate).map((booking) => {
                    const branch = branches.find(b => b.id === booking.branchId);
                    return (
                      <Card key={booking.id} className={`${isMobile ? 'p-2' : 'p-3'}`}>
                        <div className={`flex items-start ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: branch?.color || '#6b7280' }}
                            ></div>
                            <div>
                              <p className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>{booking.employeeName}</p>
                              <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>{branch?.name}</p>
                              <Badge 
                                variant={
                                  booking.status === 'approved' ? 'default' :
                                  booking.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }
                                className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}
                              >
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                          <div className={`flex space-x-1 ${isMobile ? 'w-full justify-end' : ''}`}>
                            {booking.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                                  onClick={() => handleApproval(booking.id, 'approved', 'Admin')}
                                >
                                  <Check className={`text-green-600 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                                  onClick={() => handleApproval(booking.id, 'rejected', 'Admin')}
                                >
                                  <X className={`text-red-600 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                              onClick={() => handleSwapClick(booking, new MouseEvent('click') as any)}
                            >
                              <UserCheck className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                              onClick={() => handleApprovalClick(booking, new MouseEvent('click') as any)}
                            >
                              <Edit className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {getBookingsForDate(selectedDate).length === 0 && (
                    <p className={`text-gray-500 text-center ${isMobile ? 'py-3 text-sm' : 'py-4 text-sm'}`}>
                      No bookings for this date.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Approval Dialog */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={(open) => {
              setIsApprovalDialogOpen(open);
              if (!open) setSelectedBookingForApproval(null);
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Approve/Reject Booking</DialogTitle>
                  <DialogDescription>
                    {selectedBookingForApproval && 
                      `Review booking for ${selectedBookingForApproval.employeeName} on ${new Date(selectedBookingForApproval.date).toLocaleDateString()}`
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <p><strong>Employee:</strong> {selectedBookingForApproval?.employeeName}</p>
                    <p><strong>Branch:</strong> {selectedBookingForApproval?.branchName}</p>
                    <p><strong>Date:</strong> {selectedBookingForApproval && new Date(selectedBookingForApproval.date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <Badge variant="secondary">{selectedBookingForApproval?.status}</Badge></p>
                  </div>
                </div>
                <DialogFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'rejected', 'Admin')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsApprovalDialogOpen(false);
                      setSelectedBookingForApproval(null);
                    }}>
                      Close
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'approved', 'Admin')}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <SwapEmployeeDialog
            isOpen={isSwapDialogOpen}
            onClose={() => setIsSwapDialogOpen(false)}
            booking={selectedBookingForSwap}
            onSuccess={handleSwapSuccess}
          />
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
