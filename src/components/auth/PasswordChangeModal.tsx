
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { checkPasswordComplexity } from '@/services/securityService';

interface PasswordChangeModalProps {
  open: boolean;
  onClose?: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ open, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [complexityCheck, setComplexityCheck] = useState({ isValid: false, errors: [] as string[] });
  const { updatePassword, requiresPasswordChange } = useAuth();

  // Check password complexity in real-time
  useEffect(() => {
    if (newPassword) {
      const result = checkPasswordComplexity(newPassword);
      setComplexityCheck(result);
    } else {
      setComplexityCheck({ isValid: false, errors: [] });
    }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!complexityCheck.isValid) {
      toast({
        title: "Password Requirements Not Met",
        description: "Please ensure your password meets all complexity requirements.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('PasswordChangeModal: Attempting to update password');
      const success = await updatePassword(newPassword);
      
      if (success) {
        console.log('PasswordChangeModal: Password updated successfully');
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        
        // Clear form
        setNewPassword('');
        setConfirmPassword('');
        
        console.log('PasswordChangeModal: Password update completed, modal should close automatically');
        
      } else {
        console.error('PasswordChangeModal: Password update failed');
        toast({
          title: "Update Failed",
          description: "Failed to update password. The password may have been used recently or doesn't meet security requirements.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PasswordChangeModal: Error updating password:', error);
      toast({
        title: "Update Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog open/close - prevent closing if it's a required password change
  const handleOpenChange = (newOpen: boolean) => {
    console.log('PasswordChangeModal: handleOpenChange called with:', newOpen);
    console.log('PasswordChangeModal: requiresPasswordChange:', requiresPasswordChange);
    
    if (!newOpen) {
      // Only allow closing if it's not a required password change
      if (!requiresPasswordChange && onClose) {
        console.log('PasswordChangeModal: Closing modal via onClose');
        onClose();
      } else {
        console.log('PasswordChangeModal: Preventing modal close - password change required');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            {requiresPasswordChange 
              ? "For security reasons, you must change your password before continuing."
              : "Update your password to maintain account security."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
                autoComplete="new-password"
                className={newPassword && !complexityCheck.isValid ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Password Complexity Indicators */}
            {newPassword && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Password Requirements:</div>
                <div className="space-y-1">
                  <div className={`flex items-center text-xs ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                    {newPassword.length >= 8 ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center text-xs ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[a-z]/.test(newPassword) ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[A-Z]/.test(newPassword) ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center text-xs ${/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                    {/\d/.test(newPassword) ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    One number
                  </div>
                  <div className={`flex items-center text-xs ${/[@$!%*?&]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                    {/[@$!%*?&]/.test(newPassword) ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    One special character (@$!%*?&)
                  </div>
                  <div className={`flex items-center text-xs ${newPassword.toLowerCase() !== 'password' ? 'text-green-600' : 'text-red-600'}`}>
                    {newPassword.toLowerCase() !== 'password' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Not "password"
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
                autoComplete="new-password"
                className={confirmPassword && newPassword !== confirmPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !complexityCheck.isValid || newPassword !== confirmPassword || !newPassword || !confirmPassword}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangeModal;
