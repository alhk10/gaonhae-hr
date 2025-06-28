
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { Clock, Building, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceSetting {
  id: string;
  branch_name: string;
  monday_start: string | null;
  monday_end: string | null;
  tuesday_start: string | null;
  tuesday_end: string | null;
  wednesday_start: string | null;
  wednesday_end: string | null;
  thursday_start: string | null;
  thursday_end: string | null;
  friday_start: string | null;
  friday_end: string | null;
  saturday_start: string | null;
  saturday_end: string | null;
  sunday_start: string | null;
  sunday_end: string | null;
  grace_period_minutes: number;
  is_active: boolean;
}

interface AttendanceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const AttendanceSettings: React.FC<AttendanceSettingsProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AttendanceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .order('branch_name');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading attendance settings:', error);
      toast('Error loading attendance settings');
    } finally {
      setLoading(false);
    }
  };

  const addNewBranch = async () => {
    if (!newBranchName.trim()) {
      toast('Please enter a branch name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .insert({
          branch_name: newBranchName.trim(),
          monday_start: '09:00',
          monday_end: '18:00',
          tuesday_start: '09:00',
          tuesday_end: '18:00',
          wednesday_start: '09:00',
          wednesday_end: '18:00',
          thursday_start: '09:00',
          thursday_end: '18:00',
          friday_start: '09:00',
          friday_end: '18:00',
          saturday_start: '09:00',
          saturday_end: '17:00',
          sunday_start: '10:00',
          sunday_end: '16:00',
          grace_period_minutes: 15,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setSettings([...settings, data]);
      setNewBranchName('');
      toast('New branch added successfully');
    } catch (error) {
      console.error('Error adding new branch:', error);
      toast('Error adding new branch');
    }
  };

  const updateSetting = (id: string, field: string, value: any) => {
    setSettings(settings.map(setting => 
      setting.id === id ? { ...setting, [field]: value } : setting
    ));
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch setting?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSettings(settings.filter(setting => setting.id !== id));
      toast('Branch setting deleted successfully');
    } catch (error) {
      console.error('Error deleting branch setting:', error);
      toast('Error deleting branch setting');
    }
  };

  const saveAllSettings = async () => {
    try {
      setSaving(true);
      
      for (const setting of settings) {
        const { error } = await supabase
          .from('attendance_settings')
          .update({
            branch_name: setting.branch_name,
            monday_start: setting.monday_start,
            monday_end: setting.monday_end,
            tuesday_start: setting.tuesday_start,
            tuesday_end: setting.tuesday_end,
            wednesday_start: setting.wednesday_start,
            wednesday_end: setting.wednesday_end,
            thursday_start: setting.thursday_start,
            thursday_end: setting.thursday_end,
            friday_start: setting.friday_start,
            friday_end: setting.friday_end,
            saturday_start: setting.saturday_start,
            saturday_end: setting.saturday_end,
            sunday_start: setting.sunday_start,
            sunday_end: setting.sunday_end,
            grace_period_minutes: setting.grace_period_minutes,
            is_active: setting.is_active
          })
          .eq('id', setting.id);

        if (error) throw error;
      }

      toast('All settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Attendance Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure working hours and grace periods for each branch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Branch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add New Branch</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Branch name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addNewBranch}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Branch
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Branch Settings */}
          {settings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-4 h-4" />
                    <span>{setting.branch_name}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`active-${setting.id}`}>Active</Label>
                    <Switch
                      id={`active-${setting.id}`}
                      checked={setting.is_active}
                      onCheckedChange={(checked) => updateSetting(setting.id, 'is_active', checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBranch(setting.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Branch Name */}
                  <div>
                    <Label htmlFor={`branch-name-${setting.id}`}>Branch Name</Label>
                    <Input
                      id={`branch-name-${setting.id}`}
                      value={setting.branch_name}
                      onChange={(e) => updateSetting(setting.id, 'branch_name', e.target.value)}
                    />
                  </div>

                  {/* Grace Period */}
                  <div>
                    <Label htmlFor={`grace-${setting.id}`}>Grace Period (minutes)</Label>
                    <Input
                      id={`grace-${setting.id}`}
                      type="number"
                      min="0"
                      max="60"
                      value={setting.grace_period_minutes}
                      onChange={(e) => updateSetting(setting.id, 'grace_period_minutes', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  {/* Working Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daysOfWeek.map((day) => (
                      <div key={day.key} className="space-y-2">
                        <Label className="font-medium">{day.label}</Label>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <Label htmlFor={`${day.key}-start-${setting.id}`} className="text-xs">Start</Label>
                            <Input
                              id={`${day.key}-start-${setting.id}`}
                              type="time"
                              value={setting[`${day.key}_start` as keyof AttendanceSetting] as string || ''}
                              onChange={(e) => updateSetting(setting.id, `${day.key}_start`, e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`${day.key}-end-${setting.id}`} className="text-xs">End</Label>
                            <Input
                              id={`${day.key}-end-${setting.id}`}
                              type="time"
                              value={setting[`${day.key}_end` as keyof AttendanceSetting] as string || ''}
                              onChange={(e) => updateSetting(setting.id, `${day.key}_end`, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Save Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveAllSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceSettings;
