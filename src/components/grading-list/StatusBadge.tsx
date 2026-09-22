import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CanonicalStatus =
  | 'pending_verification'
  | 'paid'
  | 'paid_verified'
  | 'partially_paid'
  | 'unpaid'
  | 'rejected'
  | 'cancelled'
  | 'none';

const GREEN = 'bg-green-100 text-green-800 border-green-200';
const AMBER = 'bg-yellow-100 text-yellow-800 border-yellow-200';
const RED = 'bg-red-100 text-red-800 border-red-200';
const GREY = 'bg-gray-100 text-gray-700 border-gray-200';

const META: Record<CanonicalStatus, { label: string; className: string }> = {
  pending_verification: { label: 'Pending verification', className: AMBER },
  paid: { label: 'Paid', className: GREEN },
  paid_verified: { label: 'Paid & Verified', className: GREEN },
  partially_paid: { label: 'Partially paid', className: AMBER },
  unpaid: { label: 'Unpaid', className: RED },
  rejected: { label: 'Rejected', className: RED },
  cancelled: { label: 'Cancelled', className: GREY },
  none: { label: 'No invoice', className: GREY },
};

/**
 * Maps every raw status value used across submissions and invoices to one
 * canonical presentation status.
 */
export const normalizeStatus = (raw?: string | null): CanonicalStatus => {
  const v = (raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!v) return 'none';
  switch (v) {
    case 'verified':
    case 'paid_verified':
    case 'paid_&_verified':
      return 'paid_verified';
    case 'paid':
    case 'completed':
      return 'paid';
    case 'partially_paid':
    case 'partial':
      return 'partially_paid';
    case 'pending':
    case 'pending_verification':
    case 'awaiting_verification':
    case 'submitted':
      return 'pending_verification';
    case 'rejected':
    case 'failed':
      return 'rejected';
    case 'cancelled':
    case 'canceled':
    case 'refunded':
      return 'cancelled';
    case 'draft':
    case 'sent':
    case 'unpaid':
    case 'overdue':
      return 'unpaid';
    default:
      return 'pending_verification';
  }
};

export const statusLabel = (raw?: string | null): string => META[normalizeStatus(raw)].label;
export const statusClasses = (raw?: string | null): string => META[normalizeStatus(raw)].className;

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  /** Override the displayed text while keeping standard colours. */
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, label }) => (
  <Badge variant="outline" className={cn(statusClasses(status), 'whitespace-nowrap', className)}>
    {label ?? statusLabel(status)}
  </Badge>
);

export default StatusBadge;
