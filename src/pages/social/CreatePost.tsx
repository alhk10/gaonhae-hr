import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Sparkles, Upload, X, Save, CalendarClock, Download, RotateCw, CheckCircle2,
} from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import ChipInput from '@/components/social/ChipInput';
import CopyButton from '@/components/social/CopyButton';
import PlatformBadge from '@/components/social/PlatformBadge';
import { generateCaption, type RegenMode } from '@/services/social/aiService';
import {
  createDraftPost, updatePost, uploadMedia, markPlatformPosted, registerExistingMedia,
} from '@/services/social/postService';
import { listBrandSettings } from '@/services/social/brandService';
import {
  PLATFORMS, PLATFORM_LABELS, PLATFORM_LIMITS,
  type Platform, type PlatformCaption, type PlatformCaptions, type PostedPlatforms,
} from '@/lib/social/platforms';
import { downloadMediaBundle, formatCaptionForCopy, formatHashtagsForCopy } from '@/lib/social/exportHelpers';
import AiImageGenerator from '@/components/social/AiImageGenerator';

const CONTENT_TYPES = [
  'Achievement', 'Grading', 'Kids Class', 'Sparring', 'Poomsae',
  'Educational', 'Promotion', 'Event', 'Parent Testimonial', 'Instructor Spotlight',
];

interface MediaItem {
  id: string;
  file: File;
  url: string;
  uploaded?: { path: string; assetId: string };
}

const emptyCaption = (): PlatformCaption => ({
  caption: '', cta: '', hashtags: [], overlay_text: '', reel_title: '',
});

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

  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(['instagram', 'facebook', 'tiktok']);
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [captions, setCaptions] = useState<PlatformCaptions>({});
  const [postedPlatforms, setPostedPlatforms] = useState<PostedPlatforms>({});

  const [scheduledFor, setScheduledFor] = useState<string>(''); // YYYY-MM-DDTHH:MM

  const [generating, setGenerating] = useState<RegenMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

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

  const addAiGeneratedImage = async (img: { url: string; path: string; mime: string }) => {
    try {
      const resp = await fetch(img.url);
      const blob = await resp.blob();
      const ext = (img.mime.split('/')[1] || 'png').split(';')[0];
      const fname = `ai-${Date.now()}.${ext}`;
      const file = new File([blob], fname, { type: img.mime });
      const localUrl = URL.createObjectURL(blob);
      // Register in sm_media_assets so ensureMediaUploaded skips re-upload
      const reg = await registerExistingMedia(branch, img.path, img.mime);
      setMedia((m) => [
        ...m,
        {
          id: `${Date.now()}-${Math.random()}`,
          file,
          url: localUrl,
          uploaded: { path: reg.path, assetId: reg.assetId },
        },
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to attach generated image');
    }
  };

  const togglePlatform = (p: Platform) => {
    setTargetPlatforms((ps) => {
      const next = ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p];
      if (!next.includes(activePlatform) && next.length) setActivePlatform(next[0]);
      return next;
    });
  };

  const setCaptionField = <K extends keyof PlatformCaption>(p: Platform, key: K, val: PlatformCaption[K]) => {
    setCaptions((c) => ({
      ...c,
      [p]: { ...(c[p] ?? emptyCaption()), [key]: val },
    }));
  };

  const runGenerate = async (mode: RegenMode) => {
    if (targetPlatforms.length === 0) {
      toast.error('Pick at least one platform');
      return;
    }
    setGenerating(mode);
    try {
      const isRefine = mode !== 'initial' && mode !== 'tone-test';
      const refinePlatform = isRefine ? activePlatform : undefined;
      const out = await generateCaption({
        branch: branch as any,
        content_type: contentType,
        platforms: isRefine ? [activePlatform] : targetPlatforms,
        event_name: eventName || undefined,
        student_name: studentName || undefined,
        instructor_name: instructorName || undefined,
        notes_for_ai: notes || undefined,
        tags,
        mode,
        refine_platform: refinePlatform,
        current_caption: isRefine ? captions[activePlatform]?.caption : undefined,
      });

      setCaptions((prev) => {
        const next: PlatformCaptions = { ...prev };
        for (const p of Object.keys(out) as Platform[]) {
          const pc = out[p];
          if (!pc) continue;
          next[p] = {
            caption: pc.caption ?? '',
            cta: pc.cta ?? '',
            hashtags: (pc.hashtags ?? []).map((h) => h.replace(/^#/, '')),
            overlay_text: pc.overlay_text ?? '',
            reel_title: pc.reel_title ?? '',
          };
        }
        return next;
      });
      toast.success(isRefine ? `${PLATFORM_LABELS[activePlatform]} caption updated` : 'Captions generated');
    } catch (e: any) {
      toast.error(e?.message ?? 'AI generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const buildPayload = (status: 'draft' | 'queued') => ({
    branch_name: branch,
    content_type: contentType,
    event_name: eventName || null,
    student_name: studentName || null,
    instructor_name: instructorName || null,
    notes_for_ai: notes || null,
    tags,
    target_platforms: targetPlatforms,
    platform_captions: captions,
    posted_platforms: postedPlatforms,
    scheduled_for: status === 'queued' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
    status,
    // legacy single-caption mirror (keeps Instagram for back-compat)
    caption: captions.instagram?.caption ?? captions[activePlatform]?.caption ?? null,
    cta: captions.instagram?.cta ?? captions[activePlatform]?.cta ?? null,
    hashtags: captions.instagram?.hashtags ?? captions[activePlatform]?.hashtags ?? [],
    overlay_text: captions.instagram?.overlay_text ?? captions[activePlatform]?.overlay_text ?? null,
    reel_title: captions.instagram?.reel_title ?? captions[activePlatform]?.reel_title ?? null,
  } as any);

  const ensureMediaUploaded = async () => {
    for (const m of media) {
      if (!m.uploaded) m.uploaded = await uploadMedia(branch, m.file);
    }
  };

  const save = async (status: 'draft' | 'queued') => {
    if (status === 'queued' && !scheduledFor) {
      toast.error('Pick a date & time to queue this post');
      return;
    }
    setSaving(true);
    try {
      await ensureMediaUploaded();
      const payload = buildPayload(status);
      let saved;
      if (postId) saved = await updatePost(postId, payload);
      else {
        saved = await createDraftPost(payload);
        setPostId(saved.id);
      }
      toast.success(status === 'queued' ? 'Added to posting queue' : 'Draft saved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadMedia = async () => {
    if (media.length === 0) {
      toast.error('No media to download');
      return;
    }
    const files = media.map((m) => ({ name: m.file.name, blob: m.file }));
    const stamp = new Date().toISOString().slice(0, 10);
    await downloadMediaBundle(files, `social-${branch}-${stamp}`);
    toast.success('Media downloaded');
  };

  const togglePosted = async (p: Platform) => {
    if (!postId) {
      toast.error('Save the post first');
      return;
    }
    const willPost = !postedPlatforms[p];
    try {
      const updated = await markPlatformPosted(postId, p, willPost);
      setPostedPlatforms(updated.posted_platforms ?? {});
      toast.success(willPost ? `Marked ${PLATFORM_LABELS[p]} as posted` : `Unmarked ${PLATFORM_LABELS[p]}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const activeCaption = captions[activePlatform] ?? emptyCaption();
  const limits = PLATFORM_LIMITS[activePlatform];
  const charCount = activeCaption.caption.length;
  const overLimit = charCount > limits.caption;

  const fullCopyText = useMemo(() => formatCaptionForCopy(activeCaption), [activeCaption]);
  const hashtagsText = useMemo(() => formatHashtagsForCopy(activeCaption), [activeCaption]);

  return (
    <SocialLayout
      title="Create Post"
      description="Compose once, get a tailored caption per platform, then download media + copy caption to post manually."
      actions={
        <>
          <Button variant="outline" onClick={() => save('draft')} disabled={saving}>
            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save draft
          </Button>
          <Button variant="outline" onClick={() => save('queued')} disabled={saving}>
            <CalendarClock className="h-4 w-4 mr-2" />
            Add to queue
          </Button>
          <Button onClick={downloadMedia} disabled={media.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Download media
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
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
                  placeholder="Anything specific to highlight or avoid…"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Target platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const on = targetPlatforms.includes(p);
                    return (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={on ? 'default' : 'outline'}
                        onClick={() => togglePlatform(p)}
                      >
                        {PLATFORM_LABELS[p]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Reminder time (optional, for queue)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Queued posts surface in the Dashboard's "Ready to post now" widget at this time. No auto-publish.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media</CardTitle>
              <CardDescription>Drop images or video. Use "Download media" above to get them on your phone.</CardDescription>
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
                <Button variant="link" className="px-1 h-auto" onClick={() => fileRef.current?.click()}>
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

              {media.length === 0 && (
                <div className="mt-4">
                  <AiImageGenerator
                    branch={branch}
                    defaultPrompt={[
                      contentType,
                      eventName && `Event: ${eventName}`,
                      studentName && `Student: ${studentName}`,
                      instructorName && `Instructor: ${instructorName}`,
                      notes,
                    ].filter(Boolean).join(' — ')}
                    onGenerated={addAiGeneratedImage}
                  />
                </div>
              )}

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
                  <CardTitle className="text-base">Captions</CardTitle>
                  <CardDescription>One AI run produces a tailored caption per platform.</CardDescription>
                </div>
                <Button onClick={() => runGenerate('initial')} disabled={generating !== null || targetPlatforms.length === 0}>
                  {generating === 'initial'
                    ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate captions
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {targetPlatforms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select at least one platform above.</p>
              ) : (
                <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
                  <TabsList>
                    {targetPlatforms.map((p) => (
                      <TabsTrigger key={p} value={p}>
                        <PlatformBadge platform={p} className="mr-0" />
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {targetPlatforms.map((p) => {
                    const c = captions[p] ?? emptyCaption();
                    const lim = PLATFORM_LIMITS[p];
                    const cnt = c.caption.length;
                    const over = cnt > lim.caption;
                    const isActive = p === activePlatform;
                    return (
                      <TabsContent key={p} value={p} className="space-y-3 mt-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-xs text-muted-foreground">
                            <span className={over ? 'text-destructive font-semibold' : ''}>
                              {cnt}/{lim.caption} chars
                            </span>
                            {' · '}
                            {c.hashtags.length} hashtags (target {lim.hashtags[0]}-{lim.hashtags[1]})
                          </div>
                          <div className="flex gap-2">
                            <CopyButton text={fullCopyText} label="Copy all" />
                            <CopyButton text={c.caption} label="Caption" />
                            <CopyButton text={hashtagsText} label="Hashtags" />
                          </div>
                        </div>

                        <Textarea
                          rows={6}
                          value={c.caption}
                          onChange={(e) => setCaptionField(p, 'caption', e.target.value)}
                          placeholder={`${PLATFORM_LABELS[p]} caption…`}
                        />

                        {isActive && (
                          <div className="flex flex-wrap gap-2">
                            {(['shorter', 'professional', 'exciting', 'family-friendly'] as RegenMode[]).map((m) => (
                              <Button
                                key={m}
                                variant="outline"
                                size="sm"
                                disabled={generating !== null || !c.caption}
                                onClick={() => runGenerate(m)}
                              >
                                {generating === m
                                  ? <Loader2 className="animate-spin h-3 w-3 mr-1.5" />
                                  : <RotateCw className="h-3 w-3 mr-1.5" />}
                                Make {m === 'family-friendly' ? 'family-friendly' : m}
                              </Button>
                            ))}
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">CTA</Label>
                            <Input
                              value={c.cta}
                              onChange={(e) => setCaptionField(p, 'cta', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Reel/video title</Label>
                            <Input
                              value={c.reel_title ?? ''}
                              onChange={(e) => setCaptionField(p, 'reel_title', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Hashtags</Label>
                            <ChipInput
                              value={c.hashtags}
                              onChange={(v) => setCaptionField(p, 'hashtags', v.map((t) => t.replace(/^#/, '')))}
                              placeholder="taekwondo, perthkids…"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Overlay text (for reels/videos)</Label>
                            <Input
                              value={c.overlay_text ?? ''}
                              onChange={(e) => setCaptionField(p, 'overlay_text', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {postedPlatforms[p]
                              ? `Posted ${new Date(postedPlatforms[p]!).toLocaleString()}`
                              : 'Not posted yet'}
                          </div>
                          <Button
                            size="sm"
                            variant={postedPlatforms[p] ? 'secondary' : 'default'}
                            onClick={() => togglePosted(p)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            {postedPlatforms[p] ? 'Posted ✓ (undo)' : 'Mark as posted'}
                          </Button>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: quick export panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick export</CardTitle>
              <CardDescription>Active platform: {PLATFORM_LABELS[activePlatform]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={downloadMedia} disabled={media.length === 0} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download {media.length > 1 ? `${media.length} files (.zip)` : 'media'}
              </Button>
              <CopyButton
                text={fullCopyText}
                label={`Copy ${PLATFORM_LABELS[activePlatform]} caption + hashtags`}
                variant="default"
                size="default"
                className="w-full"
              />
              <div className="text-[11px] text-muted-foreground">
                Char count: <span className={overLimit ? 'text-destructive font-semibold' : ''}>{charCount}/{limits.caption}</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-medium mb-2">Posted status</p>
                <div className="space-y-1.5">
                  {targetPlatforms.map((p) => (
                    <div key={p} className="flex items-center justify-between text-xs">
                      <PlatformBadge platform={p} />
                      {postedPlatforms[p] ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> done
                        </span>
                      ) : (
                        <span className="text-muted-foreground">pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SocialLayout>
  );
};

export default CreatePost;
