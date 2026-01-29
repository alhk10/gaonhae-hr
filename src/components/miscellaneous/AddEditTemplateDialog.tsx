import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { letterTemplateService, LetterTemplate, CreateLetterTemplateData } from '@/services/letterTemplateService';

interface AddEditTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: LetterTemplate | null;
  onSaved: () => void;
}

const STUDENT_PLACEHOLDERS = [
  { key: '{fullName}', label: 'Full name' },
  { key: '{firstName}', label: 'First name' },
  { key: '{lastName}', label: 'Last name' },
  { key: '{dateOfBirth}', label: 'Date of birth' },
  { key: '{nricPassport}', label: 'NRIC/Passport' },
  { key: '{currentBelt}', label: 'Belt level' },
  { key: '{enrollmentDate}', label: 'Member since' },
];

const EMPLOYEE_PLACEHOLDERS = [
  { key: '{fullName}', label: 'Full name' },
  { key: '{dateOfBirth}', label: 'Date of birth' },
  { key: '{nric}', label: 'NRIC number' },
  { key: '{position}', label: 'Job position' },
  { key: '{salary}', label: 'Monthly salary' },
  { key: '{joinDate}', label: 'Start date' },
];

const AddEditTemplateDialog: React.FC<AddEditTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'student' | 'employee'>('student');
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [closingText, setClosingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name);
        setType(template.type);
        setTitle(template.title);
        setBodyText(template.body_text);
        setClosingText(template.closing_text);
      } else {
        setName('');
        setType('student');
        setTitle('');
        setBodyText('');
        setClosingText('Should you have any further clarifications, please do not hesitate to contact us.');
      }
    }
  }, [isOpen, template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !title.trim() || !bodyText.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && template) {
        await letterTemplateService.updateTemplate(template.id, {
          name: name.trim(),
          title: title.trim(),
          body_text: bodyText.trim(),
          closing_text: closingText.trim(),
        });
        toast.success('Template updated successfully');
      } else {
        const data: CreateLetterTemplateData = {
          name: name.trim(),
          type,
          title: title.trim(),
          body_text: bodyText.trim(),
          closing_text: closingText.trim(),
        };
        await letterTemplateService.createTemplate(data);
        toast.success('Template created successfully');
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholders = type === 'student' ? STUDENT_PLACEHOLDERS : EMPLOYEE_PLACEHOLDERS;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'Add New Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Promotion Letter"
                disabled={template?.is_default}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'student' | 'employee')}
                disabled={isEditing}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-2">Available placeholders:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {placeholders.map((p) => (
                <p key={p.key}>
                  <code className="bg-background px-1 rounded">{p.key}</code> - {p.label}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Letter Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., PROMOTION LETTER"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyText">Body Paragraph *</Label>
            <Textarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Enter the main body text with placeholders..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingText">Closing Statement</Label>
            <Textarea
              id="closingText"
              value={closingText}
              onChange={(e) => setClosingText(e.target.value)}
              placeholder="Enter the closing statement..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditTemplateDialog;
