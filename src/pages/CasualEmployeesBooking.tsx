
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Settings, Users, ArrowLeftRight, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/utils/dateFormat';

const CasualEmployeesBooking = () => {
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState({
    Monday: 3,
    Tuesday: 3,
    Wednesday: 3,
    Thursday: 3,
    Friday: 3,
    Saturday: 2,
    Sunday: 1
  });

  const [timeSlots, setTimeSlots] = useState(['09:00-17:00', '13:00-21:00', '17:00-01:00']);

  const [bookings, setBookings] = useState([
    { id: 1, date: '2024-12-23', employee: 'Alice Tan', time: '09:00-17:00' },
    { id: 2, date: '2024-12-23', employee: 'Bob Lim', time: '13:00-21:00' },
    { id: 3, date: '2024-12-24', employee: 'Carol Ng', time: '09:00-17:00' },
  ]);

  const casualEmployees = ['Alice Tan', 'Bob Lim', 'Carol Ng', 'David Lee', 'Emma Wong'];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getCurrentWeekDates = () => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const weekDates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        dayName: days[i],
        date: date.toISOString().split('T')[0],
        displayDate:formatDate( date)
      });
    }
    
    return weekDates;
  };

  const weekDates = getCurrentWeekDates();

  const handleBooking = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBooking = {
      id: Date.now(),
      date: formData.get('date') as string,
      employee: formData.get('employee') as string,
      time: formData.get('timeSlot') as string
    };

    setBookings(prev => [...prev, newBooking]);
    setIsBookingDialogOpen(false);
    toast(`Booked ${newBooking.employee} for ${formatDate(new Date(newBooking.date))}`);
  };

  const handleQuickBooking = (date, timeSlot) => {
    const newBooking = {
      id: Date.now(),
      date: date,
      employee: casualEmployees[0], // Default to first available employee
      time: timeSlot
    };

    setBookings(prev => [...prev, newBooking]);
    toast(`Quick booked ${newBooking.employee} for ${formatDate(new Date(date))}`);
  };

  const handleSwap = (bookingId) => {
    toast("Swap functionality would be implemented here");
  };

  const handleCancel = (bookingId) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    toast("Booking cancelled");
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSlots = {};
    days.forEach(day => {
      newSlots[day] = parseInt(formData.get(day.toLowerCase()) as string);
    });
    
    // Update time slots
    const newTimeSlots = [];
    const timeSlotsData = formData.getAll('timeSlots');
    timeSlotsData.forEach((slot) => {
      if (slot.toString().trim()) {
        newTimeSlots.push(slot.toString().trim());
      }
    });
    
    setWeeklySlots(newSlots as typeof weeklySlots);
    setTimeSlots(newTimeSlots.length > 0 ? newTimeSlots : timeSlots);
    setIsSettingsDialogOpen(false);
    toast("Settings updated");
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(b => b.date === date);
  };

  const getAvailableSlots = (date, dayName) => {
    const currentBookings = getBookingsForDate(date);
    const maxSlots = weeklySlots[dayName] || 0;
    return maxSlots - currentBookings.length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Casual Employees Booking</h2>
                <p className="text-gray-600">Manage casual employee work schedules</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Booking
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Booking</DialogTitle>
                      <DialogDescription>Book a casual employee for a work slot.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBooking}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="date">Date</Label>
                          <Input name="date" type="date" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Employee</Label>
                          <Select name="employee" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {casualEmployees.map((employee) => (
                                <SelectItem key={employee} value={employee}>
                                  {employee}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="timeSlot">Time Slot</Label>
                          <Select name="timeSlot" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot}>
                                  {slot}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Booking</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Booking Settings</DialogTitle>
                      <DialogDescription>Adjust slots and time slots for each day.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSettings}>
                      <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                        <div>
                          <Label className="text-sm font-medium">Daily Slots</Label>
                          <div className="grid gap-2 mt-2">
                            {days.map((day) => (
                              <div key={day} className="grid grid-cols-2 gap-4 items-center">
                                <Label htmlFor={day.toLowerCase()}>{day}</Label>
                                <Input 
                                  name={day.toLowerCase()} 
                                  type="number" 
                                  min="0" 
                                  max="10" 
                                  defaultValue={weeklySlots[day]}
                                  required 
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Time Slots</Label>
                          <div className="grid gap-2 mt-2">
                            {timeSlots.map((slot, index) => (
                              <Input 
                                key={index}
                                name="timeSlots" 
                                defaultValue={slot}
                                placeholder="e.g., 09:00-17:00"
                              />
                            ))}
                            <Input 
                              name="timeSlots" 
                              placeholder="Add new time slot (e.g., 09:00-17:00)"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save Settings</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>This Week's Schedule</span>
                </CardTitle>
                <CardDescription>Current week casual employee bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {weekDates.map((dayInfo) => (
                    <div key={dayInfo.date} className="border rounded-lg p-4">
                      <div className="text-center mb-2">
                        <h3 className="font-semibold">{dayInfo.dayName}</h3>
                        <p className="text-sm text-gray-600">{dayInfo.displayDate}</p>
                        <p className="text-xs text-gray-500">
                          {getAvailableSlots(dayInfo.date, dayInfo.dayName)} slots available
                        </p>
                      </div>
                      <div className="space-y-2">
                        {getBookingsForDate(dayInfo.date).map((booking) => (
                          <div key={booking.id} className="bg-blue-50 p-2 rounded text-xs">
                            <p className="font-medium">{booking.employee}</p>
                            <p className="text-gray-600">{booking.time}</p>
                            <div className="flex space-x-1 mt-1">
                              <Button size="sm" variant="outline" onClick={() => handleSwap(booking.id)}>
                                <ArrowLeftRight className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleCancel(booking.id)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {getBookingsForDate(dayInfo.date).length === 0 && (
                          <div className="space-y-1">
                            <p className="text-gray-400 text-xs text-center">No bookings</p>
                            {timeSlots.slice(0, 2).map((slot) => (
                              <Button
                                key={slot}
                                size="sm"
                                variant="ghost"
                                className="w-full text-xs h-6"
                                onClick={() => handleQuickBooking(dayInfo.date, slot)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                {slot}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Available Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{casualEmployees.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{Object.values(weeklySlots).reduce((a, b) => a + b, 0)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CasualEmployeesBooking;
