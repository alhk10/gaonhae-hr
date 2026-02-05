/**
 * Claims Approvals Component
 * Displays pending claims for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getClaims, updateClaimStatus } from '@/services/claimsService';
import { formatCurrency } from '@/utils/currencyUtils';

const ClaimsApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingClaims = [], isLoading, error } = useQuery({
    queryKey: ['pending-claims-approvals'],
    queryFn: async () => {
      const allClaims = await getClaims();
      return allClaims.filter(c => c.status === 'Pending');
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (claimId: number) => updateClaimStatus(claimId, 'Approved'),
    onSuccess: () => {
      toast.success('Claim approved successfully');
      queryClient.invalidateQueries({ queryKey: ['pending-claims-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve claim: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (claimId: number) => updateClaimStatus(claimId, 'Rejected'),
    onSuccess: () => {
      toast.success('Claim rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-claims-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject claim: ${error.message}`);
    }
  });

  const handleApprove = (claimId: number) => {
    if (confirm('Are you sure you want to approve this claim?')) {
      approveMutation.mutate(claimId);
    }
  };

  const handleReject = (claimId: number) => {
    if (confirm('Are you sure you want to reject this claim?')) {
      rejectMutation.mutate(claimId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Claims Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load claims</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingClaims.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Claims Approvals
          {pendingClaims.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
              {pendingClaims.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve or reject employee claims
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">
                    {claim.employee}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{claim.type}</Badge>
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {formatCurrency(claim.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(claim.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {claim.description || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {claim.receipt_url ? (
                      <a
                        href={claim.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Approve claim"
                        onClick={() => handleApprove(claim.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Reject claim"
                        onClick={() => handleReject(claim.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimsApprovals;
