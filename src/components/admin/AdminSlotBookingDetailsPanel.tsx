import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { SlotBooking, WeeklySlotConfig } from '@/services/slotBookingService';
import { Check, X, Edit, Clock, MapPin, User, Calendar } from 'lucide-react';

interface AdminSlotBookingDetailsPanelProps {
  selectedDate: Date;
  bookings: SlotBooking[];
  weeklySlotConfig: { [branchId: string]: WeeklySlotConfig };
  onApprovalClick: (booking: SlotBooking, event: React.MouseEvent) => void;
  onCancelClick: (booking: SlotBooking) => void;
  onCreateBooking: () => void;
  selectedBranch: string;
}

const AdminSlotBookingDetailsPanel: React.FC<AdminSlotBookingDetailsPanelProps> = ({
  selectedDate,
  bookings,
  weeklySlotConfig,
  onApprovalClick,
  onCancelClick,
  onCreateBooking,
  selectedBranch
}) => {
  const getSlotSummary = () => {
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek] as keyof WeeklySlotConfig;

    let totalSlots = 0;
    if (selectedBranch === 'all') {
      Object.values(weeklySlotConfig).forEach(config => {
        totalSlots += Number(config[dayName]) || 0;
      });
    } else {
      const branchConfig = weeklySlotConfig[selectedBranch];
      totalSlots = branchConfig ? Number(branchConfig[dayName]) || 0 : 0;
    }

    const approvedCount = bookings.filter(b => b.status === 'approved').length;
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const availableSlots = Math.max(0, totalSlots - bookings.length);

    return { totalSlots, approvedCount, pendingCount, availableSlots };
  };

  const { totalSlots, approvedCount, pendingCount, availableSlots } = getSlotSummary();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {format(selectedDate, 'EEEE, MMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-foreground">{approvedCount}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-orange-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Available slots:</span>
          <span className="font-medium">{availableSlots} of {totalSlots}</span>
        </div>

        <Separator />

        {/* Create New Booking Button */}
        <Button onClick={onCreateBooking} className="w-full" size="sm">
          Create New Booking
        </Button>

        <Separator />

        {/* Bookings List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Bookings ({bookings.length})
          </h4>
          
          {bookings.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              No bookings for this date
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-3 hover:shadow-sm transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{booking.employeeName}</span>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {booking.branchName}
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-green-600 hover:bg-green-50 border-green-200"
                          onClick={(e) => onApprovalClick(booking, e)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={(e) => onApprovalClick(booking, e)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {booking.status === 'approved' && (
                      <div className="flex gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={(e) => onApprovalClick(booking, e)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => onCancelClick(booking)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSlotBookingDetailsPanel;