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
  const handleFixEldonBooking = async () => {
    try {
      const { data, error } = await supabase.rpc('force_book_eldon_slots');
      if (error) throw error;
      
      const result = data as { success: boolean; bookings_created?: number; error?: string };
      if (result.success) {
        toast.success(`✅ Emergency booking created for Eldon at Jurong West on Aug 16, 2025`);
        onRefreshData();
      } else {
        toast.error(`❌ ${result.error || 'Failed to create booking'}`);
      }
    } catch (error) {
      console.error('Error fixing Eldon booking:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const handleFixRyanBooking = async () => {
    try {
      const { data, error } = await supabase.rpc('force_book_ryan_slots');
      if (error) throw error;
      
      const result = data as { bookings_created: number; duplicates_skipped: number; total_requested: number };
      toast.success(`✅ Ryan's bookings processed: ${result.bookings_created} created, ${result.duplicates_skipped} duplicates skipped`);
      onRefreshData();
    } catch (error) {
      console.error('Error fixing Ryan booking:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row flex-wrap'}`}>
      <Button 
        variant="outline" 
        className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
        onClick={handleFixEldonBooking}
      >
        🆘 Fix Eldon's Booking
      </Button>
      
      <Button 
        variant="outline" 
        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        onClick={handleFixRyanBooking}
      >
        🚀 Fix Ryan's Booking
      </Button>
      
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