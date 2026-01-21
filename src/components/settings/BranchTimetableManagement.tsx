import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Clock, Building2, Save, Loader2 } from 'lucide-react';
import {
  BranchSchedule,
  BranchOperatingDay,
  WEEKDAYS,
  getAllBranchSchedules,
  saveBranchOperatingSchedule
} from '@/services/branchOperatingService';

interface BranchDayEditor {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  notes: string;
}

const defaultDays = (): BranchDayEditor[] => {
  return WEEKDAYS.map(day => ({
    weekday: day.value,
    is_open: day.value >= 1 && day.value <= 5, // Mon-Fri default open
    open_time: '09:00',
    close_time: '21:00',
    notes: ''
  }));
};

export function BranchTimetableManagement() {
  const [schedules, setSchedules] = useState<BranchSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState<string | null>(null);
  const [editedSchedules, setEditedSchedules] = useState<Record<string, BranchDayEditor[]>>({});

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getAllBranchSchedules();
      setSchedules(data);
      
      // Initialize edited schedules
      const edited: Record<string, BranchDayEditor[]> = {};
      data.forEach(schedule => {
        if (schedule.days.length > 0) {
          edited[schedule.branch_id] = WEEKDAYS.map(day => {
            const existing = schedule.days.find(d => d.weekday === day.value);
            return {
              weekday: day.value,
              is_open: existing?.is_open ?? (day.value >= 1 && day.value <= 5),
              open_time: existing?.open_time || '09:00',
              close_time: existing?.close_time || '21:00',
              notes: existing?.notes || ''
            };
          });
        } else {
          edited[schedule.branch_id] = defaultDays();
        }
      });
      setEditedSchedules(edited);
    } catch (error) {
      toast.error('Failed to load branch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (branchId: string, weekday: number, field: keyof BranchDayEditor, value: any) => {
    setEditedSchedules(prev => ({
      ...prev,
      [branchId]: (prev[branchId] || defaultDays()).map(day =>
        day.weekday === weekday ? { ...day, [field]: value } : day
      )
    }));
  };

  const handleSave = async (branchId: string) => {
    setSavingBranch(branchId);
    try {
      const days = editedSchedules[branchId] || defaultDays();
      await saveBranchOperatingSchedule(branchId, days);
      toast.success('Schedule saved successfully');
      loadSchedules();
    } catch (error) {
      toast.error('Failed to save schedule');
    } finally {
      setSavingBranch(null);
    }
  };

  const getOpenDaysCount = (branchId: string): number => {
    const days = editedSchedules[branchId] || [];
    return days.filter(d => d.is_open).length;
  };

  const getOpenDaysSummary = (branchId: string): string => {
    const days = editedSchedules[branchId] || [];
    const openDays = days.filter(d => d.is_open).map(d => 
      WEEKDAYS.find(w => w.value === d.weekday)?.short || ''
    );
    return openDays.join(', ') || 'No days configured';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <p className="text-sm">
          Configure operating days for each branch. This affects term week calculations.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {schedules.map(schedule => (
          <AccordionItem 
            key={schedule.branch_id} 
            value={schedule.branch_id}
            className="border rounded-lg bg-card"
          >
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{schedule.branch_name}</span>
                <Badge variant="secondary" className="ml-2">
                  {getOpenDaysCount(schedule.branch_id)} days/week
                </Badge>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {getOpenDaysSummary(schedule.branch_id)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Day toggles */}
                <div className="grid gap-3">
                  {WEEKDAYS.map(day => {
                    const dayData = (editedSchedules[schedule.branch_id] || defaultDays())
                      .find(d => d.weekday === day.value);
                    const isOpen = dayData?.is_open ?? false;

                    return (
                      <div 
                        key={day.value} 
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          isOpen ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <div className="w-24 flex items-center gap-2">
                          <Switch
                            checked={isOpen}
                            onCheckedChange={(checked) => 
                              handleDayChange(schedule.branch_id, day.value, 'is_open', checked)
                            }
                          />
                          <Label className={`text-sm font-medium ${!isOpen && 'text-muted-foreground'}`}>
                            {day.label}
                          </Label>
                        </div>

                        {isOpen && (
                          <>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Open</Label>
                              <Input
                                type="time"
                                value={dayData?.open_time || '09:00'}
                                onChange={(e) => 
                                  handleDayChange(schedule.branch_id, day.value, 'open_time', e.target.value)
                                }
                                className="w-28 h-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Close</Label>
                              <Input
                                type="time"
                                value={dayData?.close_time || '21:00'}
                                onChange={(e) => 
                                  handleDayChange(schedule.branch_id, day.value, 'close_time', e.target.value)
                                }
                                className="w-28 h-8"
                              />
                            </div>
                            <Input
                              placeholder="Notes (optional)"
                              value={dayData?.notes || ''}
                              onChange={(e) => 
                                handleDayChange(schedule.branch_id, day.value, 'notes', e.target.value)
                              }
                              className="flex-1 h-8 hidden md:block"
                            />
                          </>
                        )}

                        {!isOpen && (
                          <span className="text-sm text-muted-foreground">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSave(schedule.branch_id)}
                    disabled={savingBranch === schedule.branch_id}
                  >
                    {savingBranch === schedule.branch_id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Schedule
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {schedules.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No branches found.</p>
            <p className="text-sm">Add branches in the Branches tab first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
