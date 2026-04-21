import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getBrandSettings, upsertBrandSettings } from '@/services/socialMediaService';
import { Loader2 } from 'lucide-react';

interface Props { branchId: string; }

export const BrandVoiceTab: React.FC<Props> = ({ branchId }) => {
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [captionStyle, setCaptionStyle] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getBrandSettings(branchId);
        setTone(data?.tone || '');
        setKeywords((data?.keywords || []).join(', '));
        setHashtags((data?.default_hashtags || []).join(' '));
        setCaptionStyle(data?.caption_style || '');
        setLanguage(data?.language || 'en');
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const save = async () => {
    setSaving(true);
    try {
      await upsertBrandSettings({
        branch_id: branchId,
        tone,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        default_hashtags: hashtags.split(/\s+/).map((h) => h.trim()).filter(Boolean).map((h) => h.startsWith('#') ? h : `#${h}`),
        caption_style: captionStyle,
        language,
      });
      toast({ title: 'Brand voice saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Brand Voice (used for AI caption generation)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tone</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. energetic, friendly, family-oriented" />
        </div>
        <div>
          <Label>Keywords (comma-separated)</Label>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="taekwondo, kids, discipline" />
        </div>
        <div>
          <Label>Default hashtags (space-separated)</Label>
          <Textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} rows={2} placeholder="#taekwondo #martialarts #kidsfitness" />
        </div>
        <div>
          <Label>Caption style</Label>
          <Input value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)} placeholder="short, punchy, with emojis" />
        </div>
        <div>
          <Label>Language</Label>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Brand Voice'}</Button>
      </CardContent>
    </Card>
  );
};
