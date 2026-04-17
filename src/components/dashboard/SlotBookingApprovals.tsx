/**
 * Slot Booking Approvals Component
 * Displays pending slot bookings for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Clock, AlertCircle, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAllSlotBookings, updateSlotBookingStatus } from '@/services/slotBookingService';
import { formatDate } from '@/utils/dateFormat';

const SlotBookingApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingBookings = [], isLoading, error } = useQuery({
    queryKey: ['pending-booking-approvals'],
    queryFn: async () => {
      const allBookings = await getAllSlotBookings();
      return allBookings.filter(b => b.status === 'pending');
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (bookingId: string) => updateSlotBookingStatus(bookingId, 'approved', 'Superadmin'),
    onSuccess: () => {
      toast.success('Booking approved');
      queryClient.invalidateQueries({ queryKey: ['pending-booking-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['slot-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve booking: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId: string) => updateSlotBookingStatus(bookingId, 'rejected', 'Superadmin'),
    onSuccess: () => {
      toast.success('Booking rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-booking-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['slot-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject booking: ${error.message}`);
    }
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        pendingBookings.map(b => updateSlotBookingStatus(b.id, 'approved', 'Superadmin'))
      );
      return results;
    },
    onSuccess: () => {
      toast.success(`All ${pendingBookings.length} bookings approved`);
      queryClient.invalidateQueries({ queryKey: ['pending-booking-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['slot-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve all: ${error.message}`);
    }
  });

  const handleApprove = (bookingId: string) => {
    approveMutation.mutate(bookingId);
  };

  const handleReject = (bookingId: string) => {
    if (confirm('Are you sure you want to reject this booking?')) {
      rejectMutation.mutate(bookingId);
    }
  };

  const handleApproveAll = () => {
    if (confirm(`Approve all ${pendingBookings.length} pending bookings?`)) {
      approveAllMutation.mutate();
    }
  };

  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Slot Booking Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load bookings</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingBookings.length === 0 && !isLoading) {
    return null;
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending || approveAllMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Slot Booking Approvals
              {pendingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">
                  {pendingBookings.length} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Review and approve or reject slot bookings
            </CardDescription>
          </div>
          {pendingBookings.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveAll}
              disabled={isPending}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Approve All
            </Button>
          )}
        </div>
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
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.employeeName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{booking.branchName}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(booking.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {booking.notes || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Approve booking"
                        onClick={() => handleApprove(booking.id)}
                        disabled={isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Reject booking"
                        onClick={() => handleReject(booking.id)}
                        disabled={isPending}
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

export default SlotBookingApprovals;
