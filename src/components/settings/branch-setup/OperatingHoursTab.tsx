import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  WEEKDAYS,
  getBranchOperatingSchedule,
  saveBranchOperatingSchedule,
} from '@/services/branchOperatingService';

interface DayEditor {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  notes: string;
}

const defaultDays = (): DayEditor[] =>
  WEEKDAYS.map((d) => ({
    weekday: d.value,
    is_open: d.value >= 1 && d.value <= 5,
    open_time: '09:00',
    close_time: '21:00',
    notes: '',
  }));

interface Props {
  branchId: string;
}

export const OperatingHoursTab: React.FC<Props> = ({ branchId }) => {
  const [days, setDays] = useState<DayEditor[]>(defaultDays());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getBranchOperatingSchedule(branchId);
        if (cancelled) return;
        setDays(
          WEEKDAYS.map((d) => {
            const existing = data.find((x) => x.weekday === d.value);
            return {
              weekday: d.value,
              is_open: existing?.is_open ?? (d.value >= 1 && d.value <= 5),
              open_time: existing?.open_time || '09:00',
              close_time: existing?.close_time || '21:00',
              notes: existing?.notes || '',
            };
          })
        );
      } catch (e) {
        toast.error('Failed to load operating hours');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId]);

  const updateDay = (weekday: number, field: keyof DayEditor, value: any) => {
    setDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBranchOperatingSchedule(branchId, days);
      toast.success('Operating hours saved');
    } catch (e) {
      toast.error('Failed to save operating hours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure operating days. This affects term week calculations and slot availability.
      </p>
      <div className="grid gap-2">
        {WEEKDAYS.map((day) => {
          const d = days.find((x) => x.weekday === day.value)!;
          return (
            <div
              key={day.value}
              className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
                d.is_open ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className="w-28 flex items-center gap-2">
                <Switch
                  checked={d.is_open}
                  onCheckedChange={(v) => updateDay(day.value, 'is_open', v)}
                />
                <Label className={`text-sm font-medium ${!d.is_open && 'text-muted-foreground'}`}>
                  {day.label}
                </Label>
              </div>

              {d.is_open ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Open</Label>
                    <Input
                      type="time"
                      value={d.open_time}
                      onChange={(e) => updateDay(day.value, 'open_time', e.target.value)}
                      className="w-28 h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Close</Label>
                    <Input
                      type="time"
                      value={d.close_time}
                      onChange={(e) => updateDay(day.value, 'close_time', e.target.value)}
                      className="w-28 h-8"
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={d.notes}
                    onChange={(e) => updateDay(day.value, 'notes', e.target.value)}
                    className="flex-1 h-8 min-w-[180px]"
                  />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Operating Hours
        </Button>
      </div>
    </div>
  );
};
