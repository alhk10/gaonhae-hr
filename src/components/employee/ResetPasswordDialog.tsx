
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateSecurePassword, generateSalt, hashPassword, logSecurityEvent } from '@/services/securityService';

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
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePassword = () => {
    const generatedPassword = generateSecurePassword();
    setNewPassword(generatedPassword);
    setShowPassword(true);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast({
      title: "Password Copied",
      description: "The new password has been copied to your clipboard.",
    });
  };

  const handleResetPassword = async () => {
    console.log('ResetPasswordDialog: Resetting password for employee:', employeeEmail);
    setIsLoading(true);

    try {
      let passwordToUse = newPassword;
      
      // Generate secure password if none generated yet
      if (!passwordToUse) {
        passwordToUse = generateSecurePassword();
        setNewPassword(passwordToUse);
        setShowPassword(true);
      }

      // Generate salt and hash the new password
      const salt = generateSalt();
      const hashedPassword = await hashPassword(passwordToUse, salt);

      // Update password in database with enhanced security fields using type assertion
      const { error } = await supabase
        .from('user_passwords')
        .upsert({
          email: employeeEmail,
          password_hash: hashedPassword,
          salt: salt,
          requires_change: false,
          must_change_password: true, // Force user to change on next login
          password_complexity_met: true,
          last_password_change: new Date().toISOString(),
          failed_attempts: 0,
          locked_until: null
        } as any);

      if (error) {
        console.error('ResetPasswordDialog: Error resetting password:', error);
        toast({
          title: "Reset Failed",
          description: "Failed to reset password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Log security event
      await logSecurityEvent({
        user_email: employeeEmail,
        action: 'PASSWORD_RESET_BY_ADMIN',
        details: { 
          reset_by: 'admin', // In a real app, you'd get the current admin user
          employee_name: employeeName,
          secure_password_generated: true
        }
      });

      console.log('ResetPasswordDialog: Password reset successfully for:', employeeEmail);
      
      toast({
        title: "Password Reset",
        description: `${employeeName}'s password has been reset. They will be required to change it on next login.`,
      });

      // Don't close immediately to show the new password
      if (!showPassword) {
        onClose();
      }
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

  const handleClose = () => {
    setNewPassword('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset {employeeName}'s password with a secure, randomly generated password.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!showPassword ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Security Notice:</p>
                    <ul className="mt-1 text-amber-700 space-y-1">
                      <li>• A secure random password will be generated</li>
                      <li>• {employeeName} will be required to change it on next login</li>
                      <li>• The new password will meet complexity requirements</li>
                      <li>• This action will be logged for security purposes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGeneratePassword}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Password
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm">
                  <p className="font-medium text-green-800 mb-2">New Password Generated:</p>
                  <div className="bg-white border rounded p-3 font-mono text-lg break-all">
                    {newPassword}
                  </div>
                  <p className="mt-2 text-green-700 text-xs">
                    Please copy this password and share it securely with {employeeName}.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Password
                </Button>
                <Button
                  onClick={handleResetPassword}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Applying Reset...' : 'Apply Reset'}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full"
                disabled={isLoading}
              >
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
