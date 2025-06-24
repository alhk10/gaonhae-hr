
import React, { useState } from 'react';
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
import { Calendar as CalendarIcon, Plus, Settings, Users, Check, X, Edit, Trash, Filter } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const AdminSlotBooking = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
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
    { id: 1, date: '2024-12-23', employee: 'Alice Tan', branchId: 'headquarters', status: 'pending' },
    { id: 2, date: '2024-12-23', employee: 'Bob Lim', branchId: 'headquarters', status: 'approved' },
    { id: 3, date: '2024-12-24', employee: 'Carol Ng', branchId: 'balmoral', status: 'approved' },
    { id: 4, date: '2024-12-25', employee: 'David Lee', branchId: 'jurong-west', status: 'pending' },
    { id: 5, date: '2024-12-26', employee: 'Emma Wong', branchId: 'kembangan', status: 'rejected' },
  ]);

  const casualEmployees = ['Alice Tan', 'Bob Lim', 'Carol Ng', 'David Lee', 'Emma Wong'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => 
      b.date === dateString && 
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
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
      const dayName = format(day, 'EEEE');
      
      if (selectedBranch === 'all') {
        branches.forEach(branch => {
          totalSlots += weeklySlots[branch.id]?.[dayName] || 0;
        });
      } else {
        totalSlots += weeklySlots[selectedBranch]?.[dayName] || 0;
      }
      
      bookedSlots += dayBookings.length;
      pendingSlots += dayBookings.filter(b => b.status === 'pending').length;
      approvedSlots += dayBookings.filter(b => b.status === 'approved').length;
    });

    return { totalSlots, bookedSlots, pendingSlots, approvedSlots, availableSlots: totalSlots - bookedSlots };
  };

  const handleBooking = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBooking = {
      id: Date.now(),
      date: formData.get('date') as string,
      employee: formData.get('employee') as string,
      branchId: formData.get('branch') as string,
      status: 'pending'
    };

    setBookings(prev => [...prev, newBooking]);
    setIsBookingDialogOpen(false);
    toast(`Booked ${newBooking.employee} for ${new Date(newBooking.date).toLocaleDateString()}`);
  };

  const handleApproval = (bookingId: number, status: 'approved' | 'rejected') => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status } : b
    ));
    toast(`Booking ${status}`);
  };

  const handleEdit = (bookingId: number) => {
    toast("Edit functionality would be implemented here");
  };

  const handleRemove = (bookingId: number) => {
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

            {/* Branch Filter */}
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
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Calendar */}
                  <div className="lg:col-span-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="w-full border rounded-md"
                      components={{
                        Day: ({ date, ...props }) => {
                          const dayBookings = getBookingsForDate(date);
                          const hasBookings = dayBookings.length > 0;
                          const hasPending = dayBookings.some(b => b.status === 'pending');
                          
                          return (
                            <div className="relative w-full h-full">
                              <button
                                {...props}
                                className={`w-full h-full p-2 text-sm hover:bg-accent rounded-md ${
                                  isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                                } ${hasBookings ? 'bg-blue-50' : ''}`}
                              >
                                <div className="flex flex-col items-center space-y-1">
                                  <span>{date.getDate()}</span>
                                  {hasBookings && (
                                    <div className="flex flex-wrap gap-1">
                                      {dayBookings.slice(0, 3).map((booking, idx) => (
                                        <div
                                          key={idx}
                                          className={`w-2 h-2 rounded-full ${
                                            booking.status === 'approved' ? 'bg-green-500' :
                                            booking.status === 'pending' ? 'bg-yellow-500' :
                                            'bg-red-500'
                                          }`}
                                        />
                                      ))}
                                      {dayBookings.length > 3 && (
                                        <span className="text-xs">+{dayBookings.length - 3}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        }
                      }}
                    />
                  </div>

                  {/* Selected Date Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getBookingsForDate(selectedDate).length} booking(s) scheduled
                      </p>
                    </div>

                    <div className="space-y-3">
                      {getBookingsForDate(selectedDate).map((booking) => {
                        const branch = branches.find(b => b.id === booking.branchId);
                        return (
                          <Card key={booking.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${branch?.color}`}></div>
                                <div>
                                  <p className="font-medium text-sm">{booking.employee}</p>
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
                                      onClick={() => handleApproval(booking.id, 'approved')}
                                    >
                                      <Check className="w-3 h-3 text-green-600" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleApproval(booking.id, 'rejected')}
                                    >
                                      <X className="w-3 h-3 text-red-600" />
                                    </Button>
                                  </>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEdit(booking.id)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleRemove(booking.id)}
                                >
                                  <Trash className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}

                      {getBookingsForDate(selectedDate).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No bookings for this date
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
