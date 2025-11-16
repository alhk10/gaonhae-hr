
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

const EmailVerificationDialog: React.FC<EmailVerificationDialogProps> = ({
  open,
  onClose,
  email,
}) => {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email inbox and spam folder.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center">Email Verification Required</DialogTitle>
          <DialogDescription className="text-center">
            Your email address needs to be verified:
            <br />
            <strong className="text-foreground">{email}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Please check your email and click the verification link to complete your account setup.
          </p>
          <div className="space-y-2">
            <Button onClick={onClose} className="w-full">
              Got it
            </Button>
            <Button 
              onClick={handleResendVerification} 
              variant="outline" 
              className="w-full"
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationDialog;
