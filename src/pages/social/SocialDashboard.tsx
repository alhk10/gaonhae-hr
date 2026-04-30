import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Clock, CheckCircle2, FileText } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlatformBadge from '@/components/social/PlatformBadge';
import { listPosts } from '@/services/social/postService';
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/lib/social/platforms';

const SocialDashboard = () => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['sm-posts-all'],
    queryFn: () => listPosts(),
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const dueNow = posts.filter(
      (p) => p.status === 'queued' && p.scheduled_for && new Date(p.scheduled_for).getTime() <= now,
    );
    const queued = posts.filter((p) => p.status === 'queued');
    const drafts = posts.filter((p) => p.status === 'draft');

    const postedThisWeekByPlatform: Record<Platform, number> = { instagram: 0, facebook: 0, tiktok: 0 };
    for (const p of posts) {
      const pp = p.posted_platforms ?? {};
      for (const plat of PLATFORMS) {
        const ts = pp[plat];
        if (ts && new Date(ts).getTime() >= weekAgo) postedThisWeekByPlatform[plat] += 1;
      }
    }

    return { dueNow, queued, drafts, postedThisWeekByPlatform };
  }, [posts]);

  return (
    <SocialLayout
      title="Social Media Dashboard"
      description="Your manual posting cockpit — what's due, what's queued, what you've shipped."
      actions={
        <Button asChild>
          <Link to="/social/create"><Plus className="h-4 w-4 mr-2" /> New post</Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top counters */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Due now" value={stats.dueNow.length} icon={Clock} accent="text-primary" />
            <StatCard label="Queued" value={stats.queued.length} icon={Clock} />
            <StatCard label="Drafts" value={stats.drafts.length} icon={FileText} />
            <StatCard label="Posted (7d)" value={
              PLATFORMS.reduce((s, p) => s + stats.postedThisWeekByPlatform[p], 0)
            } icon={CheckCircle2} accent="text-green-600" />
          </div>

          {/* Posted this week by platform */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Posted this week</CardTitle>
              <CardDescription>Items you marked as posted in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <div key={p} className="border rounded-md p-3 text-center space-y-1">
                    <PlatformBadge platform={p} />
                    <div className="text-2xl font-semibold">{stats.postedThisWeekByPlatform[p]}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ready to post now */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Ready to post now</CardTitle>
                  <CardDescription>Queued items past their reminder time.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/social/scheduled">Open queue</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.dueNow.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nothing due right now. </p>
              ) : (
                <div className="space-y-2">
                  {stats.dueNow.slice(0, 5).map((p) => (
                    <Link
                      to="/social/scheduled"
                      key={p.id}
                      className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{p.content_type}{p.event_name ? ` · ${p.event_name}` : ''}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.branch_name} · {new Date(p.scheduled_for!).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {(p.target_platforms ?? []).map((plat) => (
                          <PlatformBadge key={plat} platform={plat} />
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </SocialLayout>
  );
};

const StatCard = ({
  label, value, icon: Icon, accent = '',
}: { label: string; value: number; icon: any; accent?: string }) => (
  <Card>
    <CardContent className="pt-6 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
      </div>
      <Icon className={`h-6 w-6 ${accent || 'text-muted-foreground'}`} />
    </CardContent>
  </Card>
);

export default SocialDashboard;
