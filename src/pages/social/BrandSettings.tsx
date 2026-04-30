import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Sparkles, Wifi, WifiOff } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import ChipInput from '@/components/social/ChipInput';
import {
  getBrandSettings,
  upsertBrandSettings,
  type BrandSettings,
  type SmBranch,
} from '@/services/social/brandService';
import { generateCaption } from '@/services/social/aiService';
import { listIgAccounts, disconnectIgAccount } from '@/services/social/igAccountService';

const BRANCHES: SmBranch[] = ['Perth', 'Singapore'];

const empty: Partial<BrandSettings> = {
  tone_of_voice: '',
  brand_keywords: [],
  banned_words: [],
  emoji_style: 'moderate',
  default_hashtags: [],
  cta_style: '',
  target_audience: '',
  preferred_caption_length: 'medium',
  posting_frequency: '',
  logo_url: '',
};

const BrandForm = ({ branch }: { branch: SmBranch }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sm-brand', branch],
    queryFn: () => getBrandSettings(branch),
  });

  const [form, setForm] = useState<Partial<BrandSettings>>(empty);
  const [testNotes, setTestNotes] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const { data: igAccounts = [] } = useQuery({
    queryKey: ['sm-ig-accounts', branch],
    queryFn: () => listIgAccounts(branch),
  });

  const save = useMutation({
    mutationFn: () => upsertBrandSettings(branch, form),
    onSuccess: () => {
      toast.success(`${branch} brand settings saved`);
      qc.invalidateQueries({ queryKey: ['sm-brand', branch] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  const set = <K extends keyof BrandSettings>(key: K, val: BrandSettings[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const runToneTest = async () => {
    if (!testNotes.trim()) {
      toast.error('Add a sample event description first');
      return;
    }
    setTesting(true);
    setTestResult('');
    try {
      // Save unsaved changes first so the AI uses what's on screen
      await upsertBrandSettings(branch, form);
      const out = await generateCaption({
        branch,
        content_type: 'Educational',
        notes_for_ai: testNotes,
        mode: 'tone-test',
      });
      setTestResult(`${out.caption}\n\n${out.cta}\n\n${out.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Tone test failed');
    } finally {
      setTesting(false);
    }
  };

  const connectIg = () => {
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-ig-oauth-start?branch=${encodeURIComponent(branch)}`;
    // Fall back path if env isn't set
    void projectRef;
    window.open(url, '_blank', 'width=600,height=700');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Brand voice — {branch}</CardTitle>
          <CardDescription>
            These rules guide every AI-generated caption for this branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Tone of voice</Label>
              <Textarea
                rows={3}
                value={form.tone_of_voice ?? ''}
                onChange={(e) => set('tone_of_voice', e.target.value)}
                placeholder="Encouraging, family-friendly, confident…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Target audience</Label>
              <Input
                value={form.target_audience ?? ''}
                onChange={(e) => set('target_audience', e.target.value)}
                placeholder="Parents of children aged 4-14…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>CTA style</Label>
              <Input
                value={form.cta_style ?? ''}
                onChange={(e) => set('cta_style', e.target.value)}
                placeholder="DM us to book a free trial…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Emoji style</Label>
              <Select
                value={form.emoji_style ?? 'moderate'}
                onValueChange={(v) => set('emoji_style', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="minimal">Minimal (1-2)</SelectItem>
                  <SelectItem value="moderate">Moderate (3-5)</SelectItem>
                  <SelectItem value="lots">Lots (6+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Caption length</Label>
              <Select
                value={form.preferred_caption_length ?? 'medium'}
                onValueChange={(v) => set('preferred_caption_length', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (≤ 80 chars)</SelectItem>
                  <SelectItem value="medium">Medium (80-200 chars)</SelectItem>
                  <SelectItem value="long">Long (200-400 chars)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Brand keywords</Label>
              <ChipInput
                value={form.brand_keywords ?? []}
                onChange={(v) => set('brand_keywords', v)}
                placeholder="Type a keyword and press Enter"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Banned words</Label>
              <ChipInput
                value={form.banned_words ?? []}
                onChange={(v) => set('banned_words', v)}
                placeholder="Words AI must avoid"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Default hashtags</Label>
              <ChipInput
                value={form.default_hashtags ?? []}
                onChange={(v) => set('default_hashtags', v.map((t) => t.replace(/^#/, '')))}
                placeholder="taekwondo, perthkids… (no #)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Posting frequency</Label>
              <Input
                value={form.posting_frequency ?? ''}
                onChange={(e) => set('posting_frequency', e.target.value)}
                placeholder="3-5 posts per week"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input
                value={form.logo_url ?? ''}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test AI tone</CardTitle>
            <CardDescription>Generate a sample caption using current settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              value={testNotes}
              onChange={(e) => setTestNotes(e.target.value)}
              placeholder="e.g. Saturday kids belt grading — 12 students promoted"
            />
            <Button onClick={runToneTest} disabled={testing} className="w-full">
              {testing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate sample
            </Button>
            {testResult && (
              <div className="text-xs whitespace-pre-wrap bg-muted rounded-md p-3 max-h-64 overflow-auto">
                {testResult}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instagram accounts</CardTitle>
            <CardDescription>Connect this branch's Instagram Business profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {igAccounts.length === 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <WifiOff className="h-4 w-4" /> No accounts connected.
              </div>
            )}
            {igAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Wifi className="h-4 w-4 text-green-600" />@{a.ig_username ?? a.ig_user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.page_name ?? 'Page'} · {a.status}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await disconnectIgAccount(a.id);
                    toast.success('Disconnected');
                    location.reload();
                  }}
                >
                  Disconnect
                </Button>
              </div>
            ))}
            <Button onClick={connectIg} variant="outline" className="w-full">
              Connect Instagram
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Requires <Badge variant="secondary" className="text-[10px]">META_APP_ID</Badge>,{' '}
              <Badge variant="secondary" className="text-[10px]">META_APP_SECRET</Badge>, and{' '}
              <Badge variant="secondary" className="text-[10px]">META_REDIRECT_URI</Badge> secrets.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const BrandSettingsPage = () => {
  return (
    <SocialLayout
      title="Brand Settings"
      description="Define the voice, keywords and Instagram connection per branch. AI captions follow these rules."
    >
      <Tabs defaultValue="Perth">
        <TabsList>
          {BRANCHES.map((b) => (
            <TabsTrigger key={b} value={b}>{b}</TabsTrigger>
          ))}
        </TabsList>
        {BRANCHES.map((b) => (
          <TabsContent key={b} value={b} className="mt-4">
            <BrandForm branch={b} />
          </TabsContent>
        ))}
      </Tabs>
    </SocialLayout>
  );
};

export default BrandSettingsPage;
