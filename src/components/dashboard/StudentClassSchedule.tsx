import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getClassSchedules, WEEKDAYS, formatTime, ClassSchedule } from '@/services/branchTimetableService';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface StudentClassScheduleProps {
  studentId: string;
  branchId?: string;
}

interface UpcomingClass {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  class_type: string;
  branch_name: string;
}

const StudentClassSchedule: React.FC<StudentClassScheduleProps> = ({ studentId, branchId }) => {
  // Fetch student's branch if not provided
  const { data: student } = useQuery({
    queryKey: ['student-branch', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('branch_id')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !branchId,
  });

  const effectiveBranchId = branchId || student?.branch_id;

  // Fetch branch details
  const { data: branch } = useQuery({
    queryKey: ['branch-details', effectiveBranchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('name, address')
        .eq('id', effectiveBranchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveBranchId,
  });

  // Fetch branch timetable
  const { data: timetable = [], isLoading: timetableLoading } = useQuery({
    queryKey: ['branch-timetable', effectiveBranchId],
    queryFn: () => getClassSchedules(effectiveBranchId!),
    enabled: !!effectiveBranchId,
  });

  // Fetch student's enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_class_enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  // Fetch upcoming scheduled classes for student
  const { data: upcomingClasses = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ['student-scheduled-classes', studentId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = addDays(new Date(), 14).toISOString().split('T')[0];
      
      // Get enrollment IDs first
      const enrollmentIds = enrollments.map(e => e.id);
      if (enrollmentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('student_scheduled_classes')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .gte('scheduled_date', today)
        .lte('scheduled_date', twoWeeksLater)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      // Map to include enrollment info
      return (data || []).map(sc => {
        const enrollment = enrollments.find(e => e.id === sc.enrollment_id);
        return {
          ...sc,
          class_type: enrollment?.class_type || 'Class',
          branch_name: branch?.name || 'Branch',
        };
      });
    },
    enabled: !!studentId && enrollments.length > 0,
  });

  // Get today's weekday
  const today = new Date();
  const todayWeekday = today.getDay();

  // Group timetable by weekday
  const scheduleByDay = WEEKDAYS.map(day => ({
    ...day,
    classes: timetable
      .filter(c => c.weekday === day.value && c.is_active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }));

  // Filter to only days with classes
  const daysWithClasses = scheduleByDay.filter(day => day.classes.length > 0);

  if (timetableLoading || scheduledLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!effectiveBranchId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No branch assigned. Please contact the academy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{branch?.name || 'Your Branch'}</p>
              <p className="text-sm text-muted-foreground">{branch?.address || ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Classes */}
      {upcomingClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Classes
            </CardTitle>
            <CardDescription>Your scheduled classes for the next 2 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingClasses.slice(0, 5).map((cls: UpcomingClass) => {
                const classDate = new Date(cls.scheduled_date);
                const isToday = isSameDay(classDate, today);
                
                return (
                  <div 
                    key={cls.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-center min-w-[50px] ${isToday ? 'text-primary' : ''}`}>
                        <p className="text-xs uppercase font-medium">
                          {format(classDate, 'EEE')}
                        </p>
                        <p className="text-lg font-bold">
                          {format(classDate, 'd')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{cls.class_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isToday ? 'default' : 'secondary'}>
                      {isToday ? 'Today' : cls.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Timetable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Class Schedule
          </CardTitle>
          <CardDescription>
            Regular class times at {branch?.name || 'your branch'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {daysWithClasses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No classes scheduled at this branch yet.
            </p>
          ) : (
            <div className="space-y-4">
              {daysWithClasses.map(day => (
                <div key={day.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${day.value === todayWeekday ? 'text-primary' : ''}`}>
                      {day.label}
                    </h4>
                    {day.value === todayWeekday && (
                      <Badge variant="outline" className="text-xs">Today</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {day.classes.map((cls: ClassSchedule) => (
                      <div 
                        key={cls.id}
                        className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{cls.class_type}</p>
                          {cls.max_capacity && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {cls.max_capacity}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                        </p>
                        {cls.instructor_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Instructor: {cls.instructor_name}
                          </p>
                        )}
                        {cls.age_group && (
                          <Badge variant="secondary" className="text-xs mt-2">
                            {cls.age_group}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled Classes Info */}
      {enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Enrollments</CardTitle>
            <CardDescription>Classes you are currently enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enrollments.map((enrollment: any) => (
                <div 
                  key={enrollment.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{enrollment.class_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.tier_name} tier
                    </p>
                  </div>
                  <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                    {enrollment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentClassSchedule;
