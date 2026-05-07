import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Receipt, Eye } from 'lucide-react';
import { getEmployeeClaims, Claim } from '@/services/claimsService';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/utils/dateFormat';
import { openSignedUrl } from '@/components/common/SignedMedia';

interface EmployeeClaimHistoryProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeClaimHistory: React.FC<EmployeeClaimHistoryProps> = ({
  employeeId,
  employeeName
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const { data: claims = [], isLoading, error } = useQuery({
    queryKey: ['employeeClaims', employeeId],
    queryFn: () => getEmployeeClaims(employeeId),
    enabled: isExpanded
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const totalAmount = claims.reduce((sum, claim) => 
    claim.status === 'Approved' ? sum + claim.amount : sum, 0
  );

  if (!isExpanded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Claim History
              </CardTitle>
              <CardDescription>
                View {employeeName}'s claim submissions and status
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Claim History
            </CardTitle>
            <CardDescription>
              {claims.length} total claims • ${totalAmount.toFixed(2)} approved
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            Error loading claims
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No claims found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.slice(0, 10).map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">
                      {formatDate(new Date(claim.date))}
                    </TableCell>
                    <TableCell>{claim.type}</TableCell>
                    <TableCell>${claim.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(claim.status)}>
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedClaim(claim)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Claim Details</DialogTitle>
                          </DialogHeader>
                          {selectedClaim && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Date</label>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(new Date(selectedClaim.date))}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Type</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedClaim.type}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <p className="text-sm text-muted-foreground">
                                    ${selectedClaim.amount.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Badge className={getStatusColor(selectedClaim.status)}>
                                    {selectedClaim.status}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {selectedClaim.description || 'No description provided'}
                                </p>
                              </div>
                              {selectedClaim.receipt_url && (
                                <div>
                                  <label className="text-sm font-medium">Receipt</label>
                                  <div className="mt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openSignedUrl(selectedClaim.receipt_url)}
                                    >
                                      View Receipt
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {claims.length > 10 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Showing 10 of {claims.length} claims
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeClaimHistory;