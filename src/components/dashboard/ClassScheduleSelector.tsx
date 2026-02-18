import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/services/branchTimetableService';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO, isSameDay, isBefore, startOfDay } from 'date-fns';
import { Term } from '@/services/termCalendarService';

import { toast } from 'sonner';
import { getPublicHolidays } from '@/services/publicHolidayService';

interface ClassScheduleSelectorProps {
  branchId: string;
  studentAge: number;
  selectedSlots: string[]; // Format: "classId_YYYY-MM-DD"
  onSlotsChange: (slots: string[]) => void;
  term: Term;
  lessonsPerWeek?: number; // Max lessons allowed per week (from product config)
  allowedClassTypes?: string[]; // Filter to only show these class types
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
  allowedClassTypes,
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
    queryKey: ['public-holidays-for-schedule'],
    queryFn: getPublicHolidays,
  });

  // Filter classes based on student's age
  const eligibleClasses = useMemo(() => {
    return allClasses.filter((cls: any) => {
      // Filter by age
      if (cls.age_from || cls.age_to) {
        const minAge = cls.age_from || 0;
        const maxAge = cls.age_to || 100;
        if (studentAge < minAge || studentAge > maxAge) return false;
      }
      // Filter by allowed class types
      if (allowedClassTypes && allowedClassTypes.length > 0) {
        if (!cls.class_type || !allowedClassTypes.includes(cls.class_type)) return false;
      }
      return true;
    });
  }, [allClasses, studentAge, allowedClassTypes]);

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

  // Helper to check if a date is a public holiday
  const isPublicHoliday = (date: Date): boolean => {
    return publicHolidays.some(holiday => {
      const holidayDate = parseISO(holiday.date);
      return isSameDay(date, holidayDate);
    });
  };

  // Helper to check if a week is entirely a break (all operating days are within break)
  const isWeekInBreak = (
    weekStart: Date,
    operatingWeekdays: number[], // e.g., [1,2,3,4,5] for Mon-Fri
    breaks: any[]
  ): boolean => {
    if (operatingWeekdays.length === 0 || breaks.length === 0) return false;
    
    // Get the actual dates for each operating day within this week
    const operatingDates = operatingWeekdays.map(weekday => {
      // weekday: 1=Mon, 2=Tue, ..., 5=Fri, 6=Sat, 0=Sun
      // Since weekStart is Monday (weekStartsOn: 1), offset is:
      // Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
      const dayOffset = weekday === 0 ? 6 : weekday - 1;
      return addDays(weekStart, dayOffset);
    });
    
    // Week is a "break week" only if ALL operating days fall within a break period
    return operatingDates.every(date =>
      breaks.some(brk => {
        const breakStart = parseISO(brk.start_date);
        const breakEnd = parseISO(brk.end_date);
        return isWithinInterval(date, { start: breakStart, end: breakEnd });
      })
    );
  };

  // Generate weeks for the term (excluding term breaks, public holidays, and past dates)
  const termWeeks = useMemo(() => {
    if (!term) return [];
    
    const termStart = parseISO(term.start_date);
    const termEnd = parseISO(term.end_date);
    const breaks = term.breaks || [];
    const today = startOfDay(new Date()); // Today at midnight for comparison
    
    const weeks: { weekNumber: number; startDate: Date; days: Date[] }[] = [];
    let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 1 }); // Start on Monday
    let weekNumber = 0; // Start at 0, increment before use
    
    while (currentWeekStart <= termEnd && weekNumber < 20) { // Max 20 weeks for safety
      const weekEnd = addDays(currentWeekStart, 6);
      
      // Check if this week is during a break (only considering operating days)
      const operatingWeekdays = operatingDays.map(d => d.value);
      const isBreakWeek = isWeekInBreak(currentWeekStart, operatingWeekdays, breaks);
      
      if (!isBreakWeek) {
        // Increment week number for all non-break weeks (even if past/hidden)
        // This maintains correct term week numbering
        weekNumber++;
        
        // Get days that are within the term period
        const daysInTerm = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
          .filter(day => isWithinInterval(day, { start: termStart, end: termEnd }));
        
        // Filter out public holidays from the days
        const daysWithoutHolidays = daysInTerm.filter(day => !isPublicHoliday(day));
        
        // Filter out past dates (keep today and future dates)
        const validDays = daysWithoutHolidays.filter(day => !isBefore(day, today));
        
        // Only add the week if there are valid future days
        if (validDays.length > 0) {
          weeks.push({
            weekNumber,
            startDate: currentWeekStart,
            days: validDays,
          });
        }
      }
      
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return weeks;
  }, [term, publicHolidays]);

  // Calculate max sessions allowed (lessonsPerWeek × number of term weeks)
  const maxSessions = useMemo(() => {
    const perWeek = lessonsPerWeek || 7;
    return perWeek * termWeeks.length;
  }, [lessonsPerWeek, termWeeks.length]);

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
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-1 py-1.5 text-center text-xs font-medium w-10">Term</th>
              {operatingDays.map(d => (
                <th key={d.value} className="px-1 py-1.5 text-center text-xs font-medium border-l">
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {termWeeks.map(week => (
              <tr key={week.weekNumber} className="border-t hover:bg-muted/10">
                <td className="px-1 py-1.5 bg-muted/30 w-10">
                  <div className="flex items-center justify-center [writing-mode:vertical-lr] rotate-180">
                    <span className="text-xs font-semibold whitespace-nowrap">Wk {week.weekNumber}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-0.5">({format(week.startDate, 'd MMM')})</span>
                  </div>
                </td>
                {operatingDays.map(dayInfo => {
                  const dayDate = week.days.find(d => d.getDay() === dayInfo.value);
                  const classesForDay = getClassesForWeekday(dayInfo.value);
                  
                  if (!dayDate || classesForDay.length === 0) {
                    return (
                      <td key={dayInfo.value} className="px-1 py-1.5 border-l text-center text-muted-foreground">
                        -
                      </td>
                    );
                  }
                  
                  return (
                    <td key={dayInfo.value} className="px-1 py-1.5 border-l align-top">
                      <div className="space-y-1">
                        {classesForDay.map((cls: any) => {
                          const isSelected = isSlotSelected(cls.id, dayDate);
                          
                          return (
                            <button
                              key={cls.id}
                              onClick={() => handleToggleSlot(cls.id, dayDate)}
                              disabled={!isSelected && isAtLimit}
                              className={`
                                px-1 py-1 rounded text-center transition-all w-full
                                ${isSelected 
                                  ? 'bg-primary text-primary-foreground' 
                                  : isAtLimit
                                    ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                }
                              `}
                            >
                              <div className="text-[10px] font-medium truncate">
                                {cls.class_type}
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {formatTime(cls.start_time)}-{formatTime(cls.end_time)}
                              </div>
                              <div className="text-[10px] font-medium mt-0.5">
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer with limit info */}
      <div className="text-sm pt-2 border-t flex justify-between items-center">
        <span className="text-muted-foreground">
          {lessonsPerWeek && termWeeks.length > 0 && (
            <>Limit: {lessonsPerWeek}/week × {termWeeks.length} weeks</>
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
