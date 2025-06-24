
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Users, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';

const SlotBooking = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedBranch, setSelectedBranch] = useState('singapore-office');

  // Branch configurations with different slot capacities
  const branches = [
    { 
      id: 'singapore-office', 
      name: 'Singapore Office', 
      address: '123 Marina Bay, Singapore',
      totalSlots: 8,
      color: 'bg-blue-500'
    },
    { 
      id: 'jurong-branch', 
      name: 'Jurong Branch', 
      address: '456 Jurong East, Singapore',
      totalSlots: 5,
      color: 'bg-green-500'
    },
    { 
      id: 'tampines-branch', 
      name: 'Tampines Branch', 
      address: '789 Tampines Central, Singapore',
      totalSlots: 6,
      color: 'bg-purple-500'
    },
  ];

  // Mock booking data - in real app this would come from backend
  const [bookings, setBookings] = useState([
    { date: '2024-12-23', branchId: 'singapore-office', bookedSlots: 3 },
    { date: '2024-12-24', branchId: 'singapore-office', bookedSlots: 5 },
    { date: '2024-12-23', branchId: 'jurong-branch', bookedSlots: 2 },
    { date: '2024-12-25', branchId: 'tampines-branch', bookedSlots: 4 },
  ]);

  const currentBranch = branches.find(b => b.id === selectedBranch);
  
  const getBookedSlotsForDate = (date: string, branchId: string) => {
    const booking = bookings.find(b => b.date === date && b.branchId === branchId);
    return booking ? booking.bookedSlots : 0;
  };

  const getAvailableSlotsForDate = (date: string, branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    const bookedSlots = getBookedSlotsForDate(date, branchId);
    return branch ? branch.totalSlots - bookedSlots : 0;
  };

  const handleBookSlot = () => {
    if (!selectedDate || !currentBranch) {
      toast("Please select a date and branch");
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const availableSlots = getAvailableSlotsForDate(dateStr, selectedBranch);
    
    if (availableSlots <= 0) {
      toast("No slots available for this date");
      return;
    }

    // Update bookings
    setBookings(prev => {
      const existingBooking = prev.find(b => b.date === dateStr && b.branchId === selectedBranch);
      if (existingBooking) {
        return prev.map(b => 
          b.date === dateStr && b.branchId === selectedBranch 
            ? { ...b, bookedSlots: b.bookedSlots + 1 }
            : b
        );
      } else {
        return [...prev, { date: dateStr, branchId: selectedBranch, bookedSlots: 1 }];
      }
    });

    toast(`Slot booked for ${format(selectedDate, 'PPP')} at ${currentBranch.name}`);
  };

  const totalAvailableSlots = branches.reduce((acc, branch) => {
    if (!selectedDate) return acc;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return acc + getAvailableSlotsForDate(dateStr, branch.id);
  }, 0);

  const totalBookedToday = bookings
    .filter(b => b.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((acc, b) => acc + b.bookedSlots, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Slot Booking</h2>
              <p className="text-gray-600">Book daily work slots for casual workers</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Today</p>
                      <p className="text-2xl font-bold text-gray-900">{totalAvailableSlots}</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Booked Today</p>
                      <p className="text-2xl font-bold text-gray-900">{totalBookedToday}</p>
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
                  <CardDescription>Choose your preferred work date and branch location</CardDescription>
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
                      onSelect={setSelectedDate}
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
                  <CardDescription>Confirm your slot booking</CardDescription>
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
                          {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd'), selectedBranch)} remaining
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">Booked slots:</span>
                        <Badge variant="outline">
                          {getBookedSlotsForDate(format(selectedDate, 'yyyy-MM-dd'), selectedBranch)} booked
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleBookSlot} 
                    className="w-full"
                    disabled={!selectedDate || !currentBranch || getAvailableSlotsForDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', selectedBranch) <= 0}
                  >
                    Book Slot
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Branch Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Overview</CardTitle>
                <CardDescription>Daily slot capacity across all branches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {branches.map((branch) => {
                    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                    const availableSlots = getAvailableSlotsForDate(dateStr, branch.id);
                    const bookedSlots = getBookedSlotsForDate(dateStr, branch.id);
                    const percentage = branch.totalSlots > 0 ? (bookedSlots / branch.totalSlots) * 100 : 0;

                    return (
                      <div key={branch.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className={`w-4 h-4 rounded-full ${branch.color} mt-1`}></div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{branch.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{branch.address}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Available: {availableSlots}</span>
                                <span>Booked: {bookedSlots}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${branch.color}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500">
                                {branch.totalSlots} total slots
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SlotBooking;
