import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Building2, Plus, Trash2, Percent, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Branch {
  id: string;
  name: string;
}

interface PartnerBranchShare {
  id: string;
  employee_id: string;
  branch_id: string;
  share_percentage: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  branch?: Branch;
}

interface PartnerBranchSharesManagerProps {
  employeeId: string;
  employeeName: string;
  position: string;
}

const PartnerBranchSharesManager: React.FC<PartnerBranchSharesManagerProps> = ({
  employeeId,
  employeeName,
  position
}) => {
  const { userrole } = useAuth();
  const isSuperAdmin = userrole === 'superadmin';
  
  const [shares, setShares] = useState<PartnerBranchShare[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newShare, setNewShare] = useState({
    branch_id: '',
    share_percentage: '',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const isPartner = position?.toLowerCase() === 'partner' || 
                    position?.toLowerCase() === 'senior partner';

  useEffect(() => {
    if (isPartner) {
      loadData();
    }
  }, [employeeId, isPartner]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (!branchError && branchData) {
        setBranches(branchData);
      }
      
      // Load partner shares
      const { data: shareData, error: shareError } = await supabase
        .from('partner_branch_shares')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });
      
      if (!shareError && shareData) {
        // Map branch names
        const sharesWithBranches = shareData.map(share => ({
          ...share,
          branch: branchData?.find(b => b.id === share.branch_id)
        }));
        setShares(sharesWithBranches);
      }
    } catch (error) {
      console.error('Error loading partner shares:', error);
      toast.error('Failed to load partner shares');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShare = async () => {
    if (!newShare.branch_id || !newShare.share_percentage) {
      toast.error('Please select a branch and enter share percentage');
      return;
    }

    const percentage = parseFloat(newShare.share_percentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast.error('Share percentage must be between 0 and 100');
      return;
    }

    try {
      const { error } = await supabase
        .from('partner_branch_shares')
        .insert({
          employee_id: employeeId,
          branch_id: newShare.branch_id,
          share_percentage: percentage,
          effective_from: newShare.effective_from,
          notes: newShare.notes || null
        });

      if (error) throw error;
      
      toast.success('Branch share added successfully');
      setNewShare({
        branch_id: '',
        share_percentage: '',
        effective_from: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      setIsAdding(false);
      loadData();
    } catch (error: any) {
      console.error('Error adding share:', error);
      toast.error(error.message || 'Failed to add branch share');
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to remove this branch share?')) return;
    
    try {
      const { error } = await supabase
        .from('partner_branch_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      
      toast.success('Branch share removed');
      loadData();
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error('Failed to remove branch share');
    }
  };

  // Get available branches (not already assigned)
  const getAvailableBranches = () => {
    const assignedBranchIds = shares
      .filter(s => !s.effective_to)
      .map(s => s.branch_id);
    return branches.filter(b => !assignedBranchIds.includes(b.id));
  };

  // Calculate total share percentage
  const totalSharePercentage = shares
    .filter(s => !s.effective_to)
    .reduce((sum, s) => sum + (s.share_percentage || 0), 0);

  if (!isPartner) {
    return null;
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Share of Branches
          </CardTitle>
          {isSuperAdmin && !isAdding && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Branch
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg">
              <Percent className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-sm text-indigo-700 font-medium">Total Share Allocation</p>
                <p className="text-2xl font-bold text-indigo-800">{totalSharePercentage.toFixed(1)}%</p>
              </div>
              {totalSharePercentage > 100 && (
                <div className="ml-auto flex items-center text-amber-600">
                  <AlertCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm">Exceeds 100%</span>
                </div>
              )}
            </div>

            {/* Add new share form */}
            {isAdding && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <h4 className="font-semibold text-gray-700">Add Branch Share</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Branch *</Label>
                    <Select
                      value={newShare.branch_id}
                      onValueChange={(value) => setNewShare(prev => ({ ...prev, branch_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableBranches().map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Share Percentage *</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        placeholder="e.g. 25"
                        value={newShare.share_percentage}
                        onChange={(e) => setNewShare(prev => ({ ...prev, share_percentage: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Effective From *</Label>
                    <Input
                      type="date"
                      value={newShare.effective_from}
                      onChange={(e) => setNewShare(prev => ({ ...prev, effective_from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional notes"
                      value={newShare.notes}
                      onChange={(e) => setNewShare(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddShare} className="bg-indigo-600 hover:bg-indigo-700">
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Shares table */}
            {shares.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-center">Share %</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Notes</TableHead>
                    {isSuperAdmin && <TableHead className="w-20"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((share) => (
                    <TableRow key={share.id} className={share.effective_to ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          {share.branch?.name || share.branch_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                          {share.share_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(share.effective_from), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {share.effective_to 
                          ? format(new Date(share.effective_to), 'MMM d, yyyy')
                          : <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm max-w-xs truncate">
                        {share.notes || '-'}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteShare(share.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No branch shares assigned yet</p>
                {isSuperAdmin && (
                  <p className="text-sm mt-1">Click "Add Branch" to assign profit share</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PartnerBranchSharesManager;
