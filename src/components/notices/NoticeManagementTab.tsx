import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit, Megaphone, Eye, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getNotices, deleteNotice, updateNotice, Notice } from '@/services/noticeService';
import CreateEditNoticeDialog from './CreateEditNoticeDialog';
import NoticePopupDialog from './NoticePopupDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NoticeManagementTabProps {
  role: 'superadmin' | 'branch';
  branchId?: string;
  userEmail: string;
}

const NoticeManagementTab: React.FC<NoticeManagementTabProps> = ({ role, branchId, userEmail }) => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [viewNotice, setViewNotice] = useState<Notice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: getNotices,
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNotice(deleteTarget.id);
      toast.success('Notice deleted');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    } catch {
      toast.error('Failed to delete notice');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (notice: Notice) => {
    try {
      await updateNotice(notice.id, { is_active: !notice.is_active });
      toast.success(notice.is_active ? 'Notice disabled' : 'Notice enabled');
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    } catch {
      toast.error('Failed to update notice');
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notices'] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="w-5 h-5" /> Notices
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Notice
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No notices yet. Click "Add Notice" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notices.map(notice => (
            <Card key={notice.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setViewNotice(notice)}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{notice.subject}</p>
                    {notice.target_branches ? (
                      <Badge variant="outline" className="text-xs">{notice.target_branches.length} branch(es)</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">All Branches</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewNotice(notice)} title="Preview">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {role === 'branch' && notice.created_by_branch_id === null ? null : (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditNotice(notice)} title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {(role === 'superadmin' || notice.created_by_branch_id !== null) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(notice)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateEditNoticeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        role={role}
        branchId={branchId}
        userEmail={userEmail}
        onSaved={refresh}
      />

      {/* Edit Dialog */}
      <CreateEditNoticeDialog
        open={!!editNotice}
        onOpenChange={(open) => { if (!open) setEditNotice(null); }}
        notice={editNotice}
        role={role}
        branchId={branchId}
        userEmail={userEmail}
        onSaved={refresh}
      />

      {/* View Dialog */}
      <NoticePopupDialog
        open={!!viewNotice}
        onOpenChange={(open) => { if (!open) setViewNotice(null); }}
        notice={viewNotice}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.subject}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NoticeManagementTab;
