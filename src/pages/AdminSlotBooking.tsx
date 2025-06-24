
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Settings, Users, ArrowLeftRight, X, Edit, Trash } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const AdminSlotBooking = () => {
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  
  // Branch configurations matching the Settings page
  const branches = [
    { 
      id: 'headquarters', 
      name: 'Headquarters', 
      address: '123 Business District, #12-34, Singapore 068123',
      totalSlots: 8,
      color: 'bg-blue-500'
    },
    { 
      id: 'balmoral', 
      name: 'Balmoral', 
      address: '456 Balmoral Road, #05-67, Singapore 259856',
      totalSlots: 5,
      color: 'bg-green-500'
    },
    { 
      id: 'jurong-west', 
      name: 'Jurong West', 
      address: '789 Jurong West Central, #08-90, Singapore 640789',
      totalSlots: 6,
      color: 'bg-purple-500'
    },
    { 
      id: 'kembangan', 
      name: 'Kembangan', 
      address: '321 Kembangan Road, #03-45, Singapore 419642',
      totalSlots: 4,
      color: 'bg-orange-500'
    },
    { 
      id: 'yishun', 
      name: 'Yishun', 
      address: '654 Yishun Ring Road, #07-12, Singapore 760654',
      totalSlots: 7,
      color: 'bg-red-500'
    },
    { 
      id: 'bukit-merah', 
      name: 'Bukit Merah', 
      address: '987 Bukit Merah Central, #04-56, Singapore 150987',
      totalSlots: 5,
      color: 'bg-indigo-500'
    },
  ];

  const [weeklySlots, setWeeklySlots] = useState({
    headquarters: { Monday: 8, Tuesday: 8, Wednesday: 8, Thursday: 8, Friday: 8, Saturday: 4, Sunday: 2 },
    balmoral: { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 },
    'jurong-west': { Monday: 6, Tuesday: 6, Wednesday: 6, Thursday: 6, Friday: 6, Saturday: 3, Sunday: 2 },
    kembangan: { Monday: 4, Tuesday: 4, Wednesday: 4, Thursday: 4, Friday: 4, Saturday: 2, Sunday: 1 },
    yishun: { Monday: 7, Tuesday: 7, Wednesday: 7, Thursday: 7, Friday: 7, Saturday: 4, Sunday: 2 },
    'bukit-merah': { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 }
  });

  const [bookings, setBookings] = useState([
    { id: 1, date: '2024-12-23', employee: 'Alice Tan', branchId: 'headquarters' },
    { id: 2, date: '2024-12-23', employee: 'Bob Lim', branchId: 'headquarters' },
    { id: 3, date: '2024-12-24', employee: 'Carol Ng', branchId: 'balmoral' },
    { id: 4, date: '2024-12-25', employee: 'David Lee', branchId: 'jurong-west' },
    { id: 5, date: '2024-12-26', employee: 'Emma Wong', branchId: 'kembangan' },
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
        displayDate: date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
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
      branchId: formData.get('branch') as string
    };

    setBookings(prev => [...prev, newBooking]);
    setIsBookingDialogOpen(false);
    toast(`Booked ${newBooking.employee} for ${new Date(newBooking.date).toLocaleDateString()}`);
  };

  const handleQuickBooking = (date, branchId) => {
    const newBooking = {
      id: Date.now(),
      date: date,
      employee: casualEmployees[0],
      branchId: branchId
    };

    setBookings(prev => [...prev, newBooking]);
    toast(`Quick booked ${newBooking.employee} for ${new Date(date).toLocaleDateString()}`);
  };

  const handleSwap = (bookingId) => {
    toast("Swap functionality would be implemented here");
  };

  const handleEdit = (bookingId) => {
    toast("Edit functionality would be implemented here");
  };

  const handleRemove = (bookingId) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    toast("Booking removed");
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSlots = {};
    
    branches.forEach(branch => {
      newSlots[branch.id] = {};
      days.forEach(day => {
        newSlots[branch.id][day] = parseInt(formData.get(`${branch.id}-${day.toLowerCase()}`) as string);
      });
    });
    
    setWeeklySlots(newSlots as typeof weeklySlots);
    setIsSettingsDialogOpen(false);
    toast("Booking settings updated");
  };

  const getBookingsForDate = (date, branchId = null) => {
    return bookings.filter(b => b.date === date && (branchId ? b.branchId === branchId : true));
  };

  const getAvailableSlots = (date, dayName, branchId) => {
    const currentBookings = getBookingsForDate(date, branchId);
    const maxSlots = weeklySlots[branchId]?.[dayName] || 0;
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
                <h2 className="text-2xl font-bold text-gray-900">Admin Slot Booking</h2>
                <p className="text-gray-600">Manage casual employee work schedules across all branches</p>
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
                          <Label htmlFor="branch">Branch</Label>
                          <Select name="branch" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name}
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
                      Booking Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Booking Settings</DialogTitle>
                      <DialogDescription>Adjust slots for each branch and day of the week.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSettings}>
                      <div className="grid gap-6 py-4 max-h-96 overflow-y-auto">
                        {branches.map((branch) => (
                          <div key={branch.id} className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-4 h-4 rounded-full ${branch.color}`}></div>
                              <h3 className="font-medium">{branch.name}</h3>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                              {days.map((day) => (
                                <div key={day} className="space-y-2">
                                  <Label className="text-xs">{day.slice(0, 3)}</Label>
                                  <Input 
                                    name={`${branch.id}-${day.toLowerCase()}`}
                                    type="number" 
                                    min="0" 
                                    max="20" 
                                    defaultValue={weeklySlots[branch.id]?.[day] || 0}
                                    className="text-center"
                                    required 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
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

            {/* All Bookings Overview */}
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Complete overview of all branch bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookings.map((booking) => {
                    const branch = branches.find(b => b.id === booking.branchId);
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${branch?.color}`}></div>
                          <div>
                            <p className="font-medium">{booking.employee}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.date).toLocaleDateString()} • {branch?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(booking.id)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSwap(booking.id)}>
                            <ArrowLeftRight className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRemove(booking.id)}>
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Calendar by Branch */}
            {branches.map((branch) => (
              <Card key={branch.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${branch.color}`}></div>
                    <span>{branch.name}</span>
                  </CardTitle>
                  <CardDescription>Weekly schedule for {branch.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-4">
                    {weekDates.map((dayInfo) => (
                      <div key={`${branch.id}-${dayInfo.date}`} className="border rounded-lg p-3">
                        <div className="text-center mb-2">
                          <h4 className="font-medium text-sm">{dayInfo.dayName}</h4>
                          <p className="text-xs text-gray-600">{dayInfo.displayDate}</p>
                          <p className="text-xs text-gray-500">
                            {getAvailableSlots(dayInfo.date, dayInfo.dayName, branch.id)} slots available
                          </p>
                        </div>
                        <div className="space-y-1">
                          {getBookingsForDate(dayInfo.date, branch.id).map((booking) => (
                            <div key={booking.id} className="bg-blue-50 p-2 rounded text-xs">
                              <p className="font-medium">{booking.employee}</p>
                              <div className="flex space-x-1 mt-1">
                                <Button size="sm" variant="outline" className="h-5 text-xs px-1" onClick={() => handleEdit(booking.id)}>
                                  <Edit className="w-2 h-2" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-5 text-xs px-1" onClick={() => handleSwap(booking.id)}>
                                  <ArrowLeftRight className="w-2 h-2" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-5 text-xs px-1" onClick={() => handleRemove(booking.id)}>
                                  <X className="w-2 h-2" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {getBookingsForDate(dayInfo.date, branch.id).length === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs h-6"
                              onClick={() => handleQuickBooking(dayInfo.date, branch.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

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
                  <CardTitle>Total Branches</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{branches.length}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
