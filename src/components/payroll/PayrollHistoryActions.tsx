
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PayrollRecord {
  id: string;
  period: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  processedDate: string | null;
  isLocked?: boolean;
}

interface PayrollHistoryActionsProps {
  payroll: PayrollRecord;
  onLock: (id: string) => void;
  onUnlock: (id: string) => void;
  onDelete: (id: string) => void;
}

const PayrollHistoryActions = ({ payroll, onLock, onUnlock, onDelete }: PayrollHistoryActionsProps) => {
  const { user } = useAuth();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const isLocked = payroll.isLocked;
  const isCurrentPeriod = payroll.status === 'Current';

  const handleLock = () => {
    onLock(payroll.id);
    toast(`Payroll for ${payroll.period} has been locked`);
  };

  const handleUnlock = () => {
    onUnlock(payroll.id);
    setShowUnlockDialog(false);
    toast(`Payroll for ${payroll.period} has been unlocked`);
  };

  const handleDelete = () => {
    onDelete(payroll.id);
    toast(`Payroll for ${payroll.period} has been deleted`);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Lock/Unlock Button */}
      {!isCurrentPeriod && (
        <>
          {!isLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLock}
              className="flex items-center space-x-1"
            >
              <Lock className="w-4 h-4" />
              <span>Lock</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlockDialog(true)}
              className="flex items-center space-x-1 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock</span>
            </Button>
          )}
        </>
      )}

      {/* Delete Button - Only for Super Admin */}
      {isSuperAdmin && !isCurrentPeriod && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLocked}
              className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the payroll for {payroll.period}? 
                This action cannot be undone and will permanently remove all payroll data for this period.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Payroll
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Unlock Confirmation Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Payroll</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock the payroll for {payroll.period}? 
              This will allow modifications to the payroll data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnlock} className="bg-orange-600 hover:bg-orange-700">
              Unlock Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollHistoryActions;
