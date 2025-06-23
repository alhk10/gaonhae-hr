
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Settings, Users, ArrowLeftRight, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const CasualEmployeesBooking = () => {
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const branches = ['Main Branch', 'East Branch', 'West Branch', 'North Branch'];
  
  const [branchTimeSlots, setBranchTimeSlots] = useState({
    'Main Branch': {
      Monday: ['09:00-17:00', '13:00-21:00', '17:00-01:00'],
      Tuesday: ['09:00-17:00', '13:00-21:00', '17:00-01:00'],
      Wednesday: ['09:00-17:00', '13:00-21:00'],
      Thursday: ['09:00-17:00', '13:00-21:00', '17:00-01:00'],
      Friday: ['09:00-17:00', '13:00-21:00'],
      Saturday: ['09:00-17:00', '13:00-21:00'],
      Sunday: ['09:00-17:00']
    },
    'East Branch': {
      Monday: ['08:00-16:00', '12:00-20:00'],
      Tuesday: ['08:00-16:00', '12:00-20:00'],
      Wednesday: ['08:00-16:00', '12:00-20:00'],
      Thursday: ['08:00-16:00', '12:00-20:00'],
      Friday: ['08:00-16:00', '12:00-20:00'],
      Saturday: ['09:00-17:00'],
      Sunday: ['09:00-17:00']
    },
    'West Branch': {
      Monday: ['10:00-18:00', '14:00-22:00'],
      Tuesday: ['10:00-18:00', '14:00-22:00'],
      Wednesday: ['10:00-18:00', '14:00-22:00'],
      Thursday: ['10:00-18:00', '14:00-22:00'],
      Friday: ['10:00-18:00', '14:00-22:00'],
      Saturday: ['10:00-18:00'],
      Sunday: ['10:00-18:00']
    },
    'North Branch': {
      Monday: ['09:00-17:00', '17:00-01:00'],
      Tuesday: ['09:00-17:00', '17:00-01:00'],
      Wednesday: ['09:00-17:00'],
      Thursday: ['09:00-17:00', '17:00-01:00'],
      Friday: ['09:00-17:00', '17:00-01:00'],
      Saturday: ['09:00-17:00'],
      Sunday: []
    }
  });

  const [weeklySlots, setWeeklySlots] = useState({
    Monday: 3,
    Tuesday: 3,
    Wednesday: 3,
    Thursday: 3,
    Friday: 3,
    Saturday: 2,
    Sunday: 1
  });

  const [bookings, setBookings] = useState([
    { id: 1, date: '2024-12-23', employee: 'Alice Tan', time: '09:00-17:00', branch: 'Main Branch' },
    { id: 2, date: '2024-12-23', employee: 'Bob Lim', time: '13:00-21:00', branch: 'East Branch' },
    { id: 3, date: '2024-12-24', employee: 'Carol Ng', time: '09:00-17:00', branch: 'West Branch' },
  ]);

  const casualEmployees = ['Alice Tan', 'Bob Lim', 'Carol Ng', 'David Lee', 'Emma Wong'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getCurrentMonthDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthDates = [];
    
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      monthDates.push({
        dayName: dayName,
        date: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('en-SG', { day: 'numeric' }),
        fullDate: new Date(date)
      });
    }
    
    return monthDates;
  };

  const monthDates = getCurrentMonthDates();

  const handleBooking = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBooking = {
      id: Date.now(),
      date: formData.get('date') as string,
      employee: formData.get('employee') as string,
      time: formData.get('timeSlot') as string,
      branch: formData.get('branch') as string
    };

    setBookings(prev => [...prev, newBooking]);
    setIsBookingDialogOpen(false);
    toast(`Booked ${newBooking.employee} for ${new Date(newBooking.date).toLocaleDateString()}`);
  };

  const handleQuickBooking = (date, timeSlot, branch) => {
    const newBooking = {
      id: Date.now(),
      date: date,
      employee: casualEmployees[0],
      time: timeSlot,
      branch: branch
    };

    setBookings(prev => [...prev, newBooking]);
    toast(`Quick booked ${newBooking.employee} for ${new Date(date).toLocaleDateString()}`);
  };

  const handleSwap = (bookingId) => {
    toast("Swap functionality would be implemented here");
  };

  const handleCancel = (bookingId) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    toast("Booking cancelled");
  };

  const handleCancelSlots = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const date = formData.get('cancelDate') as string;
    const branch = formData.get('cancelBranch') as string;
    
    const cancelledCount = bookings.filter(b => b.date === date && b.branch === branch).length;
    setBookings(prev => prev.filter(b => !(b.date === date && b.branch === branch)));
    setIsCancelDialogOpen(false);
    toast(`Cancelled ${cancelledCount} bookings for ${branch} on ${new Date(date).toLocaleDateString()}`);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSlots = {};
    days.forEach(day => {
      newSlots[day] = parseInt(formData.get(day.toLowerCase()) as string);
    });
    
    setWeeklySlots(newSlots as typeof weeklySlots);
    setIsSettingsDialogOpen(false);
    toast("Settings updated");
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(b => b.date === date);
  };

  const getMonthlyStats = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyBookings = bookings.filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });
    
    const totalSlots = monthDates.reduce((sum, day) => sum + (weeklySlots[day.dayName] || 0), 0);
    const filledSlots = monthlyBookings.length;
    
    return {
      workingEmployees: new Set(monthlyBookings.map(b => b.employee)).size,
      unfilledSlots: Math.max(0, totalSlots - filledSlots),
      totalBookings: monthlyBookings.length
    };
  };

  const monthlyStats = getMonthlyStats();

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
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
                <p className="text-gray-600">Manage casual employee work schedules by branch</p>
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
                      <DialogDescription>Book a casual employee for a work slot at a specific branch.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBooking}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="date">Date</Label>
                          <Input name="date" type="date" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="branch">Branch</Label>
                          <Select name="branch" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch} value={branch}>
                                  {branch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              {branchTimeSlots['Main Branch'].Monday.map((slot) => (
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

                <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Cancel Slots
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cancel Slots</DialogTitle>
                      <DialogDescription>Cancel all bookings for a specific date and branch.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCancelSlots}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="cancelDate">Date</Label>
                          <Input name="cancelDate" type="date" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="cancelBranch">Branch</Label>
                          <Select name="cancelBranch" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch} value={branch}>
                                  {branch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Cancel Slots</Button>
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
                      <DialogDescription>Adjust daily slots for each day of the week.</DialogDescription>
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
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() =>setIsSettingsDialogOpen(false)}>
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
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Monthly Schedule - {currentMonth.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Monthly casual employee bookings across all branches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 max-h-96 overflow-y-auto">
                  {monthDates.map((dayInfo) => (
                    <div key={dayInfo.date} className="border rounded-lg p-2">
                      <div className="text-center mb-2">
                        <h3 className="font-semibold text-sm">{dayInfo.displayDate}</h3>
                        <p className="text-xs text-gray-600">{dayInfo.dayName}</p>
                      </div>
                      <div className="space-y-1">
                        {getBookingsForDate(dayInfo.date).map((booking) => (
                          <div key={booking.id} className="bg-blue-50 p-1 rounded text-xs">
                            <p className="font-medium truncate">{booking.employee}</p>
                            <p className="text-gray-600 truncate">{booking.branch}</p>
                            <p className="text-gray-600">{booking.time}</p>
                            <div className="flex space-x-1 mt-1">
                              <Button size="sm" variant="outline" className="h-4 w-4 p-0" onClick={() => handleSwap(booking.id)}>
                                <ArrowLeftRight className="w-2 h-2" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-4 w-4 p-0" onClick={() => handleCancel(booking.id)}>
                                <X className="w-2 h-2" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Casual Employees Working This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{monthlyStats.workingEmployees}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Slots Not Filled This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{monthlyStats.unfilledSlots}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{monthlyStats.totalBookings}</p>
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
