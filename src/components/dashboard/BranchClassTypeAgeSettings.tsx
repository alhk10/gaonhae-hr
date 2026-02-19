import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { CLASS_TYPES } from '@/services/branchTimetableService';
import {
  getBranchClassTypeSettings,
  upsertBranchClassTypeSetting,
  type BranchClassTypeSetting,
} from '@/services/branchClassTypeSettingsService';
import { getClassTypeColors } from '@/utils/classTypeColors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
}

interface AgeRow {
  class_type: string;
  min_age: string;
  max_age: string;
}

const BranchClassTypeAgeSettings: React.FC<Props> = ({ open, onOpenChange, branchId, branchName }) => {
  const [rows, setRows] = useState<AgeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, branchId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getBranchClassTypeSettings(branchId);
      const settingsMap = new Map<string, BranchClassTypeSetting>();
      settings.forEach(s => settingsMap.set(s.class_type, s));

      setRows(
        CLASS_TYPES.map(ct => {
          const existing = settingsMap.get(ct);
          return {
            class_type: ct,
            min_age: existing?.min_age != null ? String(existing.min_age) : '',
            max_age: existing?.max_age != null ? String(existing.max_age) : '',
          };
        })
      );
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, field: 'min_age' | 'max_age', value: string) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    // Validate
    for (const row of rows) {
      const min = row.min_age ? Number(row.min_age) : null;
      const max = row.max_age ? Number(row.max_age) : null;
      if (min !== null && max !== null && min > max) {
        toast.error(`${row.class_type}: Min age cannot be greater than max age`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const row of rows) {
        const min = row.min_age ? Number(row.min_age) : null;
        const max = row.max_age ? Number(row.max_age) : null;
        await upsertBranchClassTypeSetting(branchId, row.class_type, min, max);
      }
      toast.success('Class type age settings saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{branchName} – Class Type Age Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-center text-sm font-medium text-muted-foreground">
              <span>Class Type</span>
              <span className="text-center">Min Age</span>
              <span className="text-center">Max Age</span>
            </div>

            {rows.map((row, index) => {
              const colors = getClassTypeColors(row.class_type);
              return (
                <div
                  key={row.class_type}
                  className="grid grid-cols-[1fr_80px_80px] gap-2 items-center"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <span className="text-sm font-medium truncate">{row.class_type}</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    placeholder="–"
                    value={row.min_age}
                    onChange={e => handleChange(index, 'min_age', e.target.value)}
                    className="h-8 text-center text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    placeholder="–"
                    value={row.max_age}
                    onChange={e => handleChange(index, 'max_age', e.target.value)}
                    className="h-8 text-center text-sm"
                  />
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BranchClassTypeAgeSettings;
