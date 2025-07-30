import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SlotBooking, Branch } from '@/services/slotBookingService';
import { CalendarIcon, Plus, Filter } from 'lucide-react';

interface AdminSlotBookingCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  allBookings: SlotBooking[];
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  branches: Branch[];
  onCreateBooking: () => void;
}

const AdminSlotBookingCalendar: React.FC<AdminSlotBookingCalendarProps> = ({
  selectedDate,
  onDateSelect,
  allBookings,
  selectedBranch,
  onBranchChange,
  branches,
  onCreateBooking
}) => {
  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(booking => 
      booking.date === dateString && 
      (selectedBranch === 'all' || booking.branchId === selectedBranch)
    );
  };

  const getEmployeeBadgeColor = (employeeName: string) => {
    const colors = [
      'bg-orange-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 
      'bg-yellow-500', 'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500'
    ];
    const index = employeeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const renderEmployeeBadges = (date: Date) => {
    const bookings = getBookingsForDate(date);
    if (bookings.length === 0) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-1 space-y-1 z-10">
        {bookings.slice(0, 3).map((booking, index) => (
          <Badge
            key={booking.id}
            className={`${getEmployeeBadgeColor(booking.employeeName)} text-white text-xs px-1 py-0 h-5 w-full justify-center`}
          >
            {booking.employeeName} {booking.status === 'approved' && '✓'}
          </Badge>
        ))}
        {bookings.length > 3 && (
          <div className="text-xs text-muted-foreground text-center">
            +{bookings.length - 3} more
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Monthly Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={selectedBranch} onValueChange={onBranchChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md border-0 w-full"
          components={{
            Day: ({ date, ...props }) => {
              const bookings = getBookingsForDate(date);
              const hasBookings = bookings.length > 0;
              const dayOfMonth = format(date, 'd');
              
              return (
                <div className="relative min-h-[80px] p-1">
                  <button 
                    {...props}
                    className={`w-full h-full min-h-[80px] p-2 text-left border rounded ${
                      format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{dayOfMonth}</div>
                    <div className="mt-1 space-y-1">
                      {bookings.slice(0, 3).map((booking) => (
                        <Badge
                          key={booking.id}
                          className={`${getEmployeeBadgeColor(booking.employeeName)} text-white text-xs px-1 py-0 h-5 text-center block`}
                        >
                          {booking.employeeName} {booking.status === 'approved' && '✓'}
                        </Badge>
                      ))}
                      {bookings.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{bookings.length - 3} more
                        </div>
                      )}
                    </div>
                    {!hasBookings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 p-0 absolute bottom-1 right-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDateSelect(date);
                          onCreateBooking();
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </button>
                </div>
              );
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default AdminSlotBookingCalendar;