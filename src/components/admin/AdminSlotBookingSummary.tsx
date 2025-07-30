import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotBooking, WeeklySlotConfig } from '@/services/slotBookingService';

interface AdminSlotBookingSummaryProps {
  allBookings: SlotBooking[];
  selectedBranch: string;
  weeklySlotConfig: WeeklySlotConfig[];
  currentMonth: Date;
}

const AdminSlotBookingSummary: React.FC<AdminSlotBookingSummaryProps> = ({
  allBookings,
  selectedBranch,
  weeklySlotConfig,
  currentMonth
}) => {
  const getSlotSummary = () => {
    const monthBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const monthMatch = bookingDate.getMonth() === currentMonth.getMonth() && 
                        bookingDate.getFullYear() === currentMonth.getFullYear();
      const branchMatch = selectedBranch === 'all' || booking.branchId === selectedBranch;
      return monthMatch && branchMatch;
    });

    const totalSlots = selectedBranch === 'all' 
      ? weeklySlotConfig.reduce((sum, config) => 
          sum + config.monday + config.tuesday + config.wednesday + 
          config.thursday + config.friday + config.saturday + config.sunday, 0) * 4 // Approximate monthly
      : (() => {
          const config = weeklySlotConfig.find(c => c.branchId === selectedBranch);
          return config 
            ? (config.monday + config.tuesday + config.wednesday + 
               config.thursday + config.friday + config.saturday + config.sunday) * 4
            : 0;
        })();

    const bookedCount = monthBookings.filter(b => b.status === 'approved').length;
    const pendingCount = monthBookings.filter(b => b.status === 'pending').length;
    const totalBookedAndPending = bookedCount + pendingCount;
    const availableSlots = Math.max(0, totalSlots - totalBookedAndPending);

    return {
      total: totalSlots,
      available: availableSlots,
      booked: bookedCount,
      pending: pendingCount,
      approved: bookedCount
    };
  };

  const summary = getSlotSummary();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{summary.available}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Booked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{summary.booked}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{summary.approved}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSlotBookingSummary;