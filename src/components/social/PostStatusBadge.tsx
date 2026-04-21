import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { PostStatus } from '@/services/socialMediaService';

const STATUS_VARIANTS: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  scheduled: { label: 'Scheduled', className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400' },
  publishing: { label: 'Publishing…', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400' },
  published: { label: 'Published', className: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
};

export const PostStatusBadge: React.FC<{ status: PostStatus }> = ({ status }) => {
  const v = STATUS_VARIANTS[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
};
