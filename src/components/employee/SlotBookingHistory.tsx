/**
 * Slot Booking History Component
 * Displays the slot booking history for casual employees
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import { getEmployeeSlotBookings } from '@/services/slotBookingService';
import { format } from 'date-fns';

interface SlotBookingHistoryProps {
  employeeId: string;
  employeeName: string;
}

const SlotBookingHistory: React.FC<SlotBookingHistoryProps> = ({ employeeId, employeeName }) => {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['employee-slot-bookings', employeeId],
    queryFn: () => getEmployeeSlotBookings(employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    try {
      // Handle both ISO date strings and time strings
      if (timeString.includes('T')) {
        return format(new Date(timeString), 'HH:mm');
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Slot Booking History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Slot Booking History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No slot bookings found for {employeeName}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Pay Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 50).map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {formatDate(booking.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {booking.branch_name || booking.branch_id || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(booking.clock_in)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatTime(booking.clock_out)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.pay_amount ? (
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          S${Number(booking.pay_amount).toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {bookings.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing 50 of {bookings.length} bookings
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlotBookingHistory;
