/**
 * Class Swap Dialog Component
 * Allows swapping a scheduled class to a different date/time with confirmation for different class types
 */

import React, { useState, useEffect } from 'react';
import { formatMonthShort, formatDate } from '@/utils/dateFormat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Clock, 
  ArrowRightLeft, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { swapScheduledClass, updateScheduledClassStatus, type ScheduledClass } from '@/services/classEnrollmentService';
import { getClassSchedules, type ClassSchedule } from '@/services/branchTimetableService';

interface ClassSwapDialogProps {
  scheduledClass: ScheduledClass;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwapComplete: () => void;
}

export function ClassSwapDialog({
  scheduledClass,
  open,
  onOpenChange,
  onSwapComplete,
}: ClassSwapDialogProps) {
  const [mode, setMode] = useState<'view' | 'swap'>('view');
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [selectedTimetable, setSelectedTimetable] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClassChangeWarning, setShowClassChangeWarning] = useState(false);
  const [timetables, setTimetables] = useState<ClassSchedule[]>([]);

  // Load available timetables for the branch
  useEffect(() => {
    if (open && scheduledClass.enrollment?.branch_id) {
      loadTimetables();
    }
  }, [open, scheduledClass]);

  const loadTimetables = async () => {
    try {
      const data = await getClassSchedules(scheduledClass.enrollment?.branch_id);
      setTimetables(data);
    } catch (error) {
      console.error('Failed to load timetables:', error);
    }
  };

  const handleTimetableSelect = (timetableId: string) => {
    setSelectedTimetable(timetableId);
    const timetable = timetables.find(t => t.id === timetableId);
    if (timetable) {
      setNewStartTime(timetable.start_time);
      setNewEndTime(timetable.end_time);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSwap = async () => {
    if (!newDate || !newStartTime || !newEndTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if class type is different
    const selectedTimetableData = timetables.find(t => t.id === selectedTimetable);
    if (selectedTimetableData && selectedTimetableData.class_type !== scheduledClass.class_type) {
      setShowClassChangeWarning(true);
      return;
    }

    await performSwap();
  };

  const performSwap = async () => {
    if (!newDate) return;

    setIsLoading(true);
    try {
      await swapScheduledClass(
        scheduledClass.id,
        format(newDate, 'yyyy-MM-dd'),
        newStartTime,
        newEndTime,
        selectedTimetable || undefined,
        reason
      );
      
      toast.success('Class swapped successfully');
      onSwapComplete();
    } catch (error) {
      console.error('Failed to swap class:', error);
      toast.error('Failed to swap class');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async (status: 'attended' | 'absent') => {
    setIsLoading(true);
    try {
      await updateScheduledClassStatus(
        scheduledClass.id,
        status,
        status === 'attended' ? new Date().toISOString() : undefined
      );
      
      toast.success(`Marked as ${status}`);
      onSwapComplete();
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await updateScheduledClassStatus(scheduledClass.id, 'cancelled');
      toast.success('Class cancelled');
      onSwapComplete();
    } catch (error) {
      console.error('Failed to cancel class:', error);
      toast.error('Failed to cancel class');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setMode('view');
    setNewDate(undefined);
    setNewStartTime('');
    setNewEndTime('');
    setSelectedTimetable('');
    setReason('');
  };

  useEffect(() => {
    if (!open) {
      resetDialog();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {scheduledClass.student_name}
            </DialogTitle>
            <DialogDescription>
              {scheduledClass.class_type} • {scheduledClass.branch_name}
            </DialogDescription>
          </DialogHeader>

          {mode === 'view' ? (
            <>
              <div className="space-y-4">
                {/* Current Schedule Info */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(parseISO(scheduledClass.scheduled_date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatTime(scheduledClass.start_time)} - {formatTime(scheduledClass.end_time)}
                    </span>
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {scheduledClass.status.charAt(0).toUpperCase() + scheduledClass.status.slice(1)}
                  </Badge>
                  
                  {scheduledClass.swapped_from_id && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>This class was swapped from another date</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {scheduledClass.status === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleMarkAttendance('attended')}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Attended
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMarkAttendance('absent')}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                      Absent
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {scheduledClass.status === 'scheduled' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel Class
                    </Button>
                    <Button onClick={() => setMode('swap')} disabled={isLoading}>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Swap Date/Time
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Swap from: <strong>{formatMonthShort(parseISO(scheduledClass.scheduled_date))} at {formatTime(scheduledClass.start_time)}</strong>
                </div>

                {/* New Date */}
                <div className="space-y-2">
                  <Label>New Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate ? formatDate(newDate) : 'Select new date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={setNewDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Select from Timetable or Custom Time */}
                <div className="space-y-2">
                  <Label>Select Class Time</Label>
                  <Select value={selectedTimetable} onValueChange={handleTimetableSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select from timetable or enter custom time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timetables.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.class_type} - {formatTime(t.start_time)} ({['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.weekday]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Student requested due to school event"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setMode('view')}>
                  Back
                </Button>
                <Button onClick={handleSwap} disabled={isLoading || !newDate}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Swap
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Class Type Change Warning */}
      <AlertDialog open={showClassChangeWarning} onOpenChange={setShowClassChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Different Class Type
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected time slot is for a different class type than the original enrollment. 
              The original class was <strong>{scheduledClass.class_type}</strong>.
              <br /><br />
              Do you want to proceed with the swap anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSwap}>
              Proceed with Swap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
