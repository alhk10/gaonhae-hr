import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/services/branchTimetableService';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';
import { Term } from '@/services/termCalendarService';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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

  // Generate weeks for the term
  const termWeeks = useMemo(() => {
    if (!term) return [];
    
    const termStart = parseISO(term.start_date);
    const termEnd = parseISO(term.end_date);
    const breaks = term.breaks || [];
    
    const weeks: { weekNumber: number; startDate: Date; days: Date[] }[] = [];
    let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 1 }); // Start on Monday
    let weekNumber = 1;
    
    while (currentWeekStart <= termEnd && weekNumber <= 15) { // Max 15 weeks for safety
      // Check if this week is during a break
      const isBreakWeek = breaks.some(brk => {
        const breakStart = parseISO(brk.start_date);
        const breakEnd = parseISO(brk.end_date);
        return isWithinInterval(currentWeekStart, { start: breakStart, end: breakEnd }) ||
               isWithinInterval(addDays(currentWeekStart, 6), { start: breakStart, end: breakEnd });
      });
      
      if (!isBreakWeek) {
        const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
          .filter(day => isWithinInterval(day, { start: termStart, end: termEnd }));
        
        if (days.length > 0) {
          weeks.push({
            weekNumber,
            startDate: currentWeekStart,
            days,
          });
          weekNumber++;
        }
      }
      
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return weeks;
  }, [term]);

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
              {termWeeks.map(week => (
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
                    
                    return (
                      <td key={dayInfo.value} className="p-2 border-l align-top">
                        <div className="space-y-2">
                          {classesForDay.map((cls: any) => {
                            const isSelected = isSlotSelected(cls.id, dayDate);
                            
                            return (
                              <div key={cls.id} className="text-center">
                                <div className="text-xs font-medium text-foreground truncate">
                                  {cls.class_type}
                                </div>
                                <div className="text-[10px] text-muted-foreground mb-1">
                                  {formatTime(cls.start_time)}-{formatTime(cls.end_time)}
                                </div>
                                <button
                                  onClick={() => handleToggleSlot(cls.id, dayDate)}
                                  disabled={!isSelected && isAtLimit}
                                  className={`
                                    px-2 py-1 rounded text-xs font-medium transition-all w-full
                                    ${isSelected 
                                      ? 'bg-primary text-primary-foreground' 
                                      : isAtLimit
                                        ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                    }
                                  `}
                                >
                                  {format(dayDate, 'EEE d')}
                                </button>
                              </div>
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
