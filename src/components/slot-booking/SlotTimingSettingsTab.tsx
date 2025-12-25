import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getActivePricingConfig, SlotTimingConfig } from '@/services/slotPricingService';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

interface SlotTimingSettingsTabProps {
  onConfigChange?: (config: Partial<SlotTimingConfig>) => void;
}

export const SlotTimingSettingsTab = ({ onConfigChange }: SlotTimingSettingsTabProps) => {
  const [config, setConfig] = useState<SlotTimingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const data = await getActivePricingConfig();
    if (data) {
      setConfig({
        monday_start_time: data.monday_start_time || '09:00',
        monday_end_time: data.monday_end_time || '21:00',
        tuesday_start_time: data.tuesday_start_time || '09:00',
        tuesday_end_time: data.tuesday_end_time || '21:00',
        wednesday_start_time: data.wednesday_start_time || '09:00',
        wednesday_end_time: data.wednesday_end_time || '21:00',
        thursday_start_time: data.thursday_start_time || '09:00',
        thursday_end_time: data.thursday_end_time || '21:00',
        friday_start_time: data.friday_start_time || '09:00',
        friday_end_time: data.friday_end_time || '21:00',
        saturday_start_time: data.saturday_start_time || '09:00',
        saturday_end_time: data.saturday_end_time || '21:00',
        sunday_start_time: data.sunday_start_time || '09:00',
        sunday_end_time: data.sunday_end_time || '21:00',
      });
    }
    setLoading(false);
  };

  const handleChange = (field: keyof SlotTimingConfig, value: string) => {
    if (!config) return;
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange?.({ [field]: value });
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No timing configuration found. Please create a pricing configuration first.
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <h3 className="text-lg font-medium">Slot Timing Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure the start and end time for slots on each day of the week.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Slot Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {DAYS.map(({ key, label }) => {
              const startField = `${key}_start_time` as keyof SlotTimingConfig;
              const endField = `${key}_end_time` as keyof SlotTimingConfig;
              
              return (
                <div key={key} className="grid grid-cols-5 items-center gap-4">
                  <Label className="font-medium">{label}</Label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Start</Label>
                    <Input
                      type="time"
                      value={config[startField] || '09:00'}
                      onChange={(e) => handleChange(startField, e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">End</Label>
                    <Input
                      type="time"
                      value={config[endField] || '21:00'}
                      onChange={(e) => handleChange(endField, e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
