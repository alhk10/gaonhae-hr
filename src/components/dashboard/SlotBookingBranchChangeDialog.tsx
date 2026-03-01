import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createEditRequest } from '@/services/slotBookingEditRequestService';
import { getEmployeeSlotBookings, type SlotBooking } from '@/services/slotBookingService';
import { format } from 'date-fns';

interface SlotBookingBranchChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}

const SlotBookingBranchChangeDialog: React.FC<SlotBookingBranchChangeDialogProps> = ({
  open, onOpenChange, employeeId, employeeName
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['employee-upcoming-bookings', employeeId],
    queryFn: async () => {
      const allBookings = await getEmployeeSlotBookings(employeeId);
      const today = new Date().toISOString().split('T')[0];
      return allBookings.filter(
        (b: SlotBooking) => b.date >= today && (b.status === 'approved' || b.status === 'pending')
      );
    },
    enabled: open && !!employeeId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const selectedBooking = bookings.find((b: SlotBooking) => b.id === selectedBookingId);
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  const handleSubmit = async () => {
    if (!selectedBookingId || !selectedBranchId) {
      toast.error('Please select a booking and a branch');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEditRequest({
        bookingId: selectedBookingId,
        requestType: 'branch_change',
        requestedBy: employeeName,
        reason: reason || 'Branch change request',
        newBranchId: selectedBranchId,
        newBranchName: selectedBranch?.name || '',
      });
      toast.success('Branch change request submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
      setSelectedBookingId('');
      setSelectedBranchId('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting branch change request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Booking Branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Booking</Label>
            <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a booking..." />
              </SelectTrigger>
              <SelectContent>
                {bookings.map((booking: SlotBooking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {format(new Date(booking.date), 'dd MMM yyyy')} — {booking.branchName}
                    {booking.status === 'pending' ? ' (Pending)' : ''}
                  </SelectItem>
                ))}
                {bookings.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">No upcoming bookings</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedBooking && (
            <div className="text-sm text-muted-foreground">
              Current branch: <Badge variant="outline">{selectedBooking.branchName}</Badge>
            </div>
          )}

          <div>
            <Label>New Branch</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches
                  .filter(b => !selectedBooking || b.name !== selectedBooking.branchName)
                  .map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you want to change the branch?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedBookingId || !selectedBranchId}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlotBookingBranchChangeDialog;
