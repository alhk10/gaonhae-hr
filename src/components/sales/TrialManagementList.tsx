/**
 * Trial Management List
 * Displays and manages trial registrations
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, MoreVertical, Eye, UserCheck, X, Calendar, Clock, Phone, Building2 } from 'lucide-react';
import { parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { useBranches } from '@/hooks/useBranches';
import { useNavigate } from 'react-router-dom';
import { getTrials, convertTrialToStudent, updateStudent } from '@/services/studentService';
import { formatDate } from '@/utils/dateFormat';

const TrialManagementList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches } = useBranches();
  
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Fetch trials
  const { data: trialsData, isLoading } = useQuery({
    queryKey: ['trials', page, search, branchFilter],
    queryFn: () => getTrials(page, 20, search, branchFilter === 'all' ? undefined : branchFilter),
    staleTime: 5 * 60 * 1000,
  });

  // Convert to student mutation
  const convertMutation = useMutation({
    mutationFn: convertTrialToStudent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Trial converted to student successfully');
      navigate(`/parties/student/${data.id}?edit=true`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to convert trial');
    }
  });

  // Cancel trial mutation
  const cancelMutation = useMutation({
    mutationFn: (studentId: string) => updateStudent(studentId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      toast.success('Trial cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel trial');
    }
  });

  const trials = trialsData?.students || [];
  const total = trialsData?.total || 0;

  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'Not assigned';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  const getTrialStatus = (trialDate: string | undefined, trialTime: string | undefined) => {
    if (!trialDate) return { label: 'Not Scheduled', variant: 'secondary' as const };
    
    const today = new Date();
    const trial = parseISO(trialDate);
    
    if (isToday(trial)) {
      return { label: 'Today', variant: 'default' as const };
    } else if (isBefore(trial, today)) {
      return { label: 'Past', variant: 'outline' as const };
    } else {
      return { label: 'Upcoming', variant: 'secondary' as const };
    }
  };

  const handleView = (trialId: string) => {
    navigate(`/parties/trial/${trialId}`);
  };

  const handleConvert = (trialId: string, name: string) => {
    if (window.confirm(`Convert "${name}" to a registered student?`)) {
      convertMutation.mutate(trialId);
    }
  };

  const handleCancel = (trialId: string, name: string) => {
    if (window.confirm(`Cancel trial registration for "${name}"?`)) {
      cancelMutation.mutate(trialId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading trials...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Trial Management</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={branchFilter} onValueChange={(value) => { setBranchFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {trials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No trials found</p>
            <p className="text-sm text-muted-foreground">
              {search || branchFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Register a trial to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Trial Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trials.map((trial) => {
                const trialStatus = getTrialStatus(trial.trial_date, trial.trial_time);
                return (
                  <TableRow key={trial.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => handleView(trial.id)}>
                      <div>
                        <p className="font-medium">{trial.display_name || `${trial.first_name} ${trial.last_name}`}</p>
                        <p className="text-sm text-muted-foreground">
                          DOB: {trial.date_of_birth ? formatDate(parseISO(trial.date_of_birth)) : 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleView(trial.id)}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{getBranchName(trial.branch_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleView(trial.id)}>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{trial.phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleView(trial.id)}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {trial.trial_date ? formatDate(parseISO(trial.trial_date)) : 'Not scheduled'}
                          </span>
                        </div>
                        {trial.trial_time && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{trial.trial_time}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleView(trial.id)}>
                      <Badge variant={trialStatus.variant}>{trialStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(trial.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleConvert(trial.id, trial.display_name || `${trial.first_name} ${trial.last_name}`)}
                            className="text-green-600"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Convert to Student
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCancel(trial.id, trial.display_name || `${trial.first_name} ${trial.last_name}`)}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Trial
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total} trials
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrialManagementList;
