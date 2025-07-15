import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBranches,
  addSlotBooking,
  getEmployeeSlotBookings,
  getBranchSlotBookings,
  updateBranchColors,
  checkForExistingBooking,
  verifyEmployeeExists,
  getAvailableSlotsForDate,
  type Branch,
  type SlotBooking as SlotBookingType
} from '@/services/slotBookingService';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import EnhancedCalendar from '@/components/slot-booking/EnhancedCalendar';
import EnhancedBranchSelector from '@/components/slot-booking/EnhancedBranchSelector';
import SelectedDatesManager from '@/components/slot-booking/SelectedDatesManager';
import BookingActions from '@/components/slot-booking/BookingActions';
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
  const [employeeBookingDates, setEmployeeBookingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [employeeVerified, setEmployeeVerified] = useState<boolean | null>(null);
  const [isBranchDataLoading, setIsBranchDataLoading] = useState(false);

  const currentBranch = branches.find(b => b.id === selectedBranch);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadEmployeeBookings();
      verifyCurrentEmployee();
    }
  }, [user?.id]);

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
  }, [employeeBookings]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('SlotBooking: Loading initial slot booking data from Supabase...');
      
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

  const verifyCurrentEmployee = async () => {
    if (!user?.id) return;
    
    try {
      console.log('SlotBooking: Verifying current employee:', user.id);
      const verification = await verifyEmployeeExists(user.id);
      setEmployeeVerified(verification.exists);
      
      if (!verification.exists) {
        console.error('SlotBooking: Current user not found in employees table:', user.id);
        toast.error('Your employee record was not found. Please contact administrator.');
      } else {
        console.log('SlotBooking: Employee verified successfully:', verification.employeeName);
      }
    } catch (error) {
      console.error('SlotBooking: Error verifying employee:', error);
      setEmployeeVerified(false);
    }
  };

  const loadEmployeeBookings = async () => {
    if (!user?.id) return;
    
    try {
      console.log('SlotBooking: Loading employee bookings for:', user.id);
      const bookings = await getEmployeeSlotBookings(user.id);
      setEmployeeBookings(bookings);
      
      const employeeDates = new Set(
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
      
      const approvedDates = new Set(
        branchBookings
          .filter(booking => booking.status === 'approved')
          .map(booking => booking.date)
      );
      
      setApprovedBookingDates(approvedDates);
      console.log('SlotBooking: Approved booking dates loaded for branch', selectedBranch, ':', approvedDates.size);
      
      setSelectedDates([]);
    } catch (error) {
      console.error('SlotBooking: Error loading approved booking dates:', error);
      toast.error('Failed to load branch booking data');
    } finally {
      setIsBranchDataLoading(false);
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
    
    if (date < today) return true;
    
    const dateString = format(date, 'yyyy-MM-dd');
    if (employeeBookingDates.has(dateString)) return true;
    
    return false;
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    if (employeeVerified === false) {
      toast.error('Your employee record was not found. Please contact administrator before booking slots.');
      return;
    }
    
    if (isDateDisabled(date)) {
      const dateString = format(date, 'yyyy-MM-dd');
      if (employeeBookingDates.has(dateString)) {
        toast.error("You already have a booking on this date. Double bookings are not allowed.");
      } else {
        toast.error("This date is not available for booking");
      }
      return;
    }
    
    if (user?.role !== 'employee') {
      setSelectedDateForBulk(date);
      setIsBulkDialogOpen(true);
      return;
    }

    const dateString = format(date, 'yyyy-MM-dd');
    
    try {
      const availableSlots = await getAvailableSlotsForDate(dateString, selectedBranch);
      if (availableSlots <= 0) {
        toast.error(`No slots available for ${currentBranch?.name} on ${format(date, 'PPP')}. Please select a different date.`);
        return;
      }
    } catch (error) {
      console.error('SlotBooking: Error checking available slots:', error);
      toast.error('Error checking slot availability');
      return;
    }
    
    if (user?.id) {
      try {
        const hasExistingBooking = await checkForExistingBooking(user.id, dateString);
        if (hasExistingBooking) {
          toast.error("You already have a booking on this date. Double bookings are not allowed.");
          return;
        }
      } catch (error) {
        console.error('SlotBooking: Error checking existing booking:', error);
        toast.error("Error checking booking availability");
        return;
      }
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

    if (employeeVerified === false) {
      toast.error('Your employee record was not found. Please contact administrator before booking slots.');
      return;
    }

    setIsBooking(true);
    try {
      console.log('SlotBooking: Starting booking process for', selectedDates.length, 'dates');
      
      const bookingPromises = selectedDates.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        console.log('SlotBooking: Booking slot for date:', dateStr);
        
        return addSlotBooking({
          employeeId: user.id,
          employeeName: user.name,
          branchId: selectedBranch,
          branchName: currentBranch.name,
          date: dateStr,
          status: 'pending'
        });
      });

      const bookingIds = await Promise.all(bookingPromises);
      
      toast.success(`Successfully booked ${selectedDates.length} slot${selectedDates.length > 1 ? 's' : ''} at ${currentBranch.name}`);
      console.log('SlotBooking: Created bookings:', bookingIds);
      
      setSelectedDates([]);
      await Promise.all([
        loadEmployeeBookings(),
        loadApprovedBookingDates()
      ]);
    } catch (error) {
      console.error('SlotBooking: Error booking slots:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to book slots. Please try again.';
      toast.error(errorMessage);
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
          </div>
          
          {user?.role !== 'employee' && (
            <Button onClick={() => setIsBulkDialogOpen(true)} className={isMobile ? 'w-full' : ''}>
              <Plus className="w-4 h-4 mr-2" />
              Bulk Booking
            </Button>
          )}
        </div>

        {/* Stats Card */}
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

        {/* Tabs */}
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-12' : ''}`}>
            <TabsTrigger value="booking" className={isMobile ? 'text-sm' : ''}>Select Date & Branch</TabsTrigger>
            <TabsTrigger value="history" className={isMobile ? 'text-sm' : ''}>Booking History</TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="mt-6">
            {/* Enhanced 2-Column Layout with Dynamic Calendar */}
            <div className={`grid gap-6 h-[600px] ${isMobile ? 'grid-cols-1 h-auto' : 'grid-cols-5'}`}>
              {/* Left Column - Controls (40% width = 2/5) */}
              <div className={`${isMobile ? 'col-span-1' : 'col-span-2'} space-y-6 flex flex-col`}>
                <EnhancedBranchSelector
                  branches={branches}
                  selectedBranch={selectedBranch}
                  onBranchChange={handleBranchChange}
                  currentBranch={currentBranch}
                  isLoading={isBranchDataLoading}
                />
                
                <SelectedDatesManager
                  selectedDates={selectedDates}
                  onRemoveDate={handleRemoveDate}
                  onClearAll={handleClearAllDates}
                  branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                  branchName={currentBranch?.name || ''}
                />
                
                <BookingActions
                  selectedDates={selectedDates}
                  branchName={currentBranch?.name || ''}
                  branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                  isBooking={isBooking}
                  employeeVerified={employeeVerified}
                  onBookSlots={handleBookSlots}
                  onBulkBookingOpen={() => setIsBulkDialogOpen(true)}
                />
              </div>

              {/* Right Column - Calendar (60% width = 3/5) with Dynamic Stretching */}
              <div className={`${isMobile ? 'col-span-1 h-[500px]' : 'col-span-3 h-full'} flex flex-col`}>
                <EnhancedCalendar
                  selectedDates={selectedDates}
                  onDateSelect={handleDateSelect}
                  onDatesChange={setSelectedDates}
                  isDateDisabled={isDateDisabled}
                  approvedBookingDates={approvedBookingDates}
                  employeeBookingDates={employeeBookingDates}
                  branchColor={getBranchColorStyle(currentBranch?.color || '#3b82f6')}
                  isLoading={isBranchDataLoading}
                />
              </div>
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
