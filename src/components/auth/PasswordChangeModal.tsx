
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkPasswordComplexity } from '@/services/securityService';

const PasswordChangeModal: React.FC = () => {
  const { requiresPasswordChange, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Use non-reset context for user password changes
  const passwordComplexity = checkPasswordComplexity(newPassword, false);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handlePasswordUpdate = async () => {
    console.log('PasswordChangeModal: Starting password update process');
    
    if (!passwordComplexity.isValid) {
      toast({
        title: "Password Requirements Not Met",
        description: passwordComplexity.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    // Prevent users from setting password to "password"
    if (newPassword === 'password') {
      toast({
        title: "Invalid Password",
        description: "You cannot use 'password' as your new password. Please choose a secure password.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    console.log('PasswordChangeModal: Calling updatePassword...');
    
    try {
      const result = await updatePassword(newPassword);

      if (result.success) {
        console.log('PasswordChangeModal: Password updated successfully');
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated. You can now access the system.",
        });

        setNewPassword('');
        setConfirmPassword('');
      } else {
        console.log('PasswordChangeModal: Password update failed', result.error);
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PasswordChangeModal: Error during password update:', error);
      toast({
        title: "Update Error",
        description: "An error occurred while updating your password.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!requiresPasswordChange) {
    return null;
  }

  return (
    <Dialog open={requiresPasswordChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            Password Change Required
          </DialogTitle>
          <DialogDescription>
            For security reasons, you must change your password before continuing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Password Requirements:</p>
                <ul className="mt-1 text-amber-700 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character (@$!%*?&)</li>
                  <li>• Cannot be "password"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`pr-10 ${
                  newPassword && !passwordComplexity.isValid 
                    ? 'border-red-500 focus:border-red-500' 
                    : newPassword && passwordComplexity.isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : ''
                }`}
                placeholder="Enter your new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {newPassword && !passwordComplexity.isValid && (
              <div className="space-y-1">
                {passwordComplexity.errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600">• {error}</p>
                ))}
              </div>
            )}
            {newPassword && passwordComplexity.isValid && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">Password meets requirements</span>
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
                className={`pr-10 ${
                  confirmPassword && !passwordsMatch 
                    ? 'border-red-500 focus:border-red-500' 
                    : confirmPassword && passwordsMatch 
                    ? 'border-green-500 focus:border-green-500' 
                    : ''
                }`}
                placeholder="Confirm your new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600">• Passwords do not match</p>
            )}
            {confirmPassword && passwordsMatch && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">Passwords match</span>
              </div>
            )}
          </div>

          <Button
            onClick={handlePasswordUpdate}
            disabled={!passwordComplexity.isValid || !passwordsMatch || isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating Password...' : 'Update Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangeModal;
