import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Finance-tab-only marker: payment was confirmed by an ANEXT bank transfer. */
const AnextVerifiedBadge: React.FC<{ className?: string }> = ({ className }) => (
  <Badge variant="outline" className={cn('gap-1 border-primary text-primary px-1.5 py-0 text-[10px]', className)}>
    <BadgeCheck className="h-3 w-3" />ANEXT verified
  </Badge>
);
export default AnextVerifiedBadge;
