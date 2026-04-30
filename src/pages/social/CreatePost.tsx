import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles, Upload, X, Save, Send, CalendarClock, Smartphone, Monitor, RotateCw, Heart, MessageCircle, Send as SendIcon, Bookmark } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import ChipInput from '@/components/social/ChipInput';
import { generateCaption, type CaptionPayload, type RegenMode } from '@/services/social/aiService';
import { createDraftPost, updatePost, uploadMedia } from '@/services/social/postService';
import { listBrandSettings } from '@/services/social/brandService';

const CONTENT_TYPES = [
  'Achievement', 'Grading', 'Kids Class', 'Sparring', 'Poomsae',
  'Educational', 'Promotion', 'Event', 'Parent Testimonial', 'Instructor Spotlight',
];

interface MediaItem {
  id: string;          // local id
  file: File;
  url: string;         // blob preview
  uploaded?: { path: string; assetId: string };
}

const CreatePost = () => {
  const { data: brands = [] } = useQuery({ queryKey: ['sm-brands'], queryFn: listBrandSettings });

  const [branch, setBranch] = useState<string>('Perth');
  const [contentType, setContentType] = useState<string>('Achievement');
  const [eventName, setEventName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [overlay, setOverlay] = useState('');
  const [reelTitle, setReelTitle] = useState('');

  const [generating, setGenerating] = useState<RegenMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  const addFiles = (files: FileList | File[]) => {
    const items: MediaItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setMedia((m) => [...m, ...items]);
  };

  const removeMedia = (id: string) => {
    setMedia((m) => {
      const it = m.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return m.filter((x) => x.id !== id);
    });
  };

  const runGenerate = async (mode: RegenMode) => {
    setGenerating(mode);
    try {
      const out: CaptionPayload = await generateCaption({
        branch: branch as any,
        content_type: contentType,
        event_name: eventName || undefined,
        student_name: studentName || undefined,
        instructor_name: instructorName || undefined,
        notes_for_ai: notes || undefined,
        tags,
        mode,
        current_caption: caption || undefined,
      });
      setCaption(out.caption ?? '');
      setCta(out.cta ?? '');
      setHashtags((out.hashtags ?? []).map((h) => h.replace(/^#/, '')));
      setOverlay(out.overlay_text ?? '');
      setReelTitle(out.reel_title ?? '');
      toast.success('Caption generated');
    } catch (e: any) {
      toast.error(e?.message ?? 'AI generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      // Upload any not-yet-uploaded media
      for (const m of media) {
        if (!m.uploaded) {
          m.uploaded = await uploadMedia(branch, m.file);
        }
      }
      const payload = {
        branch_name: branch,
        content_type: contentType,
        event_name: eventName || null,
        student_name: studentName || null,
        instructor_name: instructorName || null,
        notes_for_ai: notes || null,
        tags,
        caption: caption || null,
        cta: cta || null,
        hashtags,
        overlay_text: overlay || null,
        reel_title: reelTitle || null,
      } as any;

      let saved;
      if (postId) {
        saved = await updatePost(postId, payload);
      } else {
        saved = await createDraftPost(payload);
        setPostId(saved.id);
      }
      toast.success('Draft saved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const stubPublish = (label: string) =>
    toast.message(`${label} arrives in Phase 2`, {
      description: 'Your draft is saved. We\'ll wire publishing & scheduling next.',
    });

  const previewWidth = previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl';
  const captionPreview = `${caption}${cta ? `\n\n${cta}` : ''}${
    hashtags.length ? `\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : ''
  }`;

  return (
    <SocialLayout
      title="Create Post"
      description="Compose a post, let AI write the caption following your brand voice, then save as draft."
      actions={
        <>
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save draft
          </Button>
          <Button variant="outline" onClick={() => stubPublish('Schedule')}>
            <CalendarClock className="h-4 w-4 mr-2" /> Schedule
          </Button>
          <Button onClick={() => stubPublish('Publish now')}>
            <Send className="h-4 w-4 mr-2" /> Publish now
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.branch_name} value={b.branch_name}>{b.branch_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Content type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Event name</Label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Saturday belt grading" />
              </div>
              <div className="space-y-1.5">
                <Label>Student name</Label>
                <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Instructor name</Label>
                <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <ChipInput value={tags} onChange={setTags} placeholder="optional…" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes for AI</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything specific you want to highlight or avoid…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media</CardTitle>
              <CardDescription>Drop images or video. For carousels add multiple images.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
                }`}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm">Drag &amp; drop, or</p>
                <Button
                  variant="link"
                  className="px-1 h-auto"
                  onClick={() => fileRef.current?.click()}
                >
                  browse files
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </div>

              {media.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {media.map((m) => (
                    <div key={m.id} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                      {m.file.type.startsWith('video') ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(m.id)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">Caption</CardTitle>
                  <CardDescription>AI uses your branch's brand voice.</CardDescription>
                </div>
                <Button onClick={() => runGenerate('initial')} disabled={generating !== null}>
                  {generating === 'initial'
                    ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate caption
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Generated caption will appear here…"
              />
              <div className="flex flex-wrap gap-2">
                {(['shorter', 'professional', 'exciting', 'family-friendly'] as RegenMode[]).map((m) => (
                  <Button
                    key={m}
                    variant="outline"
                    size="sm"
                    disabled={generating !== null || !caption}
                    onClick={() => runGenerate(m)}
                  >
                    {generating === m ? (
                      <Loader2 className="animate-spin h-3 w-3 mr-1.5" />
                    ) : (
                      <RotateCw className="h-3 w-3 mr-1.5" />
                    )}
                    Make {m === 'family-friendly' ? 'family-friendly' : m}
                  </Button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">CTA</Label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reel title</Label>
                  <Input value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Hashtags</Label>
                  <ChipInput
                    value={hashtags}
                    onChange={(v) => setHashtags(v.map((t) => t.replace(/^#/, '')))}
                    placeholder="taekwondo, perthkids…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Overlay text (for reels/videos)</Label>
                  <Input value={overlay} onChange={(e) => setOverlay(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</Label>
            <ToggleGroup
              type="single"
              value={previewMode}
              onValueChange={(v) => v && setPreviewMode(v as 'mobile' | 'desktop')}
              size="sm"
            >
              <ToggleGroupItem value="mobile" aria-label="Mobile">
                <Smartphone className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="desktop" aria-label="Desktop">
                <Monitor className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className={`mx-auto ${previewWidth} border rounded-xl overflow-hidden bg-card shadow-sm`}>
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" />
              <div className="text-xs">
                <div className="font-semibold">gaonhae_{branch.toLowerCase()}</div>
                <div className="text-muted-foreground">{branch}</div>
              </div>
            </div>
            <div className="aspect-square bg-muted flex items-center justify-center relative">
              {media[0] ? (
                media[0].file.type.startsWith('video') ? (
                  <video src={media[0].url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={media[0].url} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-xs text-muted-foreground">No media</span>
              )}
              {overlay && (
                <div className="absolute inset-x-0 top-3 text-center text-white text-sm font-bold drop-shadow-md px-2">
                  {overlay}
                </div>
              )}
            </div>
            <div className="px-3 py-2 flex items-center gap-3 text-foreground">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <SendIcon className="h-5 w-5" />
              <Bookmark className="h-5 w-5 ml-auto" />
            </div>
            <div className="px-3 pb-3 text-xs whitespace-pre-wrap">
              <span className="font-semibold mr-1">gaonhae_{branch.toLowerCase()}</span>
              {captionPreview || <span className="text-muted-foreground">Caption preview…</span>}
            </div>
          </div>
        </div>
      </div>
    </SocialLayout>
  );
};

export default CreatePost;
