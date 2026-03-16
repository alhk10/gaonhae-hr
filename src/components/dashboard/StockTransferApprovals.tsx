import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingTransferRequests, approveTransferRequest, rejectTransferRequest } from '@/services/inventoryTransferService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const StockTransferApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['pending-transfer-requests'],
    queryFn: getPendingTransferRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (requests.length === 0 && !isLoading) return null;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const success = await approveTransferRequest(id, user?.email || '');
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-count'] });
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    const success = await rejectTransferRequest(id, user?.email || '');
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-count'] });
    }
    setProcessingId(null);
  };

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Stock Transfers
          <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{req.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {req.from_branch_name} → {req.to_branch_name} • Qty: {req.quantity}
                    {req.size_variant && ` • Size: ${req.size_variant}`}
                  </p>
                  {req.reason && <p className="text-xs text-muted-foreground">{req.reason}</p>}
                  <p className="text-xs text-muted-foreground">
                    By {req.requested_by} • {format(new Date(req.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                  >
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                  >
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockTransferApprovals;
