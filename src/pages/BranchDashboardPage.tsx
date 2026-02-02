import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import BranchDashboard from '@/components/dashboard/BranchDashboard';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { useBranches } from '@/hooks/useBranches';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const BranchDashboardPage = () => {
  const { accessibleBranches, isLoading: accessLoading } = useBranchAccess();
  const { branches, loading: branchesLoading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  // Filter branches to only show accessible ones
  const availableBranches = branches.filter(
    branch => accessibleBranches.length === 0 || accessibleBranches.includes(branch.id)
  );

  // Auto-select first branch if only one is available
  useEffect(() => {
    if (!selectedBranch && availableBranches.length === 1) {
      setSelectedBranch(availableBranches[0].id);
    }
  }, [availableBranches, selectedBranch]);

  if (accessLoading || branchesLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Branch selector if multiple branches */}
        {availableBranches.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Select Branch:</span>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {selectedBranch ? (
          <BranchDashboard branchId={selectedBranch} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a branch to view its dashboard</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default BranchDashboardPage;
