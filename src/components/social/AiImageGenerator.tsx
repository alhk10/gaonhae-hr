import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { listCaricatures } from '@/services/social/caricatureService';
import { generateAiImage } from '@/services/social/aiService';

interface Props {
  branch: string;
  defaultPrompt?: string;
  onGenerated: (img: { url: string; path: string; mime: string }) => void;
}

type Aspect = '1:1' | '4:5' | '9:16';

const AiImageGenerator = ({ branch, defaultPrompt, onGenerated }: Props) => {
  const { data: caricatures = [], isLoading } = useQuery({
    queryKey: ['sm-caricatures-active', branch],
    queryFn: () => listCaricatures(branch, true),
  });

  const [caricatureId, setCaricatureId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>(defaultPrompt ?? '');
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrompt(defaultPrompt ?? '');
  }, [defaultPrompt]);

  useEffect(() => {
    if (!caricatureId && caricatures.length) setCaricatureId(caricatures[0].id);
  }, [caricatures, caricatureId]);

  const selected = useMemo(
    () => caricatures.find((c) => c.id === caricatureId) ?? null,
    [caricatures, caricatureId],
  );

  const generate = async () => {
    if (!caricatureId) {
      toast.error('Pick a caricature first');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Describe the scene to generate');
      return;
    }
    setBusy(true);
    try {
      const out = await generateAiImage({
        branch,
        caricature_id: caricatureId,
        prompt: prompt.trim(),
        aspect_ratio: aspect,
      });
      onGenerated(out);
      toast.success('Image generated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Image generation failed');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading caricatures…
      </div>
    );
  }

  if (caricatures.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
        <ImageIcon className="mx-auto h-6 w-6 mb-1 opacity-60" />
        No active caricatures for <b>{branch}</b>.{' '}
        <a href="/social/caricatures" className="text-primary underline">Add one in the Caricature Library</a>{' '}
        to enable AI image generation.
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Generate image with AI</span>
      </div>

      <div className="grid sm:grid-cols-[120px_1fr] gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Caricature</Label>
          <div className="aspect-square bg-background rounded-md overflow-hidden border">
            {selected && (
              <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
            )}
          </div>
          <Select value={caricatureId} onValueChange={setCaricatureId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {caricatures.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Scene prompt</Label>
            <Textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A young student receiving their yellow belt during a friendly grading ceremony at our dojo…"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs">Aspect ratio</Label>
              <Select value={aspect} onValueChange={(v) => setAspect(v as Aspect)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Square (1:1) — feed</SelectItem>
                  <SelectItem value="4:5">Portrait (4:5) — feed</SelectItem>
                  <SelectItem value="9:16">Vertical (9:16) — Reels / Stories / TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={busy} className="self-end">
              {busy ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiImageGenerator;
