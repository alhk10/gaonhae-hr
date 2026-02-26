import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createUpdateRequest } from '@/services/studentUpdateRequestService';
import { useQueryClient } from '@tanstack/react-query';

interface StudentProfileCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Record<string, any>;
  studentId: string;
}

const REQUIRED_FIELDS = [
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'postal_code', label: 'Postal Code', type: 'text' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'text' },
  { key: 'emergency_contact_relationship', label: 'Emergency Contact Relationship', type: 'text' },
  { key: 'medical_conditions', label: 'Medical Conditions', type: 'textarea' },
];

const StudentProfileCompletionDialog: React.FC<StudentProfileCompletionDialogProps> = ({
  open,
  onOpenChange,
  student,
  studentId,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const missingFields = REQUIRED_FIELDS.filter(f => !student[f.key]);
  const missingPhoto = !student.passport_photo_url;
  const totalChecks = REQUIRED_FIELDS.length + 1; // +1 for photo
  const filledCount = totalChecks - missingFields.length - (missingPhoto ? 1 : 0);
  const progressPercent = Math.round((filledCount / totalChecks) * 100);

  const handleClose = () => {
    // Set yearly localStorage key
    const currentYear = new Date().getFullYear();
    const storageKey = `profile_completion_shown_${studentId}_${currentYear}`;
    localStorage.setItem(storageKey, 'true');
    onOpenChange(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${studentId}/passport-photo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('students')
        .update({ passport_photo_url: urlData.publicUrl + '?t=' + Date.now() })
        .eq('id', studentId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      toast.success('Passport photo uploaded');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    // Filter only fields that have values
    const changes: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value.trim()) {
        changes[key] = value.trim();
      }
    });

    if (Object.keys(changes).length === 0) {
      handleClose();
      return;
    }

    setSubmitting(true);
    try {
      await createUpdateRequest(studentId, changes);
      toast.success('Profile update request submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['student-update-requests', studentId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit update request');
    } finally {
      setSubmitting(false);
      handleClose();
    }
  };

  const allFilled = missingFields.length === 0 && !missingPhoto;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            {allFilled
              ? 'All your profile information is up to date. Please review and confirm.'
              : 'Please fill in the missing information below to complete your profile.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{filledCount}/{totalChecks} fields completed</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Photo upload section */}
          {missingPhoto && (
            <div className="border rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Passport Size Photo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                  <Camera className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Upload a passport-sized photo (max 5MB)</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    Upload Photo
                  </Button>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          )}

          {/* Missing fields */}
          {missingFields.length > 0 && (
            <div className="space-y-3">
              {missingFields.map((field) => (
                <div key={field.key}>
                  <Label className="text-sm">{field.label}</Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All filled message */}
          {allFilled && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Your profile is complete!</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleClose}>
            Skip for now
          </Button>
          {missingFields.length > 0 && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Submit for Approval
            </Button>
          )}
          {allFilled && (
            <Button onClick={handleClose}>
              Looks Good
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfileCompletionDialog;
