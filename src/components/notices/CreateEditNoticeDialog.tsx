import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ImagePlus, Paperclip, X, Loader2, Bold, Underline, IndentIncrease, IndentDecrease, Type, Palette, Link } from 'lucide-react';
import { toast } from 'sonner';
import { Notice, createNotice, updateNotice, uploadNoticeFile, sendNoticeNotifications } from '@/services/noticeService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TEXT_COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
];

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
  const [link, setLink] = useState('');
  const [deleteOn, setDeleteOn] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [allBranches, setAllBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  }, []);

  const handleFontSize = (size: string) => {
    // Map readable sizes to execCommand fontSize (1-7)
    const sizeMap: Record<string, string> = { 'small': '2', 'normal': '3', 'large': '4', 'x-large': '5' };
    execCommand('fontSize', sizeMap[size] || '3');
  };

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list-with-country'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, country').order('name');
      return data || [];
    },
    enabled: role === 'superadmin',
  });

  // Group branches by country
  const branchesByCountry = branches.reduce<Record<string, typeof branches>>((acc, b) => {
    const country = b.country || 'Other';
    if (!acc[country]) acc[country] = [];
    acc[country].push(b);
    return acc;
  }, {});

  // Sort countries: named countries first alphabetically, 'Other' last
  const sortedCountries = Object.keys(branchesByCountry).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  useEffect(() => {
    if (open) {
      if (notice) {
        setSubject(notice.subject);
        setContent(notice.content || '');
        setImagePreview(notice.image_url);
        setSelectedBranches(notice.target_branches || []);
        setAllBranches(!notice.target_branches);
        setLink(notice.link || '');
        setDeleteOn(notice.delete_on || '');
        setTimeout(() => {
          if (contentRef.current) contentRef.current.innerHTML = notice.content || '';
        }, 50);
      } else {
        setSubject('');
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setAttachmentFile(null);
        setLink('');
        setDeleteOn('');
        setSelectedBranches([]);
        setAllBranches(true);
        setTimeout(() => {
          if (contentRef.current) contentRef.current.innerHTML = '';
        }, 50);
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
        link: link.trim() || null,
        delete_on: deleteOn || null,
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

          {/* Content with formatting toolbar */}
          <div>
            <Label>Content</Label>
            <div className="mt-1 border rounded-md overflow-hidden">
              <div className="flex items-center gap-0.5 p-1 bg-muted/50 border-b flex-wrap">
                <Select onValueChange={handleFontSize} defaultValue="normal">
                  <SelectTrigger className="h-7 w-[90px] text-xs">
                    <Type className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="x-large">X-Large</SelectItem>
                  </SelectContent>
                </Select>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand('bold')} aria-label="Bold">
                  <Bold className="w-3.5 h-3.5" />
                </Toggle>
                <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand('underline')} aria-label="Underline">
                  <Underline className="w-3.5 h-3.5" />
                </Toggle>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand('indent')} aria-label="Indent">
                  <IndentIncrease className="w-3.5 h-3.5" />
                </Toggle>
                <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand('outdent')} aria-label="Outdent">
                  <IndentDecrease className="w-3.5 h-3.5" />
                </Toggle>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Palette className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="grid grid-cols-4 gap-1">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                          onClick={() => execCommand('foreColor', c.value)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div
                ref={contentRef}
                contentEditable
                className="min-h-[100px] p-3 text-sm focus:outline-none"
                onInput={() => {
                  setContent(contentRef.current?.innerHTML || '');
                }}
                data-placeholder="Notice content..."
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
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

          {/* Link */}
          <div>
            <Label>Link</Label>
            <div className="mt-1 flex items-center gap-2">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>

          {/* Delete on date */}
          <div>
            <Label>Delete Notice On</Label>
            <Input
              type="date"
              value={deleteOn}
              onChange={(e) => setDeleteOn(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Notice will be automatically deleted on this date</p>
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
                  <div className="ml-6 space-y-3 max-h-40 overflow-y-auto">
                    {sortedCountries.map((country) => {
                      const countryBranchIds = branchesByCountry[country].map(b => b.id);
                      const allCountrySelected = countryBranchIds.every(id => selectedBranches.includes(id));
                      const someCountrySelected = countryBranchIds.some(id => selectedBranches.includes(id)) && !allCountrySelected;
                      return (
                      <div key={country}>
                        <div className="flex items-center gap-2 mb-1">
                          <Checkbox
                            checked={allCountrySelected || (someCountrySelected ? 'indeterminate' : false)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBranches(prev => [...new Set([...prev, ...countryBranchIds])]);
                              } else {
                                setSelectedBranches(prev => prev.filter(id => !countryBranchIds.includes(id)));
                              }
                            }}
                          />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{country}</span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {branchesByCountry[country].map((b) => (
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
                      </div>
                      );
                    })}
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
