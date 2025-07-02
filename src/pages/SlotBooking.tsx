
import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, MapPin, Users, Plus, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBranches,
  addSlotBooking,
  getEmployeeSlotBookings,
  getBranchSlotBookings,
  updateBranchColors,
  type Branch,
  type SlotBooking as SlotBookingType
} from '@/services/slotBookingService';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const SlotBooking = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDateForBulk, setSelectedDateForBulk] = useState<Date>(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [approvedBookingsCount, setApprovedBookingsCount] = useState(0);
  const [employeeBookings, setEmployeeBookings] = useState<SlotBookingType[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<SlotBookingType[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [approvedBookingDates, setApprovedBookingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const currentBranch = branches.find(b => b.id === selectedBranch);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadEmployeeBookings();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedBranch) {
      loadApprovedBookingDates();
    }
  }, [selectedBranch]);

  useEffect(() => {
    filterBookingsByMonth();
  }, [employeeBookings, selectedMonth]);

  useEffect(() => {
    calculateApprovedBookings();
  }, [employeeBookings]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('SlotBooking: Loading initial slot booking data from Supabase...');
      
      // Update branch colors first to ensure they match the new scheme
      await updateBranchColors();
      
      const branchesData = await getBranches();
      setBranches(branchesData);
      
      console.log('SlotBooking: Loaded branches with colors:', branchesData);
    } catch (error) {
      console.error('SlotBooking: Error loading initial data:', error);
      toast.error('Failed to load slot booking data');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBookings = async () => {
    if (!user?.id) return;
    
    try {
      console.log('SlotBooking: Loading employee bookings for:', user.id);
      const bookings = await getEmployeeSlotBookings(user.id);
      setEmployeeBookings(bookings);
      
      console.log('SlotBooking: Employee bookings loaded:', bookings.length);
    } catch (error) {
      console.error('SlotBooking: Error loading employee bookings:', error);
    }
  };

  const loadApprovedBookingDates = async () => {
    if (!selectedBranch) return;
    
    try {
      console.log('SlotBooking: Loading approved bookings for branch:', selectedBranch);
      const branchBookings = await getBranchSlotBookings(selectedBranch);
      
      // Filter approved bookings and create a set of dates
      const approvedDates = new Set(
        branchBookings
          .filter(booking => booking.status === 'approved')
          .map(booking => booking.date)
      );
      
      setApprovedBookingDates(approvedDates);
      console.log('SlotBooking: Approved booking dates loaded:', approvedDates.size);
    } catch (error) {
      console.error('SlotBooking: Error loading approved booking dates:', error);
    }
  };

  const calculateApprovedBookings = () => {
    const currentMonth = new Date();
    const approvedThisMonth = employeeBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return booking.status === 'approved' &&
             bookingDate.getMonth() === currentMonth.getMonth() && 
             bookingDate.getFullYear() === currentMonth.getFullYear();
    });
    
    setApprovedBookingsCount(approvedThisMonth.length);
    console.log('SlotBooking: Approved bookings this month:', approvedThisMonth.length);
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
    
    // Disable past dates
    if (date < today) return true;
    
    // Disable dates with approved bookings for the selected branch
    const dateString = format(date, 'yyyy-MM-dd');
    return approvedBookingDates.has(dateString);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date is disabled
    if (isDateDisabled(date)) {
      toast.error("This date is not available for booking");
      return;
    }
    
    // For non-employee users, show bulk dialog
    if (user?.role !== 'employee') {
      setSelectedDateForBulk(date);
      setIsBulkDialogOpen(true);
      return;
    }

    // For employees, handle multiple date selection
    setSelectedDates(prevDates => {
      const dateString = format(date, 'yyyy-MM-dd');
      const existingIndex = prevDates.findIndex(d => format(d, 'yyyy-MM-dd') === dateString);
      
      if (existingIndex > -1) {
        // Remove date if already selected
        return prevDates.filter((_, index) => index !== existingIndex);
      } else {
        // Add date to selection
        return [...prevDates, date];
      }
    });
  };

  const handleBookSlots = async () => {
    if (selectedDates.length === 0 || !currentBranch) {
      toast.error("Please select at least one date and a branch");
      return;
    }

    setIsBooking(true);
    try {
      const bookingPromises = selectedDates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return addSlotBooking({
          employeeId: user?.id || 'CAS001',
          employeeName: user?.name || 'Current User',
          branchId: selectedBranch,
          branchName: currentBranch.name,
          date: dateStr,
          status: 'pending'
        });
      });

      const bookingIds = await Promise.all(bookingPromises);
      
      toast.success(`Successfully booked ${selectedDates.length} slot${selectedDates.length > 1 ? 's' : ''} at ${currentBranch.name}`);
      console.log('SlotBooking: Created bookings:', bookingIds);
      
      // Clear selected dates and reload bookings
      setSelectedDates([]);
      await Promise.all([
        loadEmployeeBookings(),
        loadApprovedBookingDates()
      ]);
    } catch (error) {
      console.error('SlotBooking: Error booking slots:', error);
      toast.error('Failed to book slots. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleBulkBookingSuccess = async () => {
    toast.success('Bulk slot bookings created successfully');
    await Promise.all([
      loadInitialData(),
      loadEmployeeBookings(),
      loadApprovedBookingDates()
    ]);
  };

  // Helper function to get branch color style
  const getBranchColorStyle = (color: string) => {
    return color || '#3b82f6'; // Default to blue if no color
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
          </div>
          
          {user?.role !== 'employee' && (
            <Button onClick={() => setIsBulkDialogOpen(true)} className={isMobile ? 'w-full' : ''}>
              <Plus className="w-4 h-4 mr-2" />
              Bulk Booking
            </Button>
          )}
        </div>

        {/* Single stats widget - My Approved Bookings */}
        <div className="grid gap-6 grid-cols-1">
          <Card>
            <CardContent className={isMobile ? 'p-4' : 'p-6'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>My Approved Bookings</p>
                  <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{approvedBookingsCount}</p>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>This month</p>
                </div>
                <CheckCircle className={`text-green-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for main content */}
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-12' : ''}`}>
            <TabsTrigger value="booking" className={isMobile ? 'text-sm' : ''}>Select Date & Branch</TabsTrigger>
            <TabsTrigger value="history" className={isMobile ? 'text-sm' : ''}>Booking History</TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="mt-6">
            <Card className={isMobile ? '' : 'min-w-0'}>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-lg' : ''}`}>
                  <CalendarIcon className="w-5 h-5" />
                  <span>Select Date & Branch</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>Branch</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getBranchColorStyle(branch.color) }}
                            ></div>
                            <span>{branch.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    Select Date{selectedDates.length > 0 ? 's' : ''} 
                    {selectedDates.length > 0 && (
                      <span className="text-blue-600 ml-2">
                        ({selectedDates.length} selected)
                      </span>
                    )}
                  </label>
                  <div className="flex justify-center w-full">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => {
                        if (user?.role !== 'employee') return;
                        setSelectedDates(dates || []);
                      }}
                      onDayClick={handleDateSelect}
                      className="rounded-md border w-full max-w-none"
                      disabled={isDateDisabled}
                      modifiers={{
                        booked: (date) => {
                          const dateString = format(date, 'yyyy-MM-dd');
                          return approvedBookingDates.has(dateString);
                        }
                      }}
                      modifiersStyles={{
                        booked: {
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          textDecoration: 'line-through',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Selected dates display */}
                {selectedDates.length > 0 && (
                  <div 
                    className={`rounded-lg ${isMobile ? 'p-3' : 'p-4'}`} 
                    style={{ 
                      backgroundColor: `${getBranchColorStyle(currentBranch?.color || '#3b82f6')}20`,
                      border: `1px solid ${getBranchColorStyle(currentBranch?.color || '#3b82f6')}40`
                    }}
                  >
                    <h3 className={`font-medium text-gray-900 mb-2 ${isMobile ? 'text-sm' : ''}`}>
                      Selected Dates ({selectedDates.length}):
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDates.map((date, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className={isMobile ? 'text-xs' : 'text-sm'}
                          style={{ 
                            backgroundColor: getBranchColorStyle(currentBranch?.color || '#3b82f6'),
                            color: 'white'
                          }}
                        >
                          {format(date, 'MMM dd, yyyy')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branch info */}
                {currentBranch && (
                  <div 
                    className={`rounded-lg ${isMobile ? 'p-3' : 'p-4'}`} 
                    style={{ 
                      backgroundColor: `${getBranchColorStyle(currentBranch.color)}20`,
                      border: `1px solid ${getBranchColorStyle(currentBranch.color)}40`
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full mt-1" 
                        style={{ backgroundColor: getBranchColorStyle(currentBranch.color) }}
                      ></div>
                      <div className="flex-1">
                        <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>{currentBranch.name}</h3>
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{currentBranch.address}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: '#fee2e2' }}></span>
                          Crossed out dates are already booked and approved
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Book button - only for employees */}
                {user?.role === 'employee' && (
                  <Button 
                    onClick={handleBookSlots} 
                    className="w-full"
                    disabled={selectedDates.length === 0 || !currentBranch || isBooking}
                    style={{ backgroundColor: getBranchColorStyle(currentBranch?.color || '#3b82f6') }}
                  >
                    {isBooking ? 'Booking...' : `Book ${selectedDates.length > 0 ? selectedDates.length : ''} Slot${selectedDates.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </CardContent>
            </Card>
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
                              <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>{format(new Date(booking.date), 'PPP')}</p>
                            </div>
                          </div>
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
        </Tabs>
      </div>

      <BulkSlotBookingDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        selectedDate={selectedDateForBulk}
        onSuccess={handleBulkBookingSuccess}
      />
    </ResponsiveLayout>
  );
};

export default SlotBooking;
