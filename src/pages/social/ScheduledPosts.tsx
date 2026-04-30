import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Download, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import CopyButton from '@/components/social/CopyButton';
import PlatformBadge from '@/components/social/PlatformBadge';
import {
  listPosts, deletePost, markPlatformPosted, listPostMedia, getSignedMediaUrl,
  type SocialPost,
} from '@/services/social/postService';
import {
  PLATFORM_LABELS, type Platform,
} from '@/lib/social/platforms';
import {
  downloadMediaBundle, fetchAsBlob, formatCaptionForCopy,
} from '@/lib/social/exportHelpers';

const STATUS_OPTIONS = ['all', 'queued', 'draft', 'posted', 'archived'] as const;

const ScheduledPosts = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>('queued');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['sm-posts', statusFilter, branchFilter],
    queryFn: () => listPosts({
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      branch: branchFilter === 'all' ? undefined : branchFilter,
    }),
  });

  const branches = useMemo(() => {
    const s = new Set(posts.map((p) => p.branch_name));
    return Array.from(s);
  }, [posts]);

  const onMarkPosted = async (post: SocialPost, p: Platform) => {
    try {
      await markPlatformPosted(post.id, p, !post.posted_platforms?.[p]);
      toast.success(post.posted_platforms?.[p] ? 'Unmarked' : `Marked ${PLATFORM_LABELS[p]} as posted`);
      qc.invalidateQueries({ queryKey: ['sm-posts'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  };

  const onDownload = async (post: SocialPost) => {
    try {
      const media = await listPostMedia(post.id);
      if (!media.length) {
        toast.error('No media attached');
        return;
      }
      const files = await Promise.all(media.map(async (m) => {
        const url = await getSignedMediaUrl(m.storage_path);
        const blob = await fetchAsBlob(url);
        const ext = m.storage_path.split('.').pop() ?? 'bin';
        return { name: `${m.id.slice(0, 6)}.${ext}`, blob };
      }));
      await downloadMediaBundle(files, `${post.branch_name}-${post.content_type}-${post.id.slice(0, 6)}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Download failed');
    }
  };

  const onDelete = async (post: SocialPost) => {
    if (!confirm('Delete this post?')) return;
    try {
      await deletePost(post.id);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['sm-posts'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    }
  };

  return (
    <SocialLayout
      title="Posting Queue"
      description="Manual checklist of posts ready to publish. Download the media, copy the caption, post on each platform, then mark as posted."
    >
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No posts match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const targets = post.target_platforms ?? [];
            const due = post.scheduled_for ? new Date(post.scheduled_for) : null;
            const isDue = due ? due.getTime() <= Date.now() : false;
            return (
              <Card key={post.id} className={isDue && post.status === 'queued' ? 'border-primary/60' : ''}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {post.content_type}
                        {post.event_name ? ` · ${post.event_name}` : ''}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap mt-1">
                        <span>{post.branch_name}</span>
                        {due && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {due.toLocaleString()}
                            {isDue && <span className="text-primary font-medium">(due now)</span>}
                          </span>
                        )}
                        <span className="capitalize">· {post.status}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {targets.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    {targets.map((p) => {
                      const c = post.platform_captions?.[p];
                      const posted = !!post.posted_platforms?.[p];
                      return (
                        <div key={p} className="border rounded-md p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <PlatformBadge platform={p} />
                            {posted && (
                              <span className="text-[11px] text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> posted
                              </span>
                            )}
                          </div>
                          <p className="text-xs whitespace-pre-wrap line-clamp-4">
                            {c?.caption || <span className="text-muted-foreground">No caption</span>}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            <CopyButton text={c ? formatCaptionForCopy(c) : ''} label="Copy" />
                            <Button
                              size="sm"
                              variant={posted ? 'secondary' : 'default'}
                              onClick={() => onMarkPosted(post, p)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              {posted ? 'Undo' : 'Posted'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => onDownload(post)}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download media
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(post)} className="ml-auto text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </SocialLayout>
  );
};

export default ScheduledPosts;
