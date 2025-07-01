
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Users, Clock, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBranches,
  addSlotBooking,
  getBookedSlotsForDate,
  getAvailableSlotsForDate,
  getTotalSlotsStats,
  type Branch
} from '@/services/slotBookingService';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';

const SlotBooking = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDateForBulk, setSelectedDateForBulk] = useState<Date>(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalAvailableSlots, setTotalAvailableSlots] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentBranch = branches.find(b => b.id === selectedBranch);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedBranch) {
      updateSlotCounts();
    }
  }, [selectedDate, selectedBranch]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('SlotBooking: Loading initial slot booking data from Supabase...');
      
      const [branchesData, statsData] = await Promise.all([
        getBranches(),
        getTotalSlotsStats()
      ]);
      
      setBranches(branchesData);
      setTotalAvailableSlots(statsData.totalAvailableSlots);
      setTotalBookings(statsData.totalBookings);
      
      console.log('SlotBooking: Loaded branches:', branchesData);
      console.log('SlotBooking: Loaded stats:', statsData);
    } catch (error) {
      console.error('SlotBooking: Error loading initial data:', error);
      toast.error('Failed to load slot booking data');
    } finally {
      setLoading(false);
    }
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
      
      // Refresh slot counts and stats
      await updateSlotCounts();
      const statsData = await getTotalSlotsStats();
      setTotalAvailableSlots(statsData.totalAvailableSlots);
      setTotalBookings(statsData.totalBookings);
    } catch (error) {
      console.error('SlotBooking: Error booking slot:', error);
      toast.error('Failed to book slot. Please try again.');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // For admin users, open bulk booking dialog when clicking on calendar
      if (user?.role !== 'employee') {
        setSelectedDateForBulk(date);
        setIsBulkDialogOpen(true);
      }
    }
  };

  const handleBulkBookingSuccess = async () => {
    toast.success('Bulk slot bookings created successfully');
    // Refresh data
    await loadInitialData();
    if (selectedDate && selectedBranch) {
      await updateSlotCounts();
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Slot Booking</h2>
                <p className="text-gray-600">Book daily work slots for casual workers</p>
              </div>
              
              {user?.role !== 'employee' && (
                <Button onClick={() => setIsBulkDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Bulk Booking
                </Button>
              )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Slots</p>
                      <p className="text-2xl font-bold text-gray-900">{totalAvailableSlots}</p>
                      <p className="text-xs text-gray-500">This month</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Number of Bookings</p>
                      <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                      <p className="text-xs text-gray-500">This month</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Branches</p>
                      <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
                    </div>
                    <MapPin className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Branch Selection and Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Select Date & Branch</span>
                  </CardTitle>
                  <CardDescription>
                    {user?.role === 'employee' 
                      ? 'Choose your preferred work date and branch location'
                      : 'Click on a date to create bulk bookings for casual employees'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="rounded-md border"
                      disabled={(date) => date < today}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Details</CardTitle>
                  <CardDescription>
                    {user?.role === 'employee' 
                      ? 'Confirm your slot booking'
                      : 'View slot availability information'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentBranch && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className={`w-4 h-4 rounded-full ${currentBranch.color} mt-1`}></div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{currentBranch.name}</h3>
                          <p className="text-sm text-gray-600">{currentBranch.address}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Total daily slots: {currentBranch.totalSlots}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDate && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Selected Date: {format(selectedDate, 'PPP')}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Available slots:</span>
                        <Badge variant="secondary">
                          {availableSlots} remaining
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">Booked slots:</span>
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
          </div>

          <BulkSlotBookingDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            selectedDate={selectedDateForBulk}
            onSuccess={handleBulkBookingSuccess}
          />
        </main>
      </div>
    </div>
  );
};

export default SlotBooking;
