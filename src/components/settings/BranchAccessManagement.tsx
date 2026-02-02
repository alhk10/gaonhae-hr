/**
 * Branch Access Management Component
 * Allows superadmins to manage employee branch dashboard access
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, UserPlus, Trash2, Shield, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/useBranches';
import { 
  getBranchAccessList, 
  grantBranchAccess, 
  revokeBranchAccess,
  BranchAccessWithDetails
} from '@/services/branchAccessService';
import { toast } from 'sonner';

const BranchAccessManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { branches, loading: branchesLoading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [canViewDashboard, setCanViewDashboard] = useState(true);
  const [canApproveChanges, setCanApproveChanges] = useState(false);

  // Fetch employees for the add dialog
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

  // Fetch current access list for selected branch
  const { data: accessList = [], isLoading: accessLoading } = useQuery({
    queryKey: ['branch-access', selectedBranch],
    queryFn: () => getBranchAccessList(selectedBranch),
    enabled: !!selectedBranch,
  });

  // Grant access mutation
  const grantMutation = useMutation({
    mutationFn: async () => {
      return grantBranchAccess(selectedEmployee, selectedBranch, canViewDashboard, canApproveChanges);
    },
    onSuccess: () => {
      toast.success('Branch access granted successfully');
      queryClient.invalidateQueries({ queryKey: ['branch-access', selectedBranch] });
      setAddDialogOpen(false);
      setSelectedEmployee('');
      setCanViewDashboard(true);
      setCanApproveChanges(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to grant access');
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ employeeId, branchId }: { employeeId: string; branchId: string }) => {
      return revokeBranchAccess(employeeId, branchId);
    },
    onSuccess: () => {
      toast.success('Branch access revoked');
      queryClient.invalidateQueries({ queryKey: ['branch-access', selectedBranch] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke access');
    },
  });

  // Update access mutation
  const updateMutation = useMutation({
    mutationFn: async ({ employeeId, branchId, canView, canApprove }: { 
      employeeId: string; 
      branchId: string; 
      canView: boolean; 
      canApprove: boolean 
    }) => {
      return grantBranchAccess(employeeId, branchId, canView, canApprove);
    },
    onSuccess: () => {
      toast.success('Access updated');
      queryClient.invalidateQueries({ queryKey: ['branch-access', selectedBranch] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update access');
    },
  });

  // Get employees not already in access list
  const availableEmployees = employees.filter(
    emp => !accessList.some(access => access.employee_id === emp.id)
  );

  const handleGrantAccess = () => {
    if (!selectedEmployee || !selectedBranch) {
      toast.error('Please select an employee');
      return;
    }
    grantMutation.mutate();
  };

  const handleRevokeAccess = (access: BranchAccessWithDetails) => {
    if (confirm(`Remove ${access.employee_name}'s access to this branch?`)) {
      revokeMutation.mutate({ employeeId: access.employee_id, branchId: access.branch_id });
    }
  };

  const handleToggleDashboardAccess = (access: BranchAccessWithDetails) => {
    updateMutation.mutate({
      employeeId: access.employee_id,
      branchId: access.branch_id,
      canView: !access.can_view_dashboard,
      canApprove: access.can_approve_changes
    });
  };

  const handleToggleApprovalAccess = (access: BranchAccessWithDetails) => {
    updateMutation.mutate({
      employeeId: access.employee_id,
      branchId: access.branch_id,
      canView: access.can_view_dashboard,
      canApprove: !access.can_approve_changes
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Branch Dashboard Access
          </CardTitle>
          <CardDescription>
            Manage which employees can access branch dashboards and approve student changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Branch Selector */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Select Branch:</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Choose a branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedBranch && (
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>

          {/* Access List */}
          {!selectedBranch ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a branch to manage employee access</p>
            </div>
          ) : accessLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : accessList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No employees have access to this branch dashboard yet</p>
              <Button 
                onClick={() => setAddDialogOpen(true)} 
                variant="outline" 
                className="mt-4"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Grant Access to Employee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accessList.map((access) => (
                <div 
                  key={access.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{access.employee_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {access.can_view_dashboard && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          Dashboard
                        </Badge>
                      )}
                      {access.can_approve_changes && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Can Approve
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">View</Label>
                      <Switch
                        checked={access.can_view_dashboard}
                        onCheckedChange={() => handleToggleDashboardAccess(access)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Approve</Label>
                      <Switch
                        checked={access.can_approve_changes}
                        onCheckedChange={() => handleToggleApprovalAccess(access)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevokeAccess(access)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Branch Access</DialogTitle>
            <DialogDescription>
              Select an employee and configure their branch dashboard permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>View Dashboard</Label>
                  <p className="text-xs text-muted-foreground">
                    Can view branch students, revenue, and analytics
                  </p>
                </div>
                <Switch
                  checked={canViewDashboard}
                  onCheckedChange={setCanViewDashboard}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Approve Changes</Label>
                  <p className="text-xs text-muted-foreground">
                    Can approve student profile update requests
                  </p>
                </div>
                <Switch
                  checked={canApproveChanges}
                  onCheckedChange={setCanApproveChanges}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGrantAccess}
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

export default BranchAccessManagement;
