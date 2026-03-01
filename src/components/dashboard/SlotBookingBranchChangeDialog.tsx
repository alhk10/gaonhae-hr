import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createEditRequest } from '@/services/slotBookingEditRequestService';
import { getEmployeeSlotBookings, type SlotBooking } from '@/services/slotBookingService';
import { format, parseISO, isSameDay } from 'date-fns';
import { MapPin, ArrowRight } from 'lucide-react';

interface SlotBookingBranchChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}

const SlotBookingBranchChangeDialog: React.FC<SlotBookingBranchChangeDialogProps> = ({
  open, onOpenChange, employeeId, employeeName
}) => {
  const [selectedBooking, setSelectedBooking] = useState<SlotBooking | null>(null);
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

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, SlotBooking[]>();
    bookings.forEach((b: SlotBooking) => {
      const existing = map.get(b.date) || [];
      existing.push(b);
      map.set(b.date, existing);
    });
    return map;
  }, [bookings]);

  // Calendar modifiers
  const approvedDates = useMemo(() => 
    bookings.filter((b: SlotBooking) => b.status === 'approved').map((b: SlotBooking) => parseISO(b.date)),
    [bookings]
  );
  const pendingDates = useMemo(() => 
    bookings.filter((b: SlotBooking) => b.status === 'pending').map((b: SlotBooking) => parseISO(b.date)),
    [bookings]
  );

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayBookings = bookingsByDate.get(dateStr);
    if (dayBookings && dayBookings.length === 1) {
      setSelectedBooking(dayBookings[0]);
      setSelectedBranchId('');
      setReason('');
    } else if (dayBookings && dayBookings.length > 1) {
      // For multi-booking dates, select the first one; user can switch via list
      setSelectedBooking(dayBookings[0]);
      setSelectedBranchId('');
      setReason('');
    } else {
      setSelectedBooking(null);
    }
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  const handleSubmit = async () => {
    if (!selectedBooking || !selectedBranchId) {
      toast.error('Please select a booking and a branch');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEditRequest({
        bookingId: selectedBooking.id,
        requestType: 'branch_change',
        requestedBy: employeeName,
        reason: reason || 'Branch change request',
        newBranchId: selectedBranchId,
        newBranchName: selectedBranch?.name || '',
      });
      toast.success('Branch change request submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
      setSelectedBooking(null);
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

  const selectedDateBookings = selectedBooking 
    ? bookingsByDate.get(selectedBooking.date) || [] 
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>View & Edit Bookings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Monthly Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedBooking ? parseISO(selectedBooking.date) : undefined}
              onSelect={(day) => day && handleDayClick(day)}
              modifiers={{
                approved: approvedDates,
                pending: pendingDates,
              }}
              modifiersStyles={{
                approved: {
                  backgroundColor: 'hsl(var(--chart-2) / 0.2)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  color: 'hsl(var(--chart-2))',
                },
                pending: {
                  backgroundColor: 'hsl(var(--chart-4) / 0.2)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  color: 'hsl(var(--chart-4))',
                },
              }}
              className="pointer-events-auto"
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 justify-center text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.3)' }} />
              <span className="text-muted-foreground">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-4) / 0.3)' }} />
              <span className="text-muted-foreground">Pending</span>
            </div>
          </div>

          {/* Selected date bookings */}
          {selectedBooking && (
            <div className="space-y-3 border-t pt-3">
              {/* Multi-booking selector */}
              {selectedDateBookings.length > 1 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedDateBookings.map((b: SlotBooking, i: number) => (
                    <Button
                      key={b.id}
                      size="sm"
                      variant={b.id === selectedBooking.id ? 'default' : 'outline'}
                      onClick={() => { setSelectedBooking(b); setSelectedBranchId(''); }}
                      className="text-xs"
                    >
                      {b.branchName} #{i + 1}
                    </Button>
                  ))}
                </div>
              )}

              {/* Selected booking info */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {format(parseISO(selectedBooking.date), 'EEE, dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBooking.branchName}
                    <Badge variant="outline" className="ml-2 text-[10px] py-0">
                      {selectedBooking.status}
                    </Badge>
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* New Branch select */}
              <div>
                <Label>New Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => b.name !== selectedBooking.branchName)
                      .map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div>
                <Label>Reason (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you want to change the branch?"
                  rows={2}
                />
              </div>
            </div>
          )}

          {!selectedBooking && bookings.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Tap a highlighted date to edit its booking
            </p>
          )}

          {bookings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming bookings found
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedBooking || !selectedBranchId}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlotBookingBranchChangeDialog;
