/**
 * Header cells for the inline scorecard columns:
 *  - ScorecardColumnHeader: shows a label with a small × delete button.
 *  - AddScorecardColumnHeader: prompts for a new label and adds it.
 *
 * Both invalidate the columns query (so headers refresh) and the rows query
 * (so cells re-render with the new column synced into each scorecard JSON).
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import { addColumn, removeColumn, scorecardColumnsKey } from '@/services/gradingScorecardColumnService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HeaderProps {
  termId: string;
  branchId: string;
  label: string;
  rowsInvalidateKey: any[];
}

export const ScorecardColumnHeader: React.FC<HeaderProps> = ({ termId, branchId, label, rowsInvalidateKey }) => {
  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: () => removeColumn(termId, branchId, label),
    onSuccess: () => {
      toast.success(`Removed "${label}"`);
      queryClient.invalidateQueries({ queryKey: scorecardColumnsKey(termId, branchId) });
      queryClient.invalidateQueries({ queryKey: rowsInvalidateKey });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove column'),
  });

  return (
    <div className="flex flex-col items-center gap-0.5 h-24 justify-end">
      <span
        className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-xs"
        title={label}
      >
        {label}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-60 hover:opacity-100" title={`Remove "${label}"`}>
            {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove column "{label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{label}" from every student's scorecard in this term and branch. Saved values for this column will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeMutation.mutate()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface AddProps {
  termId: string;
  branchId: string;
  rowsInvalidateKey: any[];
}

export const AddScorecardColumnHeader: React.FC<AddProps> = ({ termId, branchId, rowsInvalidateKey }) => {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (label: string) => addColumn(termId, branchId, label),
    onSuccess: () => {
      toast.success('Column added');
      queryClient.invalidateQueries({ queryKey: scorecardColumnsKey(termId, branchId) });
      queryClient.invalidateQueries({ queryKey: rowsInvalidateKey });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add column'),
  });

  const handleClick = () => {
    if (adding) return;
    const label = window.prompt('New scorecard column label (e.g. Chagi):');
    if (!label) return;
    setAdding(true);
    addMutation.mutate(label.trim(), { onSettled: () => setAdding(false) });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-1.5 text-[10px]"
      onClick={handleClick}
      disabled={adding || addMutation.isPending}
      title="Add new scorecard column"
    >
      {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-0.5" />}
      Field
    </Button>
  );
};
