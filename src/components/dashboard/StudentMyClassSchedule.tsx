import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, Clock, CheckCircle2, XCircle, ArrowRightLeft, 
  Ban, AlertCircle, Filter 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import RescheduleClassDialog from './RescheduleClassDialog';

interface StudentMyClassScheduleProps {
  studentId: string;
  branchId?: string;
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

const StudentMyClassSchedule: React.FC<StudentMyClassScheduleProps> = ({ studentId, branchId }) => {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [rescheduleClass, setRescheduleClass] = useState<ScheduledClassDisplay | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState<'reschedule' | 'makeup'>('reschedule');

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

  // Fetch branch timetables for rescheduling
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

  // Build display data
  const enrollmentMap = enrollments.reduce((acc, e) => ({ ...acc, [e.id]: e }), {} as Record<string, any>);

  // Build timetable class_type lookup
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
    return true; // 'all'
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
      case 'attended':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'scheduled':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      case 'swapped':
        return <ArrowRightLeft className="w-5 h-5 text-orange-500" />;
      case 'cancelled':
        return <Ban className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
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

  const canReschedule = (cls: ScheduledClassDisplay) => {
    return cls.status === 'scheduled' && cls.scheduled_date >= today;
  };

  const canMakeUp = (cls: ScheduledClassDisplay) => {
    return cls.status === 'absent';
  };

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
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No Active Enrollments</p>
          <p className="text-sm mt-1">You don't have any active class enrollments yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
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
      </div>

      {/* Classes grouped by term */}
      {Object.keys(groupedByTerm).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
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
                      {/* Left: Date + Info */}
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

                      {/* Right: Status + Actions */}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReschedule(cls)}
                            className="text-xs"
                          >
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            {isMobile ? 'Swap' : 'Reschedule'}
                          </Button>
                        )}

                        {canMakeUp(cls) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakeUp(cls)}
                            className="text-xs"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {isMobile ? 'Make Up' : 'Make Up'}
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
    </div>
  );
};

export default StudentMyClassSchedule;
