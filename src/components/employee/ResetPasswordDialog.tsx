
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface ResetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  employeeEmail: string;
}

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ 
  open, 
  onClose, 
  employeeName, 
  employeeEmail 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    console.log('ResetPasswordDialog: Resetting password for employee:', employeeEmail);
    setIsLoading(true);

    try {
      // Get current stored passwords
      const userPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
      
      // Reset to default password "password" (encoded)
      userPasswords[employeeEmail] = btoa('password');
      localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
      
      // Also clear any password change requirements for this user
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        if (userData.email === employeeEmail) {
          localStorage.setItem('requiresPasswordChange', 'true');
        }
      }

      console.log('ResetPasswordDialog: Password reset successfully for:', employeeEmail);
      
      toast({
        title: "Password Reset",
        description: `${employeeName}'s password has been reset to the default password. They will be required to change it on next login.`,
      });

      onClose();
    } catch (error) {
      console.error('ResetPasswordDialog: Error resetting password:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to reset {employeeName}'s password to the default password?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Important:</p>
                <ul className="mt-1 text-amber-700 space-y-1">
                  <li>• The password will be reset to "password"</li>
                  <li>• {employeeName} will be required to change it on next login</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
