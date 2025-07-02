import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Users, Clock, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBranches,
  addSlotBooking,
  getBookedSlotsForDate,
  getAvailableSlotsForDate,
  getEmployeeSlotBookings,
  type Branch,
  type SlotBooking as SlotBookingType
} from '@/services/slotBookingService';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const SlotBooking = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDateForBulk, setSelectedDateForBulk] = useState<Date>(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalAvailableSlots, setTotalAvailableSlots] = useState(0);
  const [employeeBookingsCount, setEmployeeBookingsCount] = useState(0);
  const [employeeBookings, setEmployeeBookings] = useState<SlotBookingType[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<SlotBookingType[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [availableSlots, setAvailableSlots] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookingStats, setBookingStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  const currentBranch = branches.find(b => b.id === selectedBranch);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedBranch) {
      updateSlotCounts();
    }
  }, [selectedDate, selectedBranch]);

  useEffect(() => {
    if (user?.id) {
      loadEmployeeBookings();
    }
  }, [user?.id]);

  useEffect(() => {
    filterBookingsByMonth();
  }, [employeeBookings, selectedMonth]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('SlotBooking: Loading initial slot booking data from Supabase...');
      
      const branchesData = await getBranches();
      setBranches(branchesData);
      
      console.log('SlotBooking: Loaded branches:', branchesData);
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
      
      // Calculate current month bookings
      const currentMonth = new Date();
      const currentMonthBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate.getMonth() === currentMonth.getMonth() && 
               bookingDate.getFullYear() === currentMonth.getFullYear();
      });
      
      setEmployeeBookingsCount(currentMonthBookings.length);
      
      // Calculate booking statistics
      const stats = {
        pending: bookings.filter(b => b.status === 'pending').length,
        approved: bookings.filter(b => b.status === 'approved').length,
        rejected: bookings.filter(b => b.status === 'rejected').length,
        total: bookings.length
      };
      setBookingStats(stats);
      
      console.log('SlotBooking: Employee bookings loaded:', { bookings: bookings.length, currentMonth: currentMonthBookings.length, stats });
    } catch (error) {
      console.error('SlotBooking: Error loading employee bookings:', error);
    }
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

  const updateSlotCounts = async () => {
    if (!selectedDate || !selectedBranch) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [available, booked] = await Promise.all([
        getAvailableSlotsForDate(dateStr, selectedBranch),
        getBookedSlotsForDate(dateStr, selectedBranch)
      ]);
      
      setAvailableSlots(available);
      setBookedSlots(booked);
      setTotalAvailableSlots(available); // Update this for the display
      
      console.log('SlotBooking: Updated slot counts:', { available, booked, date: dateStr, branch: selectedBranch });
    } catch (error) {
      console.error('SlotBooking: Error updating slot counts:', error);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedDate || !currentBranch) {
      toast.error("Please select a date and branch");
      return;
    }

    if (availableSlots <= 0) {
      toast.error("No slots available for this date");
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const newBookingId = await addSlotBooking({
        employeeId: user?.id || 'CAS001',
        employeeName: user?.name || 'Current User',
        branchId: selectedBranch,
        branchName: currentBranch.name,
        date: dateStr,
        status: 'pending'
      });

      toast.success(`Slot booked for ${format(selectedDate, 'PPP')} at ${currentBranch.name} (Booking ID: ${newBookingId})`);
      
      await Promise.all([
        updateSlotCounts(),
        loadEmployeeBookings()
      ]);
    } catch (error) {
      console.error('SlotBooking: Error booking slot:', error);
      toast.error('Failed to book slot. Please try again.');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      if (user?.role !== 'employee') {
        setSelectedDateForBulk(date);
        setIsBulkDialogOpen(true);
      }
    }
  };

  const handleBulkBookingSuccess = async () => {
    toast.success('Bulk slot bookings created successfully');
    await Promise.all([
      loadInitialData(),
      loadEmployeeBookings()
    ]);
    if (selectedDate && selectedBranch) {
      await updateSlotCounts();
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          <Card>
            <CardContent className={isMobile ? 'p-4' : 'p-6'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>Available Slots</p>
                  <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{totalAvailableSlots}</p>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Selected date</p>
                </div>
                <Clock className={`text-green-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={isMobile ? 'p-4' : 'p-6'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>My Bookings</p>
                  <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{employeeBookingsCount}</p>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>This month</p>
                </div>
                <Users className={`text-blue-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={isMobile ? 'p-4' : 'p-6'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-sm' : 'text-sm'}`}>Total Branches</p>
                  <p className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>{branches.length}</p>
                </div>
                <MapPin className={`text-purple-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Status Panel */}
        <Card>
          <CardHeader>
            <CardTitle className={isMobile ? 'text-lg' : ''}>Booking Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
              <div className={`flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg ${isMobile ? 'flex-col space-x-0 space-y-2 text-center' : ''}`}>
                <AlertCircle className={`text-yellow-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Pending</p>
                  <p className={`font-bold text-yellow-700 ${isMobile ? 'text-lg' : 'text-xl'}`}>{bookingStats.pending}</p>
                </div>
              </div>
              <div className={`flex items-center space-x-3 p-3 bg-green-50 rounded-lg ${isMobile ? 'flex-col space-x-0 space-y-2 text-center' : ''}`}>
                <CheckCircle className={`text-green-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Approved</p>
                  <p className={`font-bold text-green-700 ${isMobile ? 'text-lg' : 'text-xl'}`}>{bookingStats.approved}</p>
                </div>
              </div>
              <div className={`flex items-center space-x-3 p-3 bg-red-50 rounded-lg ${isMobile ? 'flex-col space-x-0 space-y-2 text-center' : ''}`}>
                <XCircle className={`text-red-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Rejected</p>
                  <p className={`font-bold text-red-700 ${isMobile ? 'text-lg' : 'text-xl'}`}>{bookingStats.rejected}</p>
                </div>
              </div>
              <div className={`flex items-center space-x-3 p-3 bg-blue-50 rounded-lg ${isMobile ? 'flex-col space-x-0 space-y-2 text-center' : ''}`}>
                <Users className={`text-blue-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <div>
                  <p className={`font-medium text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total</p>
                  <p className={`font-bold text-blue-700 ${isMobile ? 'text-lg' : 'text-xl'}`}>{bookingStats.total}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
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
                          <div className={`w-3 h-3 rounded-full ${branch.color}`}></div>
                          <span>{branch.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className={`block font-medium text-gray-700 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>Select Date</label>
                <div className="flex justify-center w-full">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="rounded-md border w-full max-w-none"
                    disabled={(date) => date < today}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={isMobile ? 'text-lg' : ''}>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentBranch && (
                <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-4 h-4 rounded-full ${currentBranch.color} mt-1`}></div>
                    <div className="flex-1">
                      <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>{currentBranch.name}</h3>
                      <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{currentBranch.address}</p>
                      <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Total daily slots: {currentBranch.totalSlots}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedDate && (
                <div className={`bg-blue-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <h3 className={`font-medium text-gray-900 mb-2 ${isMobile ? 'text-sm' : ''}`}>
                    Selected Date: {format(selectedDate, 'PPP')}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Available slots:</span>
                    <Badge variant="secondary">
                      {availableSlots} remaining
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Booked slots:</span>
                    <Badge variant="outline">
                      {bookedSlots} booked
                    </Badge>
                  </div>
                </div>
              )}

              {user?.role === 'employee' && (
                <Button 
                  onClick={handleBookSlot} 
                  className="w-full"
                  disabled={!selectedDate || !currentBranch || availableSlots <= 0}
                >
                  Book Slot
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking History */}
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
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className={`flex items-center justify-between bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-3'}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${branches.find(b => b.id === booking.branchId)?.color || 'bg-gray-500'}`}></div>
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
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center text-gray-500 ${isMobile ? 'py-6' : 'py-8'}`}>
                <p className={isMobile ? 'text-sm' : ''}>No bookings found for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>
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
