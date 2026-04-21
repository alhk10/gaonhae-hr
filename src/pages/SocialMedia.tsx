import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import {
  listSocialPosts,
  updateSocialPost,
  type SocialPost,
} from '@/services/socialMediaService';
import { PostStatusBadge } from '@/components/social/PostStatusBadge';
import { PostEditorDialog } from '@/components/social/PostEditorDialog';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Plus, Calendar as CalIcon, CheckCircle, XCircle, Instagram } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

const SocialMedia: React.FC = () => {
  const { user, userrole } = useAuth();
  const { branches } = useBranches();
  const isSuperadmin = userrole === 'superadmin';
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listSocialPosts({
        branchId: filterBranch !== 'all' ? filterBranch : undefined,
      });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [filterBranch]);

  const openNew = () => { setEditingPost(null); setEditorOpen(true); };
  const openEdit = (p: SocialPost) => { setEditingPost(p); setEditorOpen(true); };

  const pending = posts.filter((p) => p.status === 'pending_approval');

  const approve = async (post: SocialPost) => {
    try {
      await updateSocialPost(post.id, {
        status: post.scheduled_at ? 'scheduled' : 'approved',
        approved_by: user?.email || null,
        approved_at: new Date().toISOString(),
      });
      toast({ title: post.scheduled_at ? 'Approved & scheduled' : 'Approved' });
      reload();
    } catch (e) {
      toast({ title: 'Approve failed', variant: 'destructive' });
    }
  };

  const reject = async (post: SocialPost) => {
    try {
      await updateSocialPost(post.id, {
        status: 'draft',
        rejection_note: rejectNote || 'Rejected by reviewer',
      });
      toast({ title: 'Rejected — sent back to draft' });
      setRejectingId(null);
      setRejectNote('');
      reload();
    } catch (e) {
      toast({ title: 'Reject failed', variant: 'destructive' });
    }
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || id;

  // Calendar grouping
  const postsByDay = new Map<string, SocialPost[]>();
  posts.forEach((p) => {
    if (!p.scheduled_at) return;
    const key = format(new Date(p.scheduled_at), 'yyyy-MM-dd');
    if (!postsByDay.has(key)) postsByDay.set(key, []);
    postsByDay.get(key)!.push(p);
  });

  return (
    <ResponsiveLayout>
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Instagram className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Social Media</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Post</Button>
          </div>
        </div>

        <Tabs defaultValue="create">
          <TabsList>
            <TabsTrigger value="create">All Posts</TabsTrigger>
            <TabsTrigger value="calendar"><CalIcon className="w-4 h-4 mr-1" /> Calendar</TabsTrigger>
            {isSuperadmin && (
              <TabsTrigger value="approvals">
                Approvals {pending.length > 0 && <Badge variant="secondary" className="ml-1">{pending.length}</Badge>}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="text-center text-muted-foreground py-8">Loading…</div>
                ) : posts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No posts yet. Click <strong>New Post</strong> to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {posts.map((p) => (
                      <Card key={p.id} className="cursor-pointer hover:border-primary transition" onClick={() => openEdit(p)}>
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.media_url ? (
                            p.media_type === 'video' ? (
                              <video src={p.media_url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No media</div>
                          )}
                        </div>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{branchName(p.branch_id)}</span>
                            <PostStatusBadge status={p.status} />
                          </div>
                          <p className="text-sm line-clamp-2">{p.caption || <em className="text-muted-foreground">No caption</em>}</p>
                          {p.scheduled_at && (
                            <p className="text-xs text-muted-foreground">
                              📅 {format(new Date(p.scheduled_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  className="mx-auto"
                  modifiers={{
                    hasPost: (d) => postsByDay.has(format(d, 'yyyy-MM-dd')),
                  }}
                  modifiersClassNames={{ hasPost: 'bg-primary/20 font-semibold' }}
                />
                <div className="mt-4 space-y-2">
                  {Array.from(postsByDay.entries())
                    .filter(([k]) => k.startsWith(format(calMonth, 'yyyy-MM')))
                    .sort()
                    .map(([day, items]) => (
                      <div key={day} className="border rounded p-2">
                        <div className="text-xs font-semibold mb-1">{format(new Date(day), 'EEE dd MMM yyyy')}</div>
                        <div className="flex flex-wrap gap-1">
                          {items.map((p) => (
                            <button
                              key={p.id}
                              className="text-xs px-2 py-1 rounded border hover:bg-muted"
                              onClick={() => openEdit(p)}
                            >
                              {branchName(p.branch_id)} • <PostStatusBadge status={p.status} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperadmin && (
            <TabsContent value="approvals">
              <Card>
                <CardHeader><CardTitle>Pending Approval ({pending.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {pending.length === 0 && <p className="text-muted-foreground text-sm">Nothing pending.</p>}
                  {pending.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
                        <div className="w-full sm:w-32 h-32 bg-muted rounded overflow-hidden flex-shrink-0">
                          {p.media_url && (p.media_type === 'video' ? (
                            <video src={p.media_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                          ))}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <strong>{branchName(p.branch_id)}</strong>
                            <Badge variant="outline">{p.content_type}</Badge>
                            {p.scheduled_at && (
                              <span className="text-xs text-muted-foreground">
                                📅 {format(new Date(p.scheduled_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap line-clamp-3">{p.caption}</p>
                          <p className="text-xs text-muted-foreground">By {p.created_by}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>View</Button>
                            <Button size="sm" onClick={() => approve(p)}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectingId(p.id)}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                          {rejectingId === p.id && (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                placeholder="Reason for rejection"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={() => reject(p)}>Confirm Reject</Button>
                                <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <PostEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        post={editingPost}
        defaultBranchId={filterBranch !== 'all' ? filterBranch : undefined}
        onSaved={reload}
      />
    </ResponsiveLayout>
  );
};

export default SocialMedia;
