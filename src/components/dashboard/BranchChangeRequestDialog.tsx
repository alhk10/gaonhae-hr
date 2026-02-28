import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createBranchRequest } from '@/services/employeeBranchRequestService';

interface BranchChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  currentBranch: string | null;
}

const BranchChangeRequestDialog: React.FC<BranchChangeRequestDialogProps> = ({
  open, onOpenChange, employeeId, employeeName, currentBranch
}) => {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBranchRequest(employeeId, employeeName, currentBranch, selectedBranch, reason);
      toast.success('Branch change request submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['employee-pending-branch-request'] });
      setSelectedBranch('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting branch request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Branch Change</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {currentBranch && (
            <div>
              <Label className="text-sm text-muted-foreground">Current Branch</Label>
              <p className="font-medium">{currentBranch}</p>
            </div>
          )}
          <div>
            <Label>Requested Branch</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches
                  .filter(b => b.name !== currentBranch)
                  .map(branch => (
                    <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you want to change branch?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedBranch}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BranchChangeRequestDialog;
