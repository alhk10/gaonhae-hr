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
import { Calendar as CalendarIcon, Plus, Settings, Users, Check, X, Edit, Trash, Filter, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import {
  getBranches,
  getAllSlotBookings,
  updateSlotBookingStatus,
  getBookedSlotsForDate,
  getAvailableSlotsForDate,
  getWeeklySlotConfig,
  updateWeeklySlotConfig,
  type SlotBooking,
  type Branch,
  type WeeklySlotConfig
} from '@/services/slotBookingService';

const AdminSlotBooking = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isBulkBookingDialogOpen, setIsBulkBookingDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState<Date>(new Date());
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<SlotBooking | null>(null);
  const [casualEmployees, setCasualEmployees] = useState<EmployeeProfile[]>([]);
  const [allBookings, setAllBookings] = useState<SlotBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentWeeklySlots, setCurrentWeeklySlots] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
      toast.error('Failed to refresh data');
    }
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(b => 
      b.date === dateString && 
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedDateForBooking(date);
    setIsBulkBookingDialogOpen(true);
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setIsApprovalDialogOpen(true);
  };

  const handleBulkBookingSuccess = async () => {
    await refreshData();
    toast.success('Bulk slot bookings created successfully');
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
      const success = await updateSlotBookingStatus(bookingId, status, approvedBy);
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
      
      // Save weekly slots configuration to Supabase
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
        // Refresh the local state with updated data
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
          <main className="flex-1 p-6 overflow-auto">
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
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Admin Slot Booking</h2>
                <p className="text-gray-600">Manage casual employee work schedules with monthly calendar view</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={refreshData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
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
                        {/* Weekly Slots Configuration */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Weekly Slot Configuration</h3>
                          <p className="text-sm text-gray-600">Configure the number of available slots for each branch by day of the week. Changes will be immediately saved to Supabase.</p>
                          
                          <div className="space-y-6">
                            {branches.map((branch) => (
                              <div key={branch.id} className="border rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className={`w-3 h-3 rounded-full ${branch.color}`}></div>
                                  <h4 className="font-medium">{branch.name}</h4>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                                    <div key={day} className="space-y-1">
                                      <Label className="text-xs font-medium">{day.slice(0, 3)}</Label>
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

                <Button onClick={() => setIsBulkBookingDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Bulk Booking
                </Button>
              </div>
            </div>

            {/* Slot Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{slotSummary.totalSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{slotSummary.availableSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Booked Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{slotSummary.bookedSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{slotSummary.pendingSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{slotSummary.approvedSlots}</div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Filter and Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Monthly Calendar View</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${branch.color}`}></div>
                              <span>{branch.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>
                  Click on any date to create bulk bookings for casual employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full border rounded-md mx-auto"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-lg font-medium",
                      nav: "space-x-1 flex items-center",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-sm flex-1",
                      row: "flex w-full mt-2",
                      cell: "h-32 text-center text-sm p-1 relative flex-1 border-r border-b [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "w-full h-full p-2 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md cursor-pointer transition-colors flex flex-col items-start justify-start",
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
                        
                        return (
                          <div className="relative w-full h-full">
                            <div
                              className={`w-full h-full p-2 text-sm hover:bg-accent rounded-md cursor-pointer transition-colors flex flex-col items-start justify-start ${
                                isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                              } ${hasBookings ? 'bg-blue-50' : ''}`}
                              onClick={() => handleDateClick(date)}
                            >
                              <div className="w-full h-full flex flex-col">
                                <span className="font-medium text-left mb-1">{date.getDate()}</span>
                                {hasBookings && (
                                  <div className="flex flex-col gap-1 w-full flex-1">
                                    {dayBookings.slice(0, 4).map((booking, idx) => {
                                      const branch = branches.find(b => b.id === booking.branchId);
                                      return (
                                        <div
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprovalClick(booking, e);
                                          }}
                                          className={`text-xs px-1 py-0.5 rounded text-white truncate hover:opacity-80 transition-opacity cursor-pointer ${branch?.color || 'bg-gray-500'} ${
                                            booking.status === 'pending' ? 'ring-2 ring-yellow-400' : 
                                            booking.status === 'approved' ? 'ring-2 ring-green-400' :
                                            'ring-2 ring-red-400'
                                          }`}
                                          title={`${booking.employeeName} - ${branch?.name} (${booking.status}) - Click to approve/reject`}
                                        >
                                          {booking.employeeName.split(' ')[0]}
                                          {booking.status === 'pending' && ' ⏳'}
                                          {booking.status === 'approved' && ' ✅'}
                                          {booking.status === 'rejected' && ' ❌'}
                                        </div>
                                      );
                                    })}
                                    {dayBookings.length > 4 && (
                                      <span className="text-xs text-gray-600">+{dayBookings.length - 4}</span>
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
                <CardTitle>
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
                      <Card key={booking.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${branch?.color}`}></div>
                            <div>
                              <p className="font-medium text-sm">{booking.employeeName}</p>
                              <p className="text-xs text-gray-600">{branch?.name}</p>
                              <Badge 
                                variant={
                                  booking.status === 'approved' ? 'default' :
                                  booking.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }
                                className="text-xs mt-1"
                              >
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {booking.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleApproval(booking.id, 'approved', 'Admin')}
                                >
                                  <Check className="w-3 h-3 text-green-600" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleApproval(booking.id, 'rejected', 'Admin')}
                                >
                                  <X className="w-3 h-3 text-red-600" />
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleApprovalClick(booking, new MouseEvent('click') as any)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {getBookingsForDate(selectedDate).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No bookings for this date. Click on the calendar to add bulk bookings.
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

          <BulkSlotBookingDialog
            isOpen={isBulkBookingDialogOpen}
            onClose={() => setIsBulkBookingDialogOpen(false)}
            selectedDate={selectedDateForBooking}
            onSuccess={handleBulkBookingSuccess}
          />
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
