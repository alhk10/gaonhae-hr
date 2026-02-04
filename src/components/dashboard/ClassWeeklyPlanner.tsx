/**
 * Class Weekly Planner Component
 * Displays a weekly calendar view of student enrolled classes with swap functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Users, 
  Clock,
  ArrowRightLeft,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getScheduledClasses, type ScheduledClass } from '@/services/classEnrollmentService';
import { ClassSwapDialog } from './ClassSwapDialog';
import { getClassTypeColors } from '@/utils/classTypeColors';

interface Branch {
  id: string;
  name: string;
  color: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ClassWeeklyPlanner() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Calculate week start and end
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, color');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch scheduled classes for the week
  const { data: scheduledClasses = [], isLoading, refetch } = useQuery({
    queryKey: ['scheduled-classes', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), selectedBranch],
    queryFn: async () => {
      return getScheduledClasses(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        selectedBranch !== 'all' ? selectedBranch : undefined
      );
    },
    staleTime: 60 * 1000,
  });

  // Group classes by day
  const classesByDay = useMemo(() => {
    const grouped: Record<string, ScheduledClass[]> = {};
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = [];
    }

    scheduledClasses.forEach(sc => {
      if (grouped[sc.scheduled_date]) {
        grouped[sc.scheduled_date].push(sc);
      }
    });

    // Sort each day's classes by start time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [scheduledClasses, weekStart]);

  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToPrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const handleClassClick = (sc: ScheduledClass) => {
    setSelectedClass(sc);
    setShowSwapDialog(true);
  };

  const handleSwapComplete = () => {
    setShowSwapDialog(false);
    setSelectedClass(null);
    refetch();
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'swapped': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const totalClassesThisWeek = scheduledClasses.filter(sc => sc.status === 'scheduled' || sc.status === 'attended').length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Class Weekly Planner</CardTitle>
            <Badge variant="outline" className="ml-2">
              {totalClassesThisWeek} classes
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={goToPrevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-1">
          Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {Object.keys(classesByDay).map((dateKey, index) => {
              const date = parseISO(dateKey);
              const isToday = isSameDay(date, new Date());
              
              return (
                <div key={dateKey} className="text-center">
                  <div className={`rounded-lg p-2 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <div className="text-xs font-medium">
                      {SHORT_WEEKDAYS[(index + 1) % 7]}
                    </div>
                    <div className="text-lg font-bold">
                      {format(date, 'd')}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Class Cards for Each Day */}
            {Object.entries(classesByDay).map(([dateKey, classes]) => (
              <div key={`classes-${dateKey}`} className="min-h-[200px]">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-1 p-1">
                    {classes.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No classes
                      </div>
                    ) : (
                      classes.map(sc => (
                        <button
                          key={sc.id}
                          onClick={() => handleClassClick(sc)}
                          className={`w-full text-left p-2 rounded-md border text-xs transition-all hover:shadow-md ${getStatusColor(sc.status)}`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">
                              {formatTime(sc.start_time)}
                            </span>
                          </div>
                          <div className="font-semibold truncate">
                            {sc.student_name}
                          </div>
                          <div className={`text-[10px] truncate font-medium ${getClassTypeColors(sc.class_type).text}`}>
                            {sc.class_type}
                          </div>
                          {sc.swapped_from_id && (
                            <div className="flex items-center gap-1 mt-1 text-[10px]">
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Swapped</span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            <span className="text-xs text-muted-foreground">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            <span className="text-xs text-muted-foreground">Attended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
            <span className="text-xs text-muted-foreground">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" />
            <span className="text-xs text-muted-foreground">Swapped</span>
          </div>
        </div>
      </CardContent>

      {/* Swap Dialog */}
      {selectedClass && (
        <ClassSwapDialog
          scheduledClass={selectedClass}
          open={showSwapDialog}
          onOpenChange={setShowSwapDialog}
          onSwapComplete={handleSwapComplete}
        />
      )}
    </Card>
  );
}
