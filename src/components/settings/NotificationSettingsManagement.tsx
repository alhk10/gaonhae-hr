import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, RefreshCw, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  getNotificationTemplates,
  updateNotificationTemplate,
  resetNotificationTemplate,
  TEMPLATE_VARIABLES,
  NotificationTemplate
} from '@/services/notificationTemplateService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TEMPLATE_LABELS: Record<string, { name: string; description: string }> = {
  clock_out_reminder: {
    name: 'Clock-Out Reminder',
    description: 'Sent to casual employees who have been clocked in for 5+ hours'
  },
  tomorrow_slot_reminder: {
    name: 'Tomorrow Slot Reminder',
    description: 'Sent at 9 PM SGT to remind employees about their slot the next day'
  },
  booking_reminder: {
    name: 'Booking Period Reminder',
    description: 'Sent on the 14th and 28th of each month to remind employees to book slots'
  }
};

export function NotificationSettingsManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<NotificationTemplate>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getNotificationTemplates();
      setTemplates(data);
      setEditedTemplates({});
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load notification templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (templateKey: string, field: keyof NotificationTemplate, value: any) => {
    setEditedTemplates(prev => ({
      ...prev,
      [templateKey]: {
        ...prev[templateKey],
        [field]: value
      }
    }));
  };

  const getEditedValue = (template: NotificationTemplate, field: keyof NotificationTemplate) => {
    return editedTemplates[template.template_key]?.[field] ?? template[field];
  };

  const hasChanges = (templateKey: string) => {
    return Object.keys(editedTemplates[templateKey] || {}).length > 0;
  };

  const handleSave = async (templateKey: string) => {
    const changes = editedTemplates[templateKey];
    if (!changes) return;

    setSavingKey(templateKey);
    try {
      await updateNotificationTemplate(templateKey, changes);
      toast.success('Template saved successfully');
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async (templateKey: string) => {
    setSavingKey(templateKey);
    try {
      await resetNotificationTemplate(templateKey);
      toast.success('Template reset to default');
      await loadTemplates();
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Failed to reset template');
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Push Notification Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize the content of push notifications sent to casual employees
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTemplates}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {templates.map(template => {
        const templateInfo = TEMPLATE_LABELS[template.template_key];
        const variables = TEMPLATE_VARIABLES[template.template_key as keyof typeof TEMPLATE_VARIABLES] || [];

        return (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    {templateInfo?.name || template.template_key}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${template.template_key}`} className="text-sm">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${template.template_key}`}
                    checked={getEditedValue(template, 'enabled') as boolean}
                    onCheckedChange={(checked) => 
                      handleFieldChange(template.template_key, 'enabled', checked)
                    }
                  />
                </div>
              </div>
              <CardDescription>
                {templateInfo?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`title-${template.template_key}`}>Notification Title</Label>
                <Input
                  id={`title-${template.template_key}`}
                  value={getEditedValue(template, 'title') as string}
                  onChange={(e) => 
                    handleFieldChange(template.template_key, 'title', e.target.value)
                  }
                  placeholder="Notification title"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`body-${template.template_key}`}>Notification Body</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Info className="h-4 w-4 mr-1" />
                          Variables
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Available variables:</p>
                          {variables.map(v => (
                            <p key={v.variable} className="text-xs">
                              <code className="bg-muted px-1 rounded">{v.variable}</code>
                              <span className="ml-1">{v.description}</span>
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id={`body-${template.template_key}`}
                  value={getEditedValue(template, 'body') as string}
                  onChange={(e) => 
                    handleFieldChange(template.template_key, 'body', e.target.value)
                  }
                  placeholder="Notification body"
                  rows={3}
                />
              </div>

              {variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {variables.map(v => (
                    <Badge key={v.variable} variant="secondary" className="text-xs">
                      {v.variable}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset(template.template_key)}
                  disabled={savingKey === template.template_key}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(template.template_key)}
                  disabled={!hasChanges(template.template_key) || savingKey === template.template_key}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Setup Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Push notifications require employees to enable notifications in their browser.
            They can do this from the "My Attendance" page.
          </p>
          <p>
            <strong>Clock-out reminders:</strong> Checked every 15 minutes for employees clocked in 5+ hours.
          </p>
          <p>
            <strong>Tomorrow slot reminders:</strong> Sent at 9 PM SGT daily.
          </p>
          <p>
            <strong>Booking reminders:</strong> Sent on the 14th and 28th of each month.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
