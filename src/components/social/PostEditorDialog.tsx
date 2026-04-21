import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import {
  type SocialPost,
  type ContentType,
  createSocialPost,
  updateSocialPost,
  deleteSocialPost,
  generateCaption,
  publishToInstagram,
} from '@/services/socialMediaService';
import { MediaUpload } from './MediaUpload';
import { InstagramPreview } from './InstagramPreview';
import { PostStatusBadge } from './PostStatusBadge';
import { Loader2, Sparkles, Trash2, Send } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  post?: SocialPost | null;
  defaultBranchId?: string;
  onSaved?: () => void;
}

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'achievement', label: 'Achievement' },
  { value: 'training', label: 'Training' },
  { value: 'educational', label: 'Educational' },
  { value: 'promotion', label: 'Promotion' },
];

export const PostEditorDialog: React.FC<Props> = ({ open, onOpenChange, post, defaultBranchId, onSaved }) => {
  const { branches } = useBranches();
  const { user, userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';

  const [branchId, setBranchId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('training');
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setBranchId(post.branch_id);
      setContentType(post.content_type);
      setCaption(post.caption || '');
      setCta(post.cta || '');
      setHashtags((post.hashtags || []).join(' '));
      setMediaUrl(post.media_url);
      setMediaType(post.media_type);
      setScheduledAt(post.scheduled_at ? post.scheduled_at.slice(0, 16) : '');
    } else {
      setBranchId(defaultBranchId || '');
      setContentType('training');
      setCaption('');
      setCta('');
      setHashtags('');
      setMediaUrl(null);
      setMediaType(null);
      setScheduledAt('');
      setCustomNotes('');
    }
  }, [open, post, defaultBranchId]);

  const branchName = branches.find((b) => b.id === branchId)?.name;
  const isEditable =
    !post ||
    isSuperadmin ||
    (post.created_by === user?.email && post.status === 'draft');

  const parsedHashtags = hashtags
    .split(/\s+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`));

  const handleGenerate = async () => {
    if (!branchId) {
      toast({ title: 'Pick a branch first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const out = await generateCaption({ branch_id: branchId, content_type: contentType, custom_notes: customNotes });
      setCaption(out.caption);
      setCta(out.cta);
      setHashtags(out.hashtags.join(' '));
      toast({ title: 'Caption generated' });
    } catch (e) {
      toast({ title: 'Generation failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const buildPayload = (status: SocialPost['status']) => ({
    branch_id: branchId,
    content_type: contentType,
    caption,
    cta,
    hashtags: parsedHashtags,
    media_url: mediaUrl,
    media_type: mediaType,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    status,
    created_by: user?.email || null,
  });

  const save = async (status: SocialPost['status']) => {
    if (!branchId) return toast({ title: 'Pick a branch', variant: 'destructive' });
    setSaving(true);
    try {
      if (post) {
        await updateSocialPost(post.id, buildPayload(status));
      } else {
        await createSocialPost(buildPayload(status) as any);
      }
      toast({ title: 'Post saved' });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('Delete this post?')) return;
    try {
      await deleteSocialPost(post.id);
      toast({ title: 'Post deleted' });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const handlePublishNow = async () => {
    if (!post) return;
    try {
      const res = await publishToInstagram(post.id);
      toast({
        title: res.success ? 'Published' : 'Publish issue',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Publish failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {post ? 'Edit Post' : 'New Post'}
            {post && <PostStatusBadge status={post.status} />}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId} disabled={!isEditable}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content type</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)} disabled={!isEditable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Media</Label>
              <MediaUpload
                branchId={branchId}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                onChange={({ url, type }) => { setMediaUrl(url); setMediaType(type); }}
                disabled={!isEditable}
              />
            </div>

            <div>
              <Label>Notes for AI (optional)</Label>
              <Input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. focus on yellow belt grading"
                disabled={!isEditable}
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating || !isEditable || !branchId} className="w-full">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generating ? 'Generating…' : 'Generate Caption'}
            </Button>

            <div>
              <Label>Caption</Label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} disabled={!isEditable} />
            </div>
            <div>
              <Label>Call to action</Label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} disabled={!isEditable} />
            </div>
            <div>
              <Label>Hashtags (space separated)</Label>
              <Textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} rows={2} disabled={!isEditable} />
            </div>
            <div>
              <Label>Schedule for</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Preview</Label>
            <InstagramPreview
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              caption={caption}
              cta={cta}
              hashtags={parsedHashtags}
              branchName={branchName}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-between sm:justify-between">
          <div className="flex gap-2">
            {post && isSuperadmin && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
            {post && isSuperadmin && ['approved', 'scheduled', 'failed'].includes(post.status) && (
              <Button variant="outline" size="sm" onClick={handlePublishNow}>
                <Send className="w-4 h-4 mr-1" /> Publish now
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {isEditable && (
              <>
                <Button variant="secondary" onClick={() => save('draft')} disabled={saving}>Save Draft</Button>
                <Button onClick={() => save('pending_approval')} disabled={saving}>Submit for Approval</Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
