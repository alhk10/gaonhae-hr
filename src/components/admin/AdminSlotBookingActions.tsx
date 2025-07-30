import React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock, Clock, Settings, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { SlotBooking } from '@/services/slotBookingService';

interface AdminSlotBookingActionsProps {
  allBookings: SlotBooking[];
  isMobile: boolean;
  onPendingApprovalsClick: () => void;
  onSettingsClick: () => void;
  onRefreshData: () => void;
}

const AdminSlotBookingActions: React.FC<AdminSlotBookingActionsProps> = ({
  allBookings,
  isMobile,
  onPendingApprovalsClick,
  onSettingsClick,
  onRefreshData
}) => {
  return (
    <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row flex-wrap'}`}>
      
      <Button 
        variant="outline" 
        className={`${isMobile ? 'flex-1' : ''} relative`}
        onClick={onPendingApprovalsClick}
      >
        <Clock className="w-4 h-4 mr-2" />
        Pending Approvals
        {allBookings.filter(b => b.status === 'pending').length > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 text-xs min-w-[20px] h-[20px] flex items-center justify-center">
            {allBookings.filter(b => b.status === 'pending').length}
          </Badge>
        )}
      </Button>
      
      <Button
        variant="outline"
        className={isMobile ? 'flex-1' : ''}
        onClick={onSettingsClick}
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
    </div>
  );
};

export default AdminSlotBookingActions;