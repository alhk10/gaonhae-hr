/**
 * Small inline badges for the /access transaction lists:
 * - "Delete requested" while a superadmin approval is pending
 * - "Possible duplicate" when an identical submission arrived within 24 hours
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
  getSubmissionFlagMap,
  type SubmissionDeleteSource,
  type SubmissionFlag,
} from '@/services/submissionDeletionRequestService';

export const useSubmissionFlags = (source: SubmissionDeleteSource) =>
  useQuery<Record<string, SubmissionFlag>>({
    queryKey: ['submission-flags', source],
    queryFn: () => getSubmissionFlagMap(source),
    staleTime: 60_000,
  });

const SubmissionFlagBadges: React.FC<{ flag?: SubmissionFlag | null }> = ({ flag }) => {
  if (!flag) return null;
  return (
    <>
      {flag.delete_request_status === 'pending' && (
        <Badge variant="outline" className="ml-1 border-muted-foreground/40 text-[10px] px-1 py-0 text-muted-foreground">
          Delete requested
        </Badge>
      )}
      {flag.duplicate_of_reference && (
        <Badge
          variant="outline"
          title={`Looks like a repeat of ${flag.duplicate_of_reference}`}
          className="ml-1 border-amber-400 bg-amber-50 text-amber-800 text-[10px] px-1 py-0"
        >
          Possible duplicate
        </Badge>
      )}
    </>
  );
};

export default SubmissionFlagBadges;
