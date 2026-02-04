import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/services/branchTimetableService';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { Term } from '@/services/termCalendarService';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClassScheduleSelectorProps {
  branchId: string;
  studentAge: number;
  selectedSlots: string[]; // Format: "classId_YYYY-MM-DD"
  onSlotsChange: (slots: string[]) => void;
  term: Term;
  lessonsPerWeek?: number; // Max lessons allowed per week (from product config)
}

const WEEKDAYS = [
  { value: 1, short: 'Mon', full: 'Monday' },
  { value: 2, short: 'Tue', full: 'Tuesday' },
  { value: 3, short: 'Wed', full: 'Wednesday' },
  { value: 4, short: 'Thu', full: 'Thursday' },
  { value: 5, short: 'Fri', full: 'Friday' },
  { value: 6, short: 'Sat', full: 'Saturday' },
  { value: 0, short: 'Sun', full: 'Sunday' },
];

const ClassScheduleSelector: React.FC<ClassScheduleSelectorProps> = ({
  branchId,
  studentAge,
  selectedSlots,
  onSlotsChange,
  term,
  lessonsPerWeek,
}) => {
  // Fetch class schedules for this branch
  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ['branch-class-schedules', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_timetables')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch public holidays
  const { data: publicHolidays = [] } = useQuery({
    queryKey: ['public-holidays-for-term', term?.id],
    queryFn: async () => {
      if (!term) return [];
      
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .gte('date', term.start_date)
        .lte('date', term.end_date);

      if (error) throw error;
      return data || [];
    },
    enabled: !!term,
  });

  // Filter classes based on student's age
  const eligibleClasses = useMemo(() => {
    return allClasses.filter((cls: any) => {
      if (!cls.age_from && !cls.age_to) return true;
      const minAge = cls.age_from || 0;
      const maxAge = cls.age_to || 100;
      return studentAge >= minAge && studentAge <= maxAge;
    });
  }, [allClasses, studentAge]);

  // Determine operating days (days that have classes)
  const operatingDays = useMemo(() => {
    const days = new Set(eligibleClasses.map((c: any) => c.weekday));
    return WEEKDAYS.filter(w => days.has(w.value)).sort((a, b) => {
      // Sort Mon-Sun (1-6, 0)
      const aVal = a.value === 0 ? 7 : a.value;
      const bVal = b.value === 0 ? 7 : b.value;
      return aVal - bVal;
    });
  }, [eligibleClasses]);

  // Helper: Check if a date falls within any term break
  const isDateInBreak = (date: Date, breaks: Term['breaks']) => {
    if (!breaks || breaks.length === 0) return false;
    return breaks.some(brk => {
      const breakStart = parseISO(brk.start_date);
      const breakEnd = parseISO(brk.end_date);
      return isWithinInterval(date, { start: breakStart, end: breakEnd });
    });
  };

  // Helper: Check if a date is a public holiday
  const isPublicHoliday = (date: Date) => {
    return publicHolidays.some(holiday => isSameDay(parseISO(holiday.date), date));
  };

  // Helper: Get public holiday name for a date
  const getPublicHolidayName = (date: Date) => {
    const holiday = publicHolidays.find(h => isSameDay(parseISO(h.date), date));
    return holiday?.name || null;
  };

  // Generate weeks for the term - excluding weeks that are entirely within breaks
  const termWeeks = useMemo(() => {
    if (!term) return [];
    
    const termStart = parseISO(term.start_date);
    const termEnd = parseISO(term.end_date);
    const breaks = term.breaks || [];
    
    const weeks: { weekNumber: number; startDate: Date; days: Date[]; isBreakWeek: boolean }[] = [];
    let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 1 }); // Start on Monday
    let weekNumber = 1;
    
    while (currentWeekStart <= termEnd && weekNumber <= 20) { // Max 20 weeks for safety
      // Generate all days of this week that fall within the term
      const allDaysInWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
        .filter(day => isWithinInterval(day, { start: termStart, end: termEnd }));
      
      // Check if ALL days in this week are within a break period
      const isEntireWeekInBreak = allDaysInWeek.length > 0 && 
        allDaysInWeek.every(day => isDateInBreak(day, breaks));
      
      if (allDaysInWeek.length > 0) {
        weeks.push({
          weekNumber: isEntireWeekInBreak ? -1 : weekNumber, // -1 indicates break week
          startDate: currentWeekStart,
          days: allDaysInWeek,
          isBreakWeek: isEntireWeekInBreak,
        });
        
        if (!isEntireWeekInBreak) {
          weekNumber++;
        }
      }
      
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return weeks;
  }, [term]);

  // Calculate max sessions allowed (lessonsPerWeek × number of actual teaching weeks - not break weeks)
  const teachingWeeks = useMemo(() => {
    return termWeeks.filter(w => !w.isBreakWeek);
  }, [termWeeks]);

  const maxSessions = useMemo(() => {
    const perWeek = lessonsPerWeek || 7;
    return perWeek * teachingWeeks.length;
  }, [lessonsPerWeek, teachingWeeks.length]);

  // Get classes for a specific weekday
  const getClassesForWeekday = (weekday: number) => {
    return eligibleClasses.filter((c: any) => c.weekday === weekday);
  };

  // Toggle a specific class on a specific date
  const handleToggleSlot = (classId: string, date: Date) => {
    const slotKey = `${classId}_${format(date, 'yyyy-MM-dd')}`;
    const isRemoving = selectedSlots.includes(slotKey);
    
    if (isRemoving) {
      onSlotsChange(selectedSlots.filter(s => s !== slotKey));
    } else {
      if (selectedSlots.length >= maxSessions) {
        toast.warning(`Maximum ${maxSessions} sessions allowed for this package`);
        return;
      }
      onSlotsChange([...selectedSlots, slotKey]);
    }
  };

  // Check if a slot is selected
  const isSlotSelected = (classId: string, date: Date) => {
    const slotKey = `${classId}_${format(date, 'yyyy-MM-dd')}`;
    return selectedSlots.includes(slotKey);
  };

  const isAtLimit = selectedSlots.length >= maxSessions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (eligibleClasses.length === 0) {
    return (
      <div className="text-center p-6 border border-dashed rounded-lg bg-muted/30">
        <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No classes available for your age group ({studentAge.toFixed(1)} years) at this branch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="w-full">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left text-sm font-medium w-24">Term</th>
                {operatingDays.map(d => (
                  <th key={d.value} className="p-2 text-center text-sm font-medium border-l min-w-[100px]">
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {termWeeks.map((week, weekIndex) => {
                // Display break weeks differently
                if (week.isBreakWeek) {
                  return (
                    <tr key={`break-${weekIndex}`} className="border-t bg-amber-50/50">
                      <td className="p-2 bg-amber-100/50">
                        <div className="font-medium text-sm text-amber-700">Break</div>
                        <div className="text-xs text-amber-600">
                          {format(week.startDate, 'dd MMM')}
                        </div>
                      </td>
                      <td colSpan={operatingDays.length} className="p-2 border-l text-center">
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">Term Break</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={week.weekNumber} className="border-t hover:bg-muted/10">
                    <td className="p-2 bg-muted/30">
                      <div className="font-medium text-sm">Week {week.weekNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(week.startDate, 'dd MMM')}
                      </div>
                    </td>
                    {operatingDays.map(dayInfo => {
                      const dayDate = week.days.find(d => d.getDay() === dayInfo.value);
                      const classesForDay = getClassesForWeekday(dayInfo.value);
                      
                      if (!dayDate || classesForDay.length === 0) {
                        return (
                          <td key={dayInfo.value} className="p-2 border-l text-center text-muted-foreground">
                            -
                          </td>
                        );
                      }

                      // Check if this specific day is a public holiday
                      const holidayName = getPublicHolidayName(dayDate);
                      if (holidayName) {
                        return (
                          <td key={dayInfo.value} className="p-2 border-l align-top">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="bg-red-100 text-red-700 px-2 py-2 rounded text-center">
                                    <div className="text-xs font-medium">Holiday</div>
                                    <div className="text-[10px]">{format(dayDate, 'EEE d')}</div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{holidayName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        );
                      }
                      
                      return (
                        <td key={dayInfo.value} className="p-2 border-l align-top">
                          <div className="space-y-2">
                            {classesForDay.map((cls: any) => {
                              const isSelected = isSlotSelected(cls.id, dayDate);
                              
                              return (
                                <button
                                  key={cls.id}
                                  onClick={() => handleToggleSlot(cls.id, dayDate)}
                                  disabled={!isSelected && isAtLimit}
                                  className={`
                                    px-2 py-2 rounded text-center transition-all w-full
                                    ${isSelected 
                                      ? 'bg-primary text-primary-foreground' 
                                      : isAtLimit
                                        ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                    }
                                  `}
                                >
                                  <div className="text-xs font-medium truncate">
                                    {cls.class_type}
                                  </div>
                                  <div className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                    {formatTime(cls.start_time)}-{formatTime(cls.end_time)}
                                  </div>
                                  <div className="text-xs font-medium mt-0.5">
                                    {format(dayDate, 'EEE d')}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Summary footer with limit info */}
      <div className="text-sm pt-2 border-t flex justify-between items-center">
        <span className="text-muted-foreground">
          {lessonsPerWeek && teachingWeeks.length > 0 && (
            <>Limit: {lessonsPerWeek}/week × {teachingWeeks.length} weeks</>
          )}
        </span>
        <span className={isAtLimit ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
          {selectedSlots.length} of {maxSessions} sessions selected
          {isAtLimit && ' (limit reached)'}
        </span>
      </div>
    </div>
  );
};

export default ClassScheduleSelector;
