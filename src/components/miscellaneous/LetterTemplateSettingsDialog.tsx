import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { GraduationCap, Briefcase, RotateCcw } from 'lucide-react';

export interface LetterTemplates {
  studentBody: string;
  studentClosing: string;
  employeeBody: string;
  employeeClosing: string;
}

const DEFAULT_TEMPLATES: LetterTemplates = {
  studentBody: 'This is to certify that {fullName} is a student currently registered at Gaonhae Taekwondo.',
  studentClosing: 'This letter is issued upon request for {fullName}\'s reference.',
  employeeBody: 'This is to certify that {fullName} is employed at Gaonhae Taekwondo LLP.',
  employeeClosing: 'This letter is issued upon request for {fullName}\'s reference.',
};

const STORAGE_KEY = 'verification-letter-templates';

export const getLetterTemplates = (): LetterTemplates => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  return DEFAULT_TEMPLATES;
};

export const saveLetterTemplates = (templates: LetterTemplates): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

interface LetterTemplateSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LetterTemplateSettingsDialog: React.FC<LetterTemplateSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [templates, setTemplates] = useState<LetterTemplates>(DEFAULT_TEMPLATES);
  const [activeTab, setActiveTab] = useState('student');

  useEffect(() => {
    if (isOpen) {
      setTemplates(getLetterTemplates());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveLetterTemplates(templates);
    toast.success('Letter templates saved successfully');
    onClose();
  };

  const handleReset = (type: 'student' | 'employee') => {
    if (type === 'student') {
      setTemplates(prev => ({
        ...prev,
        studentBody: DEFAULT_TEMPLATES.studentBody,
        studentClosing: DEFAULT_TEMPLATES.studentClosing,
      }));
    } else {
      setTemplates(prev => ({
        ...prev,
        employeeBody: DEFAULT_TEMPLATES.employeeBody,
        employeeClosing: DEFAULT_TEMPLATES.employeeClosing,
      }));
    }
    toast.info(`${type === 'student' ? 'Student' : 'Employee'} template reset to default`);
  };

  const handleResetAll = () => {
    setTemplates(DEFAULT_TEMPLATES);
    toast.info('All templates reset to default');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Letter Template Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Student Letter
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employee Letter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-2">Available placeholders:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p><code className="bg-background px-1 rounded">{'{fullName}'}</code> - Full name</p>
                  <p><code className="bg-background px-1 rounded">{'{firstName}'}</code> - First name</p>
                  <p><code className="bg-background px-1 rounded">{'{lastName}'}</code> - Last name</p>
                  <p><code className="bg-background px-1 rounded">{'{dateOfBirth}'}</code> - Date of birth</p>
                  <p><code className="bg-background px-1 rounded">{'{nricPassport}'}</code> - NRIC/Passport</p>
                  <p><code className="bg-background px-1 rounded">{'{currentBelt}'}</code> - Belt level</p>
                  <p><code className="bg-background px-1 rounded">{'{enrollmentDate}'}</code> - Member since</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset('student')}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Student Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentBody">Body Paragraph</Label>
                <Textarea
                  id="studentBody"
                  value={templates.studentBody}
                  onChange={(e) => setTemplates(prev => ({ ...prev, studentBody: e.target.value }))}
                  placeholder="Enter the main body text..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This appears after "STUDENT VERIFICATION LETTER" heading
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentClosing">Closing Statement</Label>
                <Textarea
                  id="studentClosing"
                  value={templates.studentClosing}
                  onChange={(e) => setTemplates(prev => ({ ...prev, studentClosing: e.target.value }))}
                  placeholder="Enter the closing statement..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This appears after the student details section
                </p>
              </div>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-2">Available placeholders:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p><code className="bg-background px-1 rounded">{'{fullName}'}</code> - Full name</p>
                  <p><code className="bg-background px-1 rounded">{'{dateOfBirth}'}</code> - Date of birth</p>
                  <p><code className="bg-background px-1 rounded">{'{nric}'}</code> - NRIC number</p>
                  <p><code className="bg-background px-1 rounded">{'{position}'}</code> - Job position</p>
                  <p><code className="bg-background px-1 rounded">{'{salary}'}</code> - Monthly salary</p>
                  <p><code className="bg-background px-1 rounded">{'{joinDate}'}</code> - Start date</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset('employee')}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Employee Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeBody">Body Paragraph</Label>
                <Textarea
                  id="employeeBody"
                  value={templates.employeeBody}
                  onChange={(e) => setTemplates(prev => ({ ...prev, employeeBody: e.target.value }))}
                  placeholder="Enter the main body text..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This appears after "EMPLOYMENT VERIFICATION LETTER" heading
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeClosing">Closing Statement</Label>
                <Textarea
                  id="employeeClosing"
                  value={templates.employeeClosing}
                  onChange={(e) => setTemplates(prev => ({ ...prev, employeeClosing: e.target.value }))}
                  placeholder="Enter the closing statement..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This appears after the employment details section
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetAll}
            className="sm:mr-auto"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset All to Default
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Templates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LetterTemplateSettingsDialog;
