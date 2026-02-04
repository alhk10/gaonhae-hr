import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CalendarDays, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WEEKDAYS, formatTime, ClassSchedule } from '@/services/branchTimetableService';

interface ClassScheduleSelectorProps {
  branchId: string;
  studentAge: number; // Age in years (can be decimal like 4.5)
  selectedSlots: string[];
  onSlotsChange: (slots: string[]) => void;
}

const ClassScheduleSelector: React.FC<ClassScheduleSelectorProps> = ({
  branchId,
  studentAge,
  selectedSlots,
  onSlotsChange,
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
  const eligibleClasses = allClasses.filter((cls: any) => {
    // If no age restrictions, include the class
    if (!cls.age_from && !cls.age_to) return true;
    
    const minAge = cls.age_from || 0;
    const maxAge = cls.age_to || 100;
    
    return studentAge >= minAge && studentAge <= maxAge;
  });

  // Group classes by weekday
  const classesByDay = WEEKDAYS.map(day => ({
    ...day,
    classes: eligibleClasses.filter((cls: any) => cls.weekday === day.value),
  })).filter(day => day.classes.length > 0);

  const handleToggleSlot = (slotId: string) => {
    if (selectedSlots.includes(slotId)) {
      onSlotsChange(selectedSlots.filter(id => id !== slotId));
    } else {
      onSlotsChange([...selectedSlots, slotId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classesByDay.length === 0) {
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
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <CalendarDays className="w-4 h-4" />
        <span>Select classes you want to attend (Age: {studentAge.toFixed(1)} years)</span>
      </div>

      <div className="grid gap-3">
        {classesByDay.map((day) => (
          <div key={day.value} className="space-y-2">
            <div className="font-medium text-sm text-muted-foreground">{day.label}</div>
            <div className="grid gap-2">
              {day.classes.map((cls: any) => {
                const isSelected = selectedSlots.includes(cls.id);
                return (
                  <Card
                    key={cls.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleToggleSlot(cls.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSlot(cls.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cls.class_type}</span>
                            {cls.age_from && cls.age_to && (
                              <Badge variant="outline" className="text-xs">
                                {cls.age_from}-{cls.age_to} yrs
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedSlots.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          {selectedSlots.length} class{selectedSlots.length > 1 ? 'es' : ''} selected
        </div>
      )}
    </div>
  );
};

export default ClassScheduleSelector;
