
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PasswordChangeModalProps {
  open: boolean;
  onClose?: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ open, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword === 'password') {
      toast({
        title: "Invalid Password",
        description: "Please choose a password other than 'password'.",
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
        
        // Reset form
        setNewPassword('');
        setConfirmPassword('');
        
        // Close modal after successful update
        if (onClose) {
          onClose();
        }
      } else {
        console.error('PasswordChangeModal: Password update failed');
        toast({
          title: "Update Failed",
          description: "Failed to update password. Please try again.",
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

  // Prevent dialog from closing when requiresPasswordChange is true
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if we have an onClose handler (optional closing)
    if (!newOpen && onClose) {
      onClose();
    }
    // If no onClose handler, this is a required password change - don't allow closing
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            For security reasons, you must change your default password before continuing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (at least 6 characters)"
              required
              minLength={6}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !newPassword || !confirmPassword}>
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangeModal;
