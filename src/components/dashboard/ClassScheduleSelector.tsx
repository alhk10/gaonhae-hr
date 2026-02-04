import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WEEKDAYS, formatTime } from '@/services/branchTimetableService';
import { format, addWeeks, startOfWeek, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { Term } from '@/services/termCalendarService';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ClassScheduleSelectorProps {
  branchId: string;
  studentAge: number;
  selectedSlots: string[]; // Format: "classId_YYYY-MM-DD"
  onSlotsChange: (slots: string[]) => void;
  term: Term;
}

const ClassScheduleSelector: React.FC<ClassScheduleSelectorProps> = ({
  branchId,
  studentAge,
  selectedSlots,
  onSlotsChange,
  term,
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

  // Get classes for a specific weekday
  const getClassesForWeekday = (weekday: number) => {
    return eligibleClasses.filter((cls: any) => cls.weekday === weekday);
  };

  // Toggle a specific class on a specific date
  const handleToggleSlot = (classId: string, date: Date) => {
    const slotKey = `${classId}_${format(date, 'yyyy-MM-dd')}`;
    if (selectedSlots.includes(slotKey)) {
      onSlotsChange(selectedSlots.filter(s => s !== slotKey));
    } else {
      onSlotsChange([...selectedSlots, slotKey]);
    }
  };

  // Check if a slot is selected
  const isSlotSelected = (classId: string, date: Date) => {
    const slotKey = `${classId}_${format(date, 'yyyy-MM-dd')}`;
    return selectedSlots.includes(slotKey);
  };

  // Toggle all slots for a class across all weeks
  const handleToggleAllForClass = (classId: string) => {
    const allSlotsForClass: string[] = [];
    
    termWeeks.forEach(week => {
      week.days.forEach(day => {
        const weekday = day.getDay();
        const classes = getClassesForWeekday(weekday);
        if (classes.some((c: any) => c.id === classId)) {
          allSlotsForClass.push(`${classId}_${format(day, 'yyyy-MM-dd')}`);
        }
      });
    });
    
    const allSelected = allSlotsForClass.every(slot => selectedSlots.includes(slot));
    
    if (allSelected) {
      // Deselect all
      onSlotsChange(selectedSlots.filter(s => !allSlotsForClass.includes(s)));
    } else {
      // Select all
      const newSlots = [...selectedSlots];
      allSlotsForClass.forEach(slot => {
        if (!newSlots.includes(slot)) {
          newSlots.push(slot);
        }
      });
      onSlotsChange(newSlots);
    }
  };

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

  // Get unique classes (by day pattern)
  const uniqueClasses = eligibleClasses.reduce((acc: any[], cls: any) => {
    const existing = acc.find(c => 
      c.class_type === cls.class_type && 
      c.start_time === cls.start_time &&
      c.end_time === cls.end_time
    );
    if (!existing) {
      acc.push(cls);
    }
    return acc;
  }, []);

  // Get all weekdays that have this class type
  const getWeekdaysForClass = (classType: string, startTime: string, endTime: string) => {
    return eligibleClasses
      .filter((c: any) => 
        c.class_type === classType && 
        c.start_time === startTime &&
        c.end_time === endTime
      )
      .map((c: any) => c.weekday);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <CalendarDays className="w-4 h-4" />
        <span>Select classes you want to attend (Age: {studentAge.toFixed(1)} years)</span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="min-w-max">
          {/* Header row with class columns */}
          <div className="flex border-b">
            <div className="w-24 flex-shrink-0 p-2 font-medium text-sm bg-muted/50">
              Term
            </div>
            {uniqueClasses.map((cls: any) => {
              const weekdaysForClass = getWeekdaysForClass(cls.class_type, cls.start_time, cls.end_time);
              
              return (
                <div 
                  key={`${cls.class_type}-${cls.start_time}`} 
                  className="w-32 flex-shrink-0 p-2 text-center border-l bg-muted/50"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Checkbox
                      checked={termWeeks.every(week => 
                        week.days.every(day => {
                          if (!weekdaysForClass.includes(day.getDay())) return true;
                          const matchingClass = eligibleClasses.find((c: any) => 
                            c.class_type === cls.class_type && 
                            c.start_time === cls.start_time &&
                            c.weekday === day.getDay()
                          );
                          return matchingClass ? isSlotSelected(matchingClass.id, day) : true;
                        })
                      )}
                      onCheckedChange={() => {
                        const classIds = eligibleClasses
                          .filter((c: any) => 
                            c.class_type === cls.class_type && 
                            c.start_time === cls.start_time
                          )
                          .map((c: any) => c.id);
                        classIds.forEach((id: string) => handleToggleAllForClass(id));
                      }}
                      className="flex-shrink-0"
                    />
                  </div>
                  <div className="font-medium text-xs truncate">{cls.class_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                  </div>
                  {cls.age_from && cls.age_to && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {cls.age_from}-{cls.age_to} yrs
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {weekdaysForClass.map(wd => WEEKDAYS.find(w => w.value === wd)?.short).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week rows */}
          {termWeeks.map((week) => (
            <div key={week.weekNumber} className="flex border-b hover:bg-muted/20">
              {/* Week info column */}
              <div className="w-24 flex-shrink-0 p-2 font-medium text-sm bg-muted/30">
                <div>Week {week.weekNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {format(week.startDate, 'dd MMM')}
                </div>
              </div>

              {/* Class columns */}
              {uniqueClasses.map((cls: any) => {
                const weekdaysForClass = getWeekdaysForClass(cls.class_type, cls.start_time, cls.end_time);
                
                // Find if any day in this week has this class
                const daysWithClass = week.days.filter(day => 
                  weekdaysForClass.includes(day.getDay())
                );

                if (daysWithClass.length === 0) {
                  return (
                    <div 
                      key={`${cls.class_type}-${cls.start_time}`} 
                      className="w-32 flex-shrink-0 p-2 border-l bg-muted/10 flex items-center justify-center"
                    >
                      <span className="text-xs text-muted-foreground">-</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={`${cls.class_type}-${cls.start_time}`} 
                    className="w-32 flex-shrink-0 p-1 border-l flex flex-row flex-wrap gap-1 items-center justify-center"
                  >
                    {daysWithClass.map(day => {
                      const matchingClass = eligibleClasses.find((c: any) => 
                        c.class_type === cls.class_type && 
                        c.start_time === cls.start_time &&
                        c.weekday === day.getDay()
                      );
                      
                      if (!matchingClass) return null;
                      
                      const isSelected = isSlotSelected(matchingClass.id, day);
                      
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => handleToggleSlot(matchingClass.id, day)}
                          className={`
                            px-1.5 py-1 rounded text-xs font-medium transition-all
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                            }
                          `}
                        >
                          {format(day, 'EEE d')}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {selectedSlots.length > 0 && (
        <div className="text-sm text-muted-foreground text-right pt-2 border-t">
          {selectedSlots.length} session{selectedSlots.length > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default ClassScheduleSelector;
