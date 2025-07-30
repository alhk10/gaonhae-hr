import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { SlotBooking } from '@/services/slotBookingService';
import { CalendarIcon } from 'lucide-react';

interface AdminSlotBookingCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  allBookings: SlotBooking[];
  selectedBranch: string;
}

const AdminSlotBookingCalendar: React.FC<AdminSlotBookingCalendarProps> = ({
  selectedDate,
  onDateSelect,
  allBookings,
  selectedBranch
}) => {
  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(booking => 
      booking.date === dateString && 
      (selectedBranch === 'all' || booking.branchId === selectedBranch)
    );
  };

  const getBookingIndicators = (date: Date) => {
    const bookings = getBookingsForDate(date);
    if (bookings.length === 0) return null;

    const approvedCount = bookings.filter(b => b.status === 'approved').length;
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const rejectedCount = bookings.filter(b => b.status === 'rejected').length;

    return (
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
        {approvedCount > 0 && (
          <div className="w-2 h-2 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>
              {approvedCount}
            </span>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="w-2 h-2 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>
              {pendingCount}
            </span>
          </div>
        )}
        {rejectedCount > 0 && (
          <div className="w-2 h-2 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>
              {rejectedCount}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          {format(selectedDate, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md border-0"
          components={{
            Day: ({ date, ...props }) => {
              const indicators = getBookingIndicators(date);
              return (
                <div className="relative">
                  <button {...props}>
                    {format(date, 'd')}
                    {indicators}
                  </button>
                </div>
              );
            }
          }}
        />
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Status Legend</h4>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rejected</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSlotBookingCalendar;