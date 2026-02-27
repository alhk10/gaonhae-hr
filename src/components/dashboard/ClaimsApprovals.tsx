/**
 * Claims Approvals Component
 * Displays pending claims for superadmin approval with inline edit
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, FileText, AlertCircle, ExternalLink, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getClaims, updateClaimStatus, updateClaim } from '@/services/claimsService';
import { getClaimTypes } from '@/services/claimTypesService';
import { formatCurrency } from '@/utils/currencyUtils';

const ClaimsApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ type: string; amount: string; description: string }>({ type: '', amount: '', description: '' });

  const { data: pendingClaims = [], isLoading, error } = useQuery({
    queryKey: ['pending-claims-approvals'],
    queryFn: async () => {
      const allClaims = await getClaims();
      return allClaims.filter(c => c.status === 'Pending');
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: claimTypes = [] } = useQuery({
    queryKey: ['claim-types'],
    queryFn: getClaimTypes,
    staleTime: 5 * 60 * 1000,
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

  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { type: string; amount: number; description: string } }) =>
      updateClaim(id, updates),
    onSuccess: () => {
      toast.success('Claim updated successfully');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['pending-claims-approvals'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update claim: ${error.message}`);
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

  const startEdit = (claim: any) => {
    setEditingId(claim.id);
    setEditData({
      type: claim.type,
      amount: String(claim.amount),
      description: claim.description || '',
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const amount = parseFloat(editData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    editMutation.mutate({
      id: editingId,
      updates: { type: editData.type, amount, description: editData.description },
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
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
              {pendingClaims.map((claim) => {
                const isEditing = editingId === claim.id;
                return (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">
                      {claim.employee}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editData.type} onValueChange={(v) => setEditData(prev => ({ ...prev, type: v }))}>
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {claimTypes.map(ct => (
                              <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{claim.type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-[100px]"
                          value={editData.amount}
                          onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                        />
                      ) : (
                        <span className="text-green-600 font-medium">{formatCurrency(claim.amount)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(claim.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          className="h-8 w-[160px]"
                          value={editData.description}
                          onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {claim.description || '-'}
                        </div>
                      )}
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
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Save changes"
                              onClick={saveEdit}
                              disabled={editMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Cancel edit"
                              onClick={cancelEdit}
                              disabled={editMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit claim"
                              onClick={() => startEdit(claim)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimsApprovals;
