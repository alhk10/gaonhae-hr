
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Copy, RefreshCw, Eye, EyeOff, CheckCircle2, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/services/securityService';
import { formatDateTime } from '@/utils/dateFormat';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Default password for all resets
  const defaultPassword = 'password';

  const handleResetPassword = async () => {
    console.log('ResetPasswordDialog: Starting password reset for:', employeeEmail);
    
    if (!employeeEmail || !employeeEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Employee email is required for password reset.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call auth-admin edge function to reset the actual Supabase Auth password
      const { data, error } = await supabase.functions.invoke('auth-admin', {
        body: {
          action: 'reset_password',
          email: employeeEmail,
          newPassword: defaultPassword,
        },
      });

      if (error) {
        console.error('ResetPasswordDialog: Edge function error:', error);
        throw new Error(`Password reset failed: ${error.message}`);
      }

      if (data?.error) {
        console.error('ResetPasswordDialog: Reset error:', data.error);
        throw new Error(data.error);
      }

      // Log security event
      await logSecurityEvent({
        user_email: employeeEmail,
        action: 'PASSWORD_RESET_BY_ADMIN',
        details: { 
          reset_by: 'admin',
          employee_name: employeeName,
          default_password_used: true,
          timestamp: new Date().toISOString()
        }
      });

      console.log('ResetPasswordDialog: Password reset completed successfully');
      
      setIsComplete(true);
      setShowPassword(true);
      
      toast({
        title: "Password Reset Complete",
        description: `Password reset to default for ${employeeName}. They must change it on next login.`,
      });

    } catch (error) {
      console.error('ResetPasswordDialog: Error during password reset:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during password reset.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(defaultPassword);
      toast({
        title: "Password Copied",
        description: "The default password has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast({
        title: "Copy Failed",
        description: "Could not copy password to clipboard. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setIsComplete(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            Reset Employee Password
          </DialogTitle>
          <DialogDescription>
            Reset password to default for {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isComplete ? (
            <>
              {/* Warning Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-2">Before proceeding:</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Password will be reset to the default "password"</li>
                      <li>• {employeeName} must change it on their next login</li>
                      <li>• They cannot use the system until password is changed</li>
                      <li>• This action will be logged for security</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Employee Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Employee Details:</p>
                  <p className="text-blue-700 mt-1">
                    <strong>Name:</strong> {employeeName}
                  </p>
                  <p className="text-blue-700">
                    <strong>Email:</strong> {employeeEmail}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
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
                  onClick={handleResetPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800 mb-2">Password Reset Successful!</p>
                    <p className="text-green-700">
                      Password has been reset to default for {employeeName}. Please share it securely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Password Display */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Default Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={defaultPassword}
                    readOnly
                    className="pr-20 font-mono text-sm bg-gray-50"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPassword}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Share this password securely with {employeeName}. They will be required to change it on their next login.
                </p>
              </div>

              {/* Close Button */}
              <Button
                onClick={handleClose}
                className="w-full"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
