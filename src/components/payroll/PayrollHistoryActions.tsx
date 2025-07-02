
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { deletePayrollRecord, updatePayrollLockStatus } from '@/services/payrollService';

interface PayrollRecord {
  id: string;
  period: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  processedDate: string | null;
  isLocked?: boolean;
  employeeId: string;
  month: string;
  year: number;
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';
  const isLocked = payroll.isLocked;
  const isCurrentPeriod = payroll.status === 'Current';

  const handleLock = async () => {
    setIsLocking(true);
    try {
      console.log(`Locking payroll record: ${payroll.id}`);
      await updatePayrollLockStatus(payroll.id, true);
      onLock(payroll.id);
      toast.success(`Payroll for ${payroll.period} has been locked`);
    } catch (error) {
      console.error('Error locking payroll record:', error);
      toast.error('Failed to lock payroll record. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      console.log(`Unlocking payroll record: ${payroll.id}`);
      await updatePayrollLockStatus(payroll.id, false);
      onUnlock(payroll.id);
      setShowUnlockDialog(false);
      toast.success(`Payroll for ${payroll.period} has been unlocked`);
    } catch (error) {
      console.error('Error unlocking payroll record:', error);
      toast.error('Failed to unlock payroll record. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDelete = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super administrators can delete payroll records.');
      return;
    }
    
    if (isLocked) {
      toast.error('Cannot delete locked payroll records. Please unlock first.');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log(`🚀 Super admin ${user?.name} initiating delete for payroll:`, {
        id: payroll.id,
        employeeId: payroll.employeeId,
        month: payroll.month,
        year: payroll.year,
        isLocked: payroll.isLocked
      });

      // Show loading toast
      const loadingToast = toast.loading('Deleting payroll record...');
      
      // Perform deletion
      await deletePayrollRecord(payroll.id);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      console.log(`✅ Payroll record ${payroll.id} deleted successfully`);
      
      // Update parent component state immediately
      onDelete(payroll.id);
      
      // Show success message
      toast.success(`Payroll for ${payroll.month} ${payroll.year} has been deleted successfully`);
      
    } catch (error) {
      console.error('💥 Error in handleDelete:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to delete payroll record.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('locked')) {
          errorMessage = 'Cannot delete locked payroll record. Please unlock it first.';
        } else if (errorMsg.includes('not found') || errorMsg.includes('already deleted')) {
          errorMessage = 'Payroll record not found. It may have been already deleted.';
          // Remove from UI since it doesn't exist
          onDelete(payroll.id);
        } else if (errorMsg.includes('not properly deleted')) {
          errorMessage = 'Delete operation failed. Please refresh the page and try again.';
        } else if (errorMsg.includes('verify') || errorMsg.includes('verification')) {
          errorMessage = 'Record deleted but verification failed. Please refresh the page.';
          // Assume success and remove from UI
          onDelete(payroll.id);
        } else {
          errorMessage = `Deletion failed: ${error.message}`;
        }
      }
      
      console.error('🔍 Deletion error details:', {
        payrollId: payroll.id,
        userRole: user?.role,
        isLocked: payroll.isLocked,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast.error(errorMessage);
      
    } finally {
      setIsDeleting(false);
    }
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
              disabled={isLocking}
              className="flex items-center space-x-1"
            >
              <Lock className="w-4 h-4" />
              <span>{isLocking ? 'Locking...' : 'Lock'}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlockDialog(true)}
              disabled={isUnlocking}
              className="flex items-center space-x-1 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              <Unlock className="w-4 h-4" />
              <span>{isUnlocking ? 'Unlocking...' : 'Unlock'}</span>
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
              disabled={isDeleting}
              className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the payroll for {payroll.month} {payroll.year}? 
                This action cannot be undone and will permanently remove this payroll record from Supabase.
                {isLocked && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                    <strong>Warning:</strong> This payroll is currently locked. You must unlock it first before deletion.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting || isLocked}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Payroll'}
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
            <Button 
              variant="outline" 
              onClick={() => setShowUnlockDialog(false)}
              disabled={isUnlocking}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUnlock} 
              disabled={isUnlocking}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollHistoryActions;
