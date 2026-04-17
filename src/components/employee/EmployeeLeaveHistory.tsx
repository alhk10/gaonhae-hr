import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/utils/dateFormat';

interface LeaveRequest {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  reason: string;
  applied_date: string;
  reviewed_by?: string;
  reviewed_date?: string;
}

interface EmployeeLeaveHistoryProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeLeaveHistory: React.FC<EmployeeLeaveHistoryProps> = ({
  employeeId,
  employeeName
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const { data: leaveRequests = [], isLoading, error } = useQuery({
    queryKey: ['employeeLeaveHistory', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('applied_date', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
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

  const approvedDays = leaveRequests
    .filter(leave => leave.status === 'Approved')
    .reduce((sum, leave) => sum + leave.days_requested, 0);

  if (!isExpanded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave History
              </CardTitle>
              <CardDescription>
                View {employeeName}'s leave requests and balance
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
              <Calendar className="h-5 w-5" />
              Leave History
            </CardTitle>
            <CardDescription>
              {leaveRequests.length} total requests • {approvedDays} days approved
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
            Error loading leave history
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leave requests found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.slice(0, 10).map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.type}</TableCell>
                    <TableCell>
                      {formatDate(new Date(leave.start_date))} - {' '}
                      {formatDate(new Date(leave.end_date))}
                    </TableCell>
                    <TableCell>{leave.days_requested}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(leave.status)}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLeave(leave)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Leave Request Details</DialogTitle>
                          </DialogHeader>
                          {selectedLeave && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Type</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedLeave.type}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Days Requested</label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedLeave.days_requested}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Start Date</label>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(new Date(selectedLeave.start_date))}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">End Date</label>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(new Date(selectedLeave.end_date))}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Applied Date</label>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(new Date(selectedLeave.applied_date))}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Badge className={getStatusColor(selectedLeave.status)}>
                                    {selectedLeave.status}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Reason</label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {selectedLeave.reason || 'No reason provided'}
                                </p>
                              </div>
                              {selectedLeave.reviewed_by && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Reviewed By</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedLeave.reviewed_by}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Reviewed Date</label>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(selectedLeave.reviewed_date 
                                        ? new Date(selectedLeave.reviewed_date))
                                        : 'N/A'
                                      }
                                    </p>
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
            {leaveRequests.length > 10 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Showing 10 of {leaveRequests.length} leave requests
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeLeaveHistory;