import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday } from 'date-fns';
import { getClassSchedules, WEEKDAYS } from '@/services/branchTimetableService';
import { getScheduledClasses } from '@/services/classEnrollmentService';
import { getGradingSlotsForWeek, GradingSlotWithRegistrations } from '@/services/gradingService';
import { getClassTypeBadgeClasses } from '@/utils/classTypeColors';
import SlotAttendanceDialog from './SlotAttendanceDialog';

interface BranchWeeklyTimetableProps {
  branchId: string;
}

interface GroupedClass {
  id: string;
  type: 'class' | 'grading';
  startTime: string;
  endTime: string;
  classType: string;
  students: { id: string; name: string; status?: string; currentBelt?: string }[];
  beltLevels?: string[];
  ageFrom?: number;
  ageTo?: number;
}

const BranchWeeklyTimetable: React.FC<BranchWeeklyTimetableProps> = ({ branchId }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Start on Monday
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    timetableId: string;
    date: string;
    startTime: string;
    endTime: string;
    classType: string;
    beltLevels?: string[];
    ageFrom?: number;
    ageTo?: number;
  } | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: currentWeekStart, end: weekEnd }), [currentWeekStart, weekEnd]);

  // Fetch branch timetable (class schedule template)
  const { data: timetable = [], isLoading: timetableLoading } = useQuery({
    queryKey: ['branch-timetable', branchId],
    queryFn: () => getClassSchedules(branchId),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch scheduled classes for the week
  const { data: scheduledClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['scheduled-classes', branchId, format(currentWeekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: () => getScheduledClasses(
      format(currentWeekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd'),
      branchId
    ),
    enabled: !!branchId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch grading slots for the week
  const { data: gradingSlots = [], isLoading: gradingLoading } = useQuery({
    queryKey: ['grading-slots-week', branchId, format(currentWeekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: () => getGradingSlotsForWeek(
      format(currentWeekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd'),
      branchId
    ),
    enabled: !!branchId,
    staleTime: 60 * 1000, // 1 minute
  });

  const isLoading = timetableLoading || classesLoading || gradingLoading;

  // Group scheduled classes and grading slots by date
  const groupedByDay = useMemo(() => {
    const result: Record<string, GroupedClass[]> = {};

    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();
      const allSlots: GroupedClass[] = [];
      
      // Get timetable slots for this day
      const dayTimetable = timetable
        .filter(t => t.weekday === dayOfWeek && t.is_active)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Get scheduled classes for this day
      const dayClasses = scheduledClasses.filter(sc => sc.scheduled_date === dateKey);

      // Add regular class slots
      dayTimetable.forEach(slot => {
        const matchingClasses = dayClasses.filter(sc => {
          // Match by timetable_id first (most accurate), fallback to time+type matching
          if ((sc as any).timetable_id) {
            return (sc as any).timetable_id === slot.id;
          }
          return sc.start_time === slot.start_time && 
            sc.end_time === slot.end_time &&
            sc.class_type === slot.class_type;
        });

        allSlots.push({
          id: slot.id,
          type: 'class',
          startTime: slot.start_time,
          endTime: slot.end_time,
          classType: slot.class_type,
          beltLevels: slot.belt_levels || [],
          ageFrom: slot.age_from,
          ageTo: slot.age_to,
          students: matchingClasses.map(sc => ({
            id: sc.id,
            name: sc.student_name || 'Unknown',
            status: sc.status,
          })),
        });
      });

      // Add grading slots for this day
      const dayGradingSlots = gradingSlots.filter(gs => gs.grading_date === dateKey);
      dayGradingSlots.forEach(grading => {
        allSlots.push({
          id: grading.id,
          type: 'grading',
          startTime: grading.start_time || '00:00',
          endTime: grading.end_time || grading.start_time || '00:00',
          classType: grading.title || 'Grading',
          beltLevels: grading.belt_levels || [],
          students: grading.registrations.map(reg => ({
            id: reg.id,
            name: reg.student_name,
            currentBelt: reg.current_belt,
          })),
        });
      });

      // Sort all slots by start time
      allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      result[dateKey] = allSlots;
    });

    return result;
  }, [weekDays, timetable, scheduledClasses, gradingSlots]);

  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'attended': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        {/* Week Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h3 className="text-lg font-semibold">
            Week of {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
        </div>

        {/* Weekly Grid - Desktop */}
        <div className="hidden sm:block">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayClasses = groupedByDay[dateKey] || [];
                  const dayIsToday = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={`border rounded-lg overflow-hidden ${
                        dayIsToday ? 'border-primary border-2 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className={`p-2 text-center font-medium ${
                        dayIsToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <div className="text-sm">{WEEKDAYS[day.getDay()]?.short || format(day, 'EEE')}</div>
                        <div className="text-lg">{format(day, 'd')}</div>
                      </div>
                      <div className="p-2 space-y-2 min-h-[200px]">
                        {dayClasses.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No classes
                          </p>
                        ) : (
                          dayClasses.map(slot => {
                            const isClickable = slot.type === 'class';
                            const handleSlotClick = () => {
                              if (isClickable) {
                                setSelectedSlot({
                                  timetableId: slot.id,
                                  date: dateKey,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                  classType: slot.classType,
                                  beltLevels: slot.beltLevels,
                                  ageFrom: slot.ageFrom,
                                  ageTo: slot.ageTo,
                                });
                                setAttendanceDialogOpen(true);
                              }
                            };
                            return (
                              <div
                                key={slot.id}
                                onClick={handleSlotClick}
                                className={`border rounded p-2 space-y-1 ${
                                  slot.type === 'grading' 
                                    ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700' 
                                    : 'bg-card hover:bg-muted/50 cursor-pointer transition-colors'
                                }`}
                              >
                                <div className="text-xs font-medium text-muted-foreground">
                                  {formatTimeDisplay(slot.startTime)}
                                </div>
                                {slot.type === 'grading' ? (
                                  <>
                                    <Badge className="text-xs w-full justify-center bg-amber-500 hover:bg-amber-600 text-white">
                                      GRADING
                                    </Badge>
                                    {slot.beltLevels && slot.beltLevels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {slot.beltLevels.map((belt, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {belt}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline" className={`text-xs w-full justify-center ${getClassTypeBadgeClasses(slot.classType)}`}>
                                    {slot.classType}
                                  </Badge>
                                )}
                                {slot.students.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic text-center">
                                    No students
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {slot.students.map(student => (
                                      <div
                                        key={student.id}
                                        className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                          slot.type === 'grading' 
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                            : getStatusColor(student.status || 'scheduled')
                                        }`}
                                        title={student.currentBelt ? `${student.name} (${student.currentBelt})` : student.name}
                                      >
                                        {student.name}
                                        {student.currentBelt && (
                                          <span className="ml-1 opacity-75">({student.currentBelt})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Weekly Grid - Mobile (stacked by day) */}
        <div className="sm:hidden flex flex-col gap-2">
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayClasses = groupedByDay[dateKey] || [];
            const dayIsToday = isToday(day);

            return (
              <div
                key={dateKey}
                className={`border rounded-lg overflow-hidden ${
                  dayIsToday ? 'border-primary border-2 bg-primary/5' : 'border-border'
                }`}
              >
                {/* Day Header - inline on mobile */}
                <div className={`px-3 py-1.5 flex items-center gap-2 font-medium ${
                  dayIsToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <span className="text-sm font-semibold">{WEEKDAYS[day.getDay()]?.short || format(day, 'EEE')}</span>
                  <span className="text-sm">{format(day, 'd MMM')}</span>
                  {dayClasses.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      {dayClasses.length} slot{dayClasses.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Slots */}
                {dayClasses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No classes</p>
                ) : (
                  <div className="p-1.5 space-y-1.5">
                    {dayClasses.map(slot => {
                      const isClickable = slot.type === 'class';
                      const handleSlotClick = () => {
                        if (isClickable) {
                          setSelectedSlot({
                            timetableId: slot.id,
                            date: dateKey,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            classType: slot.classType,
                            beltLevels: slot.beltLevels,
                            ageFrom: slot.ageFrom,
                            ageTo: slot.ageTo,
                          });
                          setAttendanceDialogOpen(true);
                        }
                      };
                      return (
                        <div
                          key={slot.id}
                          onClick={handleSlotClick}
                          className={`border rounded p-2 ${
                            slot.type === 'grading' 
                              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700' 
                              : 'bg-card hover:bg-muted/50 cursor-pointer transition-colors'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatTimeDisplay(slot.startTime)}
                            </span>
                            {slot.type === 'grading' ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 text-white">
                                GRADING
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getClassTypeBadgeClasses(slot.classType)}`}>
                                {slot.classType}
                              </Badge>
                            )}
                            {slot.beltLevels && slot.beltLevels.length > 0 && slot.type === 'grading' && (
                              slot.beltLevels.map((belt, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                                  {belt}
                                </Badge>
                              ))
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {slot.students.length} student{slot.students.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {slot.students.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {slot.students.map(student => (
                                <span
                                  key={student.id}
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    slot.type === 'grading' 
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                      : getStatusColor(student.status || 'scheduled')
                                  }`}
                                >
                                  {student.name}
                                  {student.currentBelt && (
                                    <span className="ml-0.5 opacity-75">({student.currentBelt})</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Attendance Dialog */}
        <SlotAttendanceDialog
          open={attendanceDialogOpen}
          onOpenChange={setAttendanceDialogOpen}
          branchId={branchId}
          slot={selectedSlot}
        />
      </CardContent>
    </Card>
  );
};

export default BranchWeeklyTimetable;
