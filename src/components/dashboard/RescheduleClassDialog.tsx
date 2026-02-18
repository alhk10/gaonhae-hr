import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Clock } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { swapScheduledClass } from '@/services/classEnrollmentService';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScheduledClassInfo {
  id: string;
  enrollment_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  class_type: string;
  timetable_class_type?: string;
  term_name: string;
  timetable_id?: string | null;
}

interface TimetableSlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  class_type: string;
  is_active: boolean;
}

interface RescheduleClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledClass: ScheduledClassInfo;
  timetables: TimetableSlot[];
  mode: 'reschedule' | 'makeup';
}

const RescheduleClassDialog: React.FC<RescheduleClassDialogProps> = ({
  open,
  onOpenChange,
  scheduledClass,
  timetables,
  mode,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [reason, setReason] = useState('');

  // Filter timetable slots matching the same class_type (use timetable class type if available)
  const matchingSlots = useMemo(() => {
    const matchType = scheduledClass.timetable_class_type || scheduledClass.class_type;
    return timetables.filter(t => t.class_type === matchType && t.is_active);
  }, [timetables, scheduledClass.timetable_class_type, scheduledClass.class_type]);

  // Valid weekdays from matching slots
  const validWeekdays = useMemo(() => {
    return [...new Set(matchingSlots.map(s => s.weekday))];
  }, [matchingSlots]);

  // Disable dates that aren't valid weekdays or are in the past
  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    return !validWeekdays.includes(date.getDay());
  };

  // Slots available for the selected date
  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    return matchingSlots.filter(s => s.weekday === dayOfWeek);
  }, [selectedDate, matchingSlots]);

  const formatTime = (time: string) => time?.substring(0, 5) || '';

  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error('Please select a date and time slot');
      const newDate = format(selectedDate, 'yyyy-MM-dd');
      return swapScheduledClass(
        scheduledClass.id,
        newDate,
        selectedSlot.start_time,
        selectedSlot.end_time,
        selectedSlot.id,
        reason || undefined
      );
    },
    onSuccess: () => {
      toast.success(mode === 'makeup' ? 'Make-up class scheduled!' : 'Class rescheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-all-scheduled-classes'] });
      queryClient.invalidateQueries({ queryKey: ['student-scheduled-classes'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reschedule class');
    },
  });

  const handleSubmit = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Please select a date and time slot');
      return;
    }
    swapMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'makeup' ? 'Schedule Make-Up Class' : 'Reschedule Class'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'makeup'
              ? `Schedule a make-up for your missed ${scheduledClass.class_type} class on ${format(new Date(scheduledClass.scheduled_date), 'dd MMM yyyy')}`
              : `Move your ${scheduledClass.class_type} class from ${format(new Date(scheduledClass.scheduled_date), 'dd MMM yyyy')} to a new date`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current class info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Original Class</p>
            <p className="text-sm text-muted-foreground">
              {scheduledClass.class_type} — {format(new Date(scheduledClass.scheduled_date), 'EEEE, dd MMM yyyy')} at {formatTime(scheduledClass.start_time)}
            </p>
          </div>

          {/* Date Picker */}
          <div>
            <Label className="mb-2 block">Select New Date</Label>
            {matchingSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available slots found for {scheduledClass.class_type} class type.</p>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                disabled={isDateDisabled}
                fromDate={new Date()}
                toDate={addDays(new Date(), 90)}
                className="rounded-md border"
              />
            )}
          </div>

          {/* Time Slot Selection */}
          {selectedDate && availableSlotsForDate.length > 0 && (
            <div>
              <Label className="mb-2 block">Select Time Slot</Label>
              <div className="space-y-2">
                {availableSlotsForDate.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selectedSlot?.id === slot.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </p>
                      <p className="text-xs text-muted-foreground">{slot.class_type}</p>
                    </div>
                    {selectedSlot?.id === slot.id && (
                      <Badge variant="default" className="ml-auto">Selected</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="mb-2 block">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'makeup' ? 'Reason for make-up...' : 'Reason for rescheduling...'}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedSlot || swapMutation.isPending}
          >
            {swapMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'makeup' ? 'Schedule Make-Up' : 'Confirm Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleClassDialog;
