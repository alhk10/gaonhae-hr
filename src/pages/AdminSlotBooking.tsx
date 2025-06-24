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
import { Calendar as CalendarIcon, Plus, Settings, Users, Check, X, Edit, Trash, Filter, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const AdminSlotBooking = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [selectedBookingForSwap, setSelectedBookingForSwap] = useState<any>(null);
  
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

  const getAvailableSlotsForDate = (date: Date, branchId: string) => {
    const dayName = format(date, 'EEEE');
    const dateString = format(date, 'yyyy-MM-dd');
    const bookedSlots = bookings.filter(b => b.date === dateString && b.branchId === branchId).length;
    const totalSlots = weeklySlots[branchId]?.[dayName] || 0;
    return Math.max(0, totalSlots - bookedSlots);
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => 
      b.date === dateString && 
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setQuickAddDate(date);
    setIsBookingDialogOpen(true);
  };

  const handleEmployeeClick = (booking: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForSwap(booking);
    setIsSwapDialogOpen(true);
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
    const selectedDate = formData.get('date') as string;
    const selectedBranch = formData.get('branch') as string;
    const selectedEmployee = formData.get('employee') as string;

    // Check if slot is available
    const dateObj = new Date(selectedDate);
    const availableSlots = getAvailableSlotsForDate(dateObj, selectedBranch);
    
    if (availableSlots <= 0) {
      toast("No slots available for this date and branch");
      return;
    }

    const newBooking = {
      id: Date.now(),
      date: selectedDate,
      employee: selectedEmployee,
      branchId: selectedBranch,
      status: 'pending'
    };

    setBookings(prev => [...prev, newBooking]);
    setIsBookingDialogOpen(false);
    setQuickAddDate(null);
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

  const handleSwapBooking = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newEmployee = formData.get('employee') as string;
    const newBranch = formData.get('branch') as string;
    
    if (selectedBookingForSwap) {
      setBookings(prev => prev.map(b => 
        b.id === selectedBookingForSwap.id 
          ? { ...b, employee: newEmployee, branchId: newBranch }
          : b
      ));
      setIsSwapDialogOpen(false);
      setSelectedBookingForSwap(null);
      toast(`Booking swapped to ${newEmployee}`);
    }
  };

  const handleCancelBooking = () => {
    if (selectedBookingForSwap) {
      setBookings(prev => prev.filter(b => b.id !== selectedBookingForSwap.id));
      setIsSwapDialogOpen(false);
      setSelectedBookingForSwap(null);
      toast("Booking cancelled");
    }
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
                <Dialog open={isBookingDialogOpen} onOpenChange={(open) => {
                  setIsBookingDialogOpen(open);
                  if (!open) setQuickAddDate(null);
                }}>
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
                          <Input 
                            name="date" 
                            type="date" 
                            defaultValue={quickAddDate ? format(quickAddDate, 'yyyy-MM-dd') : ''}
                            required 
                          />
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
                        <Button type="button" variant="outline" onClick={() => {
                          setIsBookingDialogOpen(false);
                          setQuickAddDate(null);
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Booking</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Swap/Cancel Dialog */}
                <Dialog open={isSwapDialogOpen} onOpenChange={(open) => {
                  setIsSwapDialogOpen(open);
                  if (!open) setSelectedBookingForSwap(null);
                }}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Manage Booking</DialogTitle>
                      <DialogDescription>
                        {selectedBookingForSwap && 
                          `Managing booking for ${selectedBookingForSwap.employee} on ${new Date(selectedBookingForSwap.date).toLocaleDateString()}`
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSwapBooking}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Swap Employee</Label>
                          <Select name="employee" defaultValue={selectedBookingForSwap?.employee} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select new employee" />
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
                          <Label htmlFor="branch">Swap Branch</Label>
                          <Select name="branch" defaultValue={selectedBookingForSwap?.branchId} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select new branch" />
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
                      </div>
                      <DialogFooter className="flex justify-between">
                        <Button type="button" variant="destructive" onClick={handleCancelBooking}>
                          Cancel Booking
                        </Button>
                        <div className="flex space-x-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setIsSwapDialogOpen(false);
                            setSelectedBookingForSwap(null);
                          }}>
                            Close
                          </Button>
                          <Button type="submit">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Swap Booking
                          </Button>
                        </div>
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

            {/* Branch Filter and Larger Calendar */}
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
                                          onClick={(e) => handleEmployeeClick(booking, e)}
                                          className={`text-xs px-1 py-0.5 rounded text-white truncate hover:opacity-80 transition-opacity cursor-pointer ${branch?.color || 'bg-gray-500'}`}
                                          title={`${booking.employee} - ${branch?.name} (${booking.status})`}
                                        >
                                          {booking.employee.split(' ')[0]}
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
