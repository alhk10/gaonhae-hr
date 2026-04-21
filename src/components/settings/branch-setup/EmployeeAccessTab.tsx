import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Shield, Trash2, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getBranchAccessList,
  grantBranchAccess,
  revokeBranchAccess,
  BranchAccessWithDetails,
} from '@/services/branchAccessService';
import { toast } from 'sonner';

interface Props {
  branchId: string;
}

export const EmployeeAccessTab: React.FC<Props> = ({ branchId }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [canViewDashboard, setCanViewDashboard] = useState(true);
  const [canApproveChanges, setCanApproveChanges] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, type, position')
        .is('resign_date', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ['branch-access', branchId],
    queryFn: () => getBranchAccessList(branchId),
    enabled: !!branchId,
  });

  const grantMutation = useMutation({
    mutationFn: () =>
      grantBranchAccess(selectedEmployee, branchId, canViewDashboard, canApproveChanges),
    onSuccess: () => {
      toast.success('Access granted');
      queryClient.invalidateQueries({ queryKey: ['branch-access', branchId] });
      setAddOpen(false);
      setSelectedEmployee('');
      setCanViewDashboard(true);
      setCanApproveChanges(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to grant access'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ employeeId }: { employeeId: string }) =>
      revokeBranchAccess(employeeId, branchId),
    onSuccess: () => {
      toast.success('Access revoked');
      queryClient.invalidateQueries({ queryKey: ['branch-access', branchId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to revoke access'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ employeeId, canView, canApprove }: { employeeId: string; canView: boolean; canApprove: boolean }) =>
      grantBranchAccess(employeeId, branchId, canView, canApprove),
    onSuccess: () => {
      toast.success('Access updated');
      queryClient.invalidateQueries({ queryKey: ['branch-access', branchId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update access'),
  });

  const availableEmployees = employees.filter(
    (emp) => !accessList.some((a) => a.employee_id === emp.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage which employees can view this branch dashboard and approve changes.
        </p>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : accessList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p>No employees have access to this branch yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accessList.map((access) => (
            <div
              key={access.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <div className="min-w-0">
                <p className="font-medium">{access.employee_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {access.can_view_dashboard && (
                    <Badge variant="outline" className="text-xs">
                      <Eye className="w-3 h-3 mr-1" />Dashboard
                    </Badge>
                  )}
                  {access.can_approve_changes && (
                    <Badge variant="default" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />Can Approve
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">View</Label>
                  <Switch
                    checked={access.can_view_dashboard}
                    onCheckedChange={() =>
                      updateMutation.mutate({
                        employeeId: access.employee_id,
                        canView: !access.can_view_dashboard,
                        canApprove: access.can_approve_changes,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Approve</Label>
                  <Switch
                    checked={access.can_approve_changes}
                    onCheckedChange={() =>
                      updateMutation.mutate({
                        employeeId: access.employee_id,
                        canView: access.can_view_dashboard,
                        canApprove: !access.can_approve_changes,
                      })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remove ${access.employee_name}'s access?`)) {
                      revokeMutation.mutate({ employeeId: access.employee_id });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Branch Access</DialogTitle>
            <DialogDescription>
              Select an employee and configure permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>View Dashboard</Label>
                  <p className="text-xs text-muted-foreground">Branch students, revenue, analytics</p>
                </div>
                <Switch checked={canViewDashboard} onCheckedChange={setCanViewDashboard} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Approve Changes</Label>
                  <p className="text-xs text-muted-foreground">Approve student profile updates</p>
                </div>
                <Switch checked={canApproveChanges} onCheckedChange={setCanApproveChanges} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => grantMutation.mutate()}
              disabled={!selectedEmployee || grantMutation.isPending}
            >
              {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
