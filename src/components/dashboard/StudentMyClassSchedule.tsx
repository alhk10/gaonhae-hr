import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Calendar, Clock, CheckCircle2, XCircle, ArrowRightLeft, 
  Ban, AlertCircle, Filter, Plus, Loader2 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday, parseISO, getDay, isAfter, isBefore, startOfDay, differenceInYears } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { createScheduledClass } from '@/services/classEnrollmentService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RescheduleClassDialog from './RescheduleClassDialog';

interface Entitlement {
  id: string;
  sessions_total: number;
  sessions_remaining: number | null;
  sessions_used: number;
  class_type_scope: string | null;
  branch_scope: string | null;
  valid_from: string | null;
  valid_to: string | null;
  [key: string]: any;
}

interface StudentMyClassScheduleProps {
  studentId: string;
  branchId?: string;
  entitlements?: Entitlement[];
  readOnly?: boolean;
  studentDateOfBirth?: string;
  studentCurrentBelt?: string;
}

type FilterType = 'upcoming' | 'past' | 'all';

interface ScheduledClassDisplay {
  id: string;
  enrollment_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  class_type: string;
  timetable_class_type?: string;
  term_name: string;
  term_id: string;
  swapped_from_id: string | null;
  swap_reason: string | null;
  timetable_id?: string | null;
}

const StudentMyClassSchedule: React.FC<StudentMyClassScheduleProps> = ({ 
  studentId, branchId, entitlements = [], readOnly = false,
  studentDateOfBirth, studentCurrentBelt
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [rescheduleClass, setRescheduleClass] = useState<ScheduledClassDisplay | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState<'reschedule' | 'makeup'>('reschedule');
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [booking, setBooking] = useState(false);

  // Fetch active enrollments
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-my-enrollments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_class_enrollments')
        .select('id, class_type, term_id, branch_id, status')
        .eq('student_id', studentId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  // Fetch term names
  const termIds = [...new Set(enrollments.map(e => e.term_id))];
  const { data: terms = [] } = useQuery({
    queryKey: ['student-terms', termIds],
    queryFn: async () => {
      if (termIds.length === 0) return [];
      const { data, error } = await supabase
        .from('term_calendars')
        .select('id, name, start_date, end_date')
        .in('id', termIds);
      if (error) throw error;
      return data || [];
    },
    enabled: termIds.length > 0,
  });

  const termMap = terms.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {} as Record<string, string>);
  const termDateMap = terms.reduce((acc, t) => ({ ...acc, [t.id]: { start_date: t.start_date, end_date: t.end_date } }), {} as Record<string, { start_date: string; end_date: string }>);

  // Fetch scheduled classes for all enrollments
  const enrollmentIds = enrollments.map(e => e.id);
  const { data: scheduledClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['student-all-scheduled-classes', enrollmentIds],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('student_scheduled_classes')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: enrollmentIds.length > 0,
  });

  // Fetch branch timetables
  const effectiveBranchId = branchId || enrollments[0]?.branch_id;
  const { data: timetables = [] } = useQuery({
    queryKey: ['branch-timetables-for-reschedule', effectiveBranchId],
    queryFn: async () => {
      if (!effectiveBranchId) return [];
      const { data, error } = await supabase
        .from('branch_timetables')
        .select('*')
        .eq('branch_id', effectiveBranchId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveBranchId,
  });

  // Calculate unbooked sessions
  const activeClassCount = scheduledClasses.filter(
    s => s.status !== 'cancelled' && s.status !== 'swapped'
  ).length;
  const totalEntitlementSessions = entitlements.reduce((sum, e) => sum + (e.sessions_remaining || 0), 0);
  const unbookedCount = Math.max(0, totalEntitlementSessions - activeClassCount);

  // Available weekdays from timetables
  const availableWeekdays = useMemo(() => {
    return [...new Set(timetables.map(t => t.weekday))];
  }, [timetables]);

  // Term date bounds for the calendar
  const termBounds = useMemo(() => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    terms.forEach(t => {
      const s = parseISO(t.start_date);
      const e = parseISO(t.end_date);
      if (!minDate || isBefore(s, minDate)) minDate = s;
      if (!maxDate || isAfter(e, maxDate)) maxDate = e;
    });
    return { minDate, maxDate };
  }, [terms]);

  // Slots for selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = getDay(selectedDate);
    let slots = timetables.filter(t => t.weekday === dayOfWeek);

    // Filter by student age
    if (studentDateOfBirth) {
      const studentAge = differenceInYears(new Date(), new Date(studentDateOfBirth));
      slots = slots.filter(t => {
        if (t.age_from != null && studentAge < t.age_from) return false;
        if (t.age_to != null && studentAge > t.age_to) return false;
        return true;
      });
    }

    // Filter by student belt level
    if (studentCurrentBelt) {
      slots = slots.filter(t => {
        if (!t.belt_levels || t.belt_levels.length === 0) return true;
        return t.belt_levels.includes(studentCurrentBelt);
      });
    }

    return slots;
  }, [selectedDate, timetables, studentDateOfBirth, studentCurrentBelt]);

  // Capacity check for selected date slots
  const { data: slotCapacities = {} } = useQuery({
    queryKey: ['slot-capacities', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', slotsForDate.map(s => s.id).join(',')],
    queryFn: async () => {
      if (!selectedDate || slotsForDate.length === 0) return {};
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timetableIds = slotsForDate.map(s => s.id);
      const { data, error } = await supabase
        .from('student_scheduled_classes')
        .select('timetable_id')
        .eq('scheduled_date', dateStr)
        .in('timetable_id', timetableIds)
        .neq('status', 'cancelled')
        .neq('status', 'swapped');
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach(d => {
        if (d.timetable_id) counts[d.timetable_id] = (counts[d.timetable_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!selectedDate && slotsForDate.length > 0,
  });

  // Calendar disabled date logic
  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    if (termBounds.minDate && isBefore(date, termBounds.minDate)) return true;
    if (termBounds.maxDate && isAfter(date, termBounds.maxDate)) return true;
    const dayOfWeek = getDay(date);
    if (!availableWeekdays.includes(dayOfWeek)) return true;
    return false;
  };

  const handleBookLesson = async () => {
    if (!selectedDate || !selectedSlot || enrollmentIds.length === 0) return;
    setBooking(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await createScheduledClass({
        enrollment_id: enrollmentIds[0],
        timetable_id: selectedSlot.id,
        scheduled_date: dateStr,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      });
      toast.success('Lesson booked successfully');
      setAddLessonOpen(false);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['student-all-scheduled-classes'] });
      queryClient.invalidateQueries({ queryKey: ['student-entitlements'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to book lesson');
    } finally {
      setBooking(false);
    }
  };

  // Build display data
  const enrollmentMap = enrollments.reduce((acc, e) => ({ ...acc, [e.id]: e }), {} as Record<string, any>);
  const timetableClassTypeMap = timetables.reduce((acc, t) => ({ ...acc, [t.id]: t.class_type }), {} as Record<string, string>);

  const displayClasses: ScheduledClassDisplay[] = scheduledClasses.map(sc => {
    const enrollment = enrollmentMap[sc.enrollment_id];
    const timetableClassType = sc.timetable_id ? timetableClassTypeMap[sc.timetable_id] : undefined;
    return {
      id: sc.id,
      enrollment_id: sc.enrollment_id,
      scheduled_date: sc.scheduled_date,
      start_time: sc.start_time,
      end_time: sc.end_time,
      status: sc.status,
      class_type: enrollment?.class_type || 'Class',
      timetable_class_type: timetableClassType,
      term_name: enrollment ? (termMap[enrollment.term_id] || 'Term') : 'Term',
      term_id: enrollment?.term_id || '',
      swapped_from_id: sc.swapped_from_id,
      swap_reason: sc.swap_reason,
      timetable_id: sc.timetable_id,
    };
  });

  // Apply filter
  const today = new Date().toISOString().split('T')[0];
  const filteredClasses = displayClasses.filter(c => {
    if (filter === 'upcoming') return c.scheduled_date >= today && c.status !== 'cancelled' && c.status !== 'swapped';
    if (filter === 'past') return c.scheduled_date < today || c.status === 'attended' || c.status === 'absent';
    return true;
  });

  // Group by term
  const groupedByTerm = filteredClasses.reduce((acc, cls) => {
    const key = cls.term_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cls);
    return acc;
  }, {} as Record<string, ScheduledClassDisplay[]>);

  const formatTime = (time: string) => time?.substring(0, 5) || '';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'scheduled': return <Clock className="w-5 h-5 text-muted-foreground" />;
      case 'swapped': return <ArrowRightLeft className="w-5 h-5 text-orange-500" />;
      case 'cancelled': return <Ban className="w-5 h-5 text-muted-foreground" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'attended': return 'Attended';
      case 'absent': return 'Absent';
      case 'scheduled': return 'Scheduled';
      case 'swapped': return 'Rescheduled';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const canReschedule = (cls: ScheduledClassDisplay) => cls.status === 'scheduled' && cls.scheduled_date >= today;
  const canMakeUp = (cls: ScheduledClassDisplay) => cls.status === 'absent';

  const handleReschedule = (cls: ScheduledClassDisplay) => {
    setRescheduleClass(cls);
    setRescheduleMode('reschedule');
  };

  const handleMakeUp = (cls: ScheduledClassDisplay) => {
    setRescheduleClass(cls);
    setRescheduleMode('makeup');
  };

  const isLoading = enrollmentsLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No Active Enrollments</p>
          <p className="text-sm mt-1">You don't have any active class enrollments yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter Row + Add Lesson Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(['upcoming', 'past', 'all'] as FilterType[]).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
        
        {!readOnly && unbookedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddLessonOpen(true)}
            className="ml-auto gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lesson
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
              {unbookedCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Classes grouped by term */}
      {Object.keys(groupedByTerm).length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            <p>No classes found for the selected filter.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByTerm).map(([termName, classes]) => (
          <Card key={termName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {termName}
              </CardTitle>
              <CardDescription>{classes.length} class{classes.length !== 1 ? 'es' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classes.map(cls => {
                  const classDate = parseISO(cls.scheduled_date);
                  const isClassToday = isToday(classDate);

                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center justify-between ${isMobile ? 'p-2 gap-2' : 'p-3'} rounded-lg border ${
                        isClassToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-center min-w-[44px] ${isClassToday ? 'text-primary' : ''}`}>
                          <p className="text-xs uppercase font-medium">{format(classDate, 'EEE')}</p>
                          <p className="text-lg font-bold leading-tight">{format(classDate, 'd')}</p>
                          <p className="text-xs text-muted-foreground">{format(classDate, 'MMM')}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{cls.class_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                          </p>
                          {cls.status === 'swapped' && cls.swap_reason && (
                            <p className="text-xs text-orange-600 truncate">Reason: {cls.swap_reason}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(cls.status)}
                          {!isMobile && (
                            <span className={`text-xs font-medium ${
                              cls.status === 'attended' ? 'text-green-600' :
                              cls.status === 'absent' ? 'text-red-600' :
                              cls.status === 'swapped' ? 'text-orange-500' :
                              'text-muted-foreground'
                            }`}>
                              {getStatusLabel(cls.status)}
                            </span>
                          )}
                        </div>

                        {canReschedule(cls) && (
                          <Button variant="outline" size="sm" onClick={() => handleReschedule(cls)} className="text-xs">
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            {isMobile ? 'Swap' : 'Reschedule'}
                          </Button>
                        )}

                        {canMakeUp(cls) && (
                          <Button variant="outline" size="sm" onClick={() => handleMakeUp(cls)} className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Make Up
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Reschedule Dialog */}
      {rescheduleClass && (
        <RescheduleClassDialog
          open={!!rescheduleClass}
          onOpenChange={(open) => { if (!open) setRescheduleClass(null); }}
          scheduledClass={rescheduleClass}
          timetables={timetables}
          mode={rescheduleMode}
          termStartDate={rescheduleClass.term_id ? termDateMap[rescheduleClass.term_id]?.start_date : undefined}
          termEndDate={rescheduleClass.term_id ? termDateMap[rescheduleClass.term_id]?.end_date : undefined}
        />
      )}

      {/* Add Lesson Dialog */}
      <Dialog open={addLessonOpen} onOpenChange={(open) => {
        setAddLessonOpen(open);
        if (!open) { setSelectedDate(undefined); setSelectedSlot(null); }
      }}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Add Lesson</DialogTitle>
            <DialogDescription className="text-xs">
              {unbookedCount} session{unbookedCount !== 1 ? 's' : ''} remaining
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Compact Calendar */}
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
              disabled={isDateDisabled}
              className={cn("p-2 pointer-events-auto rounded-md border mx-auto [&_table]:w-full")}
              classNames={{
                months: "space-y-2",
                head_row: "flex w-full",
                head_cell: "flex-1 text-center text-muted-foreground text-xs font-normal",
                row: "flex w-full",
                cell: "flex-1 text-center p-0",
                day: "h-8 w-8 mx-auto text-sm",
              }}
              initialFocus
            />

            {/* Time Slots */}
            {selectedDate && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Available slots for {format(selectedDate, 'EEE, d MMM')}
                </p>
                {slotsForDate.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No slots available</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {slotsForDate.map(slot => {
                      const currentCount = slotCapacities[slot.id] || 0;
                      const isFull = slot.max_capacity ? currentCount >= slot.max_capacity : false;
                      const isSelected = selectedSlot?.id === slot.id;

                      return (
                        <Button
                          key={slot.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          disabled={isFull}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "text-xs h-7 px-2",
                            isFull && "opacity-50 line-through"
                          )}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                          {slot.class_type && (
                            <span className="ml-1 text-muted-foreground">({slot.class_type})</span>
                          )}
                          {isFull && <span className="ml-1">(Full)</span>}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleBookLesson}
              disabled={!selectedDate || !selectedSlot || booking}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {booking ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Booking...</>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentMyClassSchedule;
