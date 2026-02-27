import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImagePlus, Paperclip, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Notice, createNotice, updateNotice, uploadNoticeFile, sendNoticeNotifications } from '@/services/noticeService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateEditNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice?: Notice | null;
  role: 'superadmin' | 'branch';
  branchId?: string;
  userEmail: string;
  onSaved: () => void;
}

const CreateEditNoticeDialog: React.FC<CreateEditNoticeDialogProps> = ({
  open, onOpenChange, notice, role, branchId, userEmail, onSaved,
}) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [allBranches, setAllBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      return data || [];
    },
    enabled: role === 'superadmin',
  });

  useEffect(() => {
    if (open) {
      if (notice) {
        setSubject(notice.subject);
        setContent(notice.content || '');
        setImagePreview(notice.image_url);
        setSelectedBranches(notice.target_branches || []);
        setAllBranches(!notice.target_branches);
      } else {
        setSubject('');
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setAttachmentFile(null);
        setSelectedBranches([]);
        setAllBranches(true);
      }
    }
  }, [open, notice]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    setSaving(true);
    try {
      let image_url = notice?.image_url || null;
      let attachment_url = notice?.attachment_url || null;
      let attachment_name = notice?.attachment_name || null;

      if (imageFile) {
        image_url = await uploadNoticeFile(imageFile, 'images');
      }
      if (attachmentFile) {
        attachment_url = await uploadNoticeFile(attachmentFile, 'files');
        attachment_name = attachmentFile.name;
      }

      const targetBranches = role === 'superadmin' && !allBranches ? selectedBranches : null;

      const payload = {
        subject: subject.trim(),
        content: content.trim() || null,
        image_url,
        attachment_url,
        attachment_name,
        target_branches: targetBranches,
        created_by_email: userEmail,
        created_by_branch_id: role === 'branch' ? branchId || null : null,
      };

      if (notice) {
        await updateNotice(notice.id, payload);
        toast.success('Notice updated');
      } else {
        await createNotice(payload);
        toast.success('Notice created');
        // Send push notifications for new notices (fire and forget)
        sendNoticeNotifications(subject.trim(), targetBranches);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{notice ? 'Edit Notice' : 'Add Notice'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Notice subject" />
          </div>

          {/* Image upload */}
          <div>
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative mt-1">
                <img src={imagePreview} alt="Preview" className="w-full rounded-md max-h-48 object-contain bg-muted" />
                <Button
                  variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div
                className="mt-1 border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload image</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          {/* Content */}
          <div>
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notice content..." rows={4} />
          </div>

          {/* Attachment */}
          <div>
            <Label>Attachment</Label>
            <div className="mt-1 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => attachInputRef.current?.click()}>
                <Paperclip className="w-4 h-4 mr-2" />
                {attachmentFile ? attachmentFile.name : (notice?.attachment_name || 'Choose file')}
              </Button>
              {(attachmentFile || notice?.attachment_url) && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachmentFile(null)}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <input ref={attachInputRef} type="file" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
          </div>

          {/* Branch selector (superadmin only) */}
          {role === 'superadmin' && (
            <div>
              <Label>Target Branches</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allBranches}
                    onCheckedChange={(checked) => {
                      setAllBranches(!!checked);
                      if (checked) setSelectedBranches([]);
                    }}
                  />
                  <span className="text-sm">All Branches</span>
                </div>
                {!allBranches && (
                  <div className="ml-6 space-y-1 max-h-40 overflow-y-auto">
                    {branches.map((b) => (
                      <div key={b.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedBranches.includes(b.id)}
                          onCheckedChange={(checked) => {
                            setSelectedBranches(prev =>
                              checked ? [...prev, b.id] : prev.filter(id => id !== b.id)
                            );
                          }}
                        />
                        <span className="text-sm">{b.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {notice ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEditNoticeDialog;
