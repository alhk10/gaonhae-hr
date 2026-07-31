import React, { useState, useEffect } from 'react';
import BranchDashboard from '@/components/dashboard/BranchDashboard';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { useBranches } from '@/hooks/useBranches';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const BRANCH_KEY = 'activeBranchId';

/**
 * Branch dashboard with its own branch picker.
 * Shared by the /branch-dashboard page and the portal switcher on the home dashboard.
 */
const BranchDashboardView: React.FC = () => {
  const { accessibleBranches, isLoading: accessLoading } = useBranchAccess();
  const { branches, loading: branchesLoading } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState<string>(
    () => sessionStorage.getItem(BRANCH_KEY) || ''
  );

  const availableBranches = branches.filter(
    branch => accessibleBranches.length === 0 || accessibleBranches.includes(branch.id)
  );

  useEffect(() => {
    if (availableBranches.length === 0) return;
    const isValid = selectedBranch && availableBranches.some(b => b.id === selectedBranch);
    if (!isValid && availableBranches.length === 1) {
      setSelectedBranch(availableBranches[0].id);
    } else if (!isValid && selectedBranch) {
      setSelectedBranch('');
    }
  }, [availableBranches, selectedBranch]);

  const handleSelect = (id: string) => {
    setSelectedBranch(id);
    sessionStorage.setItem(BRANCH_KEY, id);
  };

  if (accessLoading || branchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {availableBranches.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Select Branch:</span>
              <Select value={selectedBranch} onValueChange={handleSelect}>
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
  );
};

export default BranchDashboardView;
