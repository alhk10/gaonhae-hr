import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PlatformBadge from '@/components/social/PlatformBadge';
import { supabase } from '@/integrations/supabase/client';
import { listPosts } from '@/services/social/postService';
import { PLATFORMS, type Platform } from '@/lib/social/platforms';

interface MetricRow {
  id?: string;
  post_id: string;
  platform: Platform;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  saves: number;
  notes?: string | null;
}

const Analytics = () => {
  const qc = useQueryClient();
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['sm-posts-analytics'],
    queryFn: () => listPosts({ status: ['posted'] as any }),
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<MetricRow[]>({
    queryKey: ['sm-post-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sm_post_metrics')
        .select('*');
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const metricMap = useMemo(() => {
    const m = new Map<string, MetricRow>();
    for (const r of metrics) m.set(`${r.post_id}:${r.platform}`, r);
    return m;
  }, [metrics]);

  const totalsByPlatform = useMemo(() => {
    const t: Record<Platform, { likes: number; comments: number; views: number; posts: number }> = {
      instagram: { likes: 0, comments: 0, views: 0, posts: 0 },
      facebook: { likes: 0, comments: 0, views: 0, posts: 0 },
      tiktok: { likes: 0, comments: 0, views: 0, posts: 0 },
    };
    for (const post of posts) {
      const pp = post.posted_platforms ?? {};
      for (const plat of PLATFORMS) {
        if (pp[plat]) {
          t[plat].posts += 1;
          const m = metricMap.get(`${post.id}:${plat}`);
          if (m) {
            t[plat].likes += m.likes ?? 0;
            t[plat].comments += m.comments ?? 0;
            t[plat].views += m.views ?? 0;
          }
        }
      }
    }
    return t;
  }, [posts, metricMap]);

  if (postsLoading || metricsLoading) {
    return (
      <SocialLayout title="Analytics" description="Manual engagement log per post and platform.">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading…
        </div>
      </SocialLayout>
    );
  }

  return (
    <SocialLayout
      title="Analytics"
      description="After posting manually, log real engagement here. Numbers are entered by you — no API scraping."
    >
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-3">
          {PLATFORMS.map((p) => {
            const t = totalsByPlatform[p];
            return (
              <Card key={p}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PlatformBadge platform={p} /> Totals
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div>{t.posts} posts</div>
                  <div>{t.likes.toLocaleString()} likes</div>
                  <div>{t.comments.toLocaleString()} comments</div>
                  <div>{t.views.toLocaleString()} views</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No posted items yet. Mark posts as posted from the Posting Queue.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {post.content_type}{post.event_name ? ` · ${post.event_name}` : ''}
                  </CardTitle>
                  <CardDescription>{post.branch_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(post.target_platforms ?? []).filter((p) => post.posted_platforms?.[p]).map((p) => {
                    const existing = metricMap.get(`${post.id}:${p}`);
                    return (
                      <MetricEditor
                        key={p}
                        postId={post.id}
                        platform={p as Platform}
                        existing={existing}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['sm-post-metrics'] })}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SocialLayout>
  );
};

const MetricEditor = ({
  postId, platform, existing, onSaved,
}: {
  postId: string;
  platform: Platform;
  existing?: MetricRow;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<MetricRow>(existing ?? {
    post_id: postId, platform, likes: 0, comments: 0, views: 0, shares: 0, saves: 0,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MetricRow>(k: K, v: MetricRow[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => Number.parseInt(v || '0', 10) || 0;

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, recorded_at: new Date().toISOString() };
      const { error } = await (supabase as any)
        .from('sm_post_metrics')
        .upsert(payload, { onConflict: 'post_id,platform' });
      if (error) throw error;
      toast.success('Metrics saved');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <PlatformBadge platform={platform} />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(['likes', 'comments', 'views', 'shares', 'saves'] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-[11px] capitalize">{k}</Label>
            <Input
              type="number"
              value={form[k] ?? 0}
              onChange={(e) => set(k, num(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
