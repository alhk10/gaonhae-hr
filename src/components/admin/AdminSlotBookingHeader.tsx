import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SlotBooking } from '@/services/slotBookingService';

interface AdminSlotBookingHeaderProps {
  allBookings: SlotBooking[];
  onSettingsClick: () => void;
  onPendingApprovalsClick: () => void;
  autoRefreshActive: boolean;
}

const AdminSlotBookingHeader: React.FC<AdminSlotBookingHeaderProps> = ({
  allBookings,
  onSettingsClick,
  onPendingApprovalsClick,
  autoRefreshActive
}) => {
  const pendingCount = allBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Slot Booking</h1>
        {autoRefreshActive && (
          <p className="text-sm text-muted-foreground">Auto-refreshing every 30 seconds</p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPendingApprovalsClick}
          className="relative"
        >
          Pending Approvals
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={onSettingsClick}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminSlotBookingHeader;