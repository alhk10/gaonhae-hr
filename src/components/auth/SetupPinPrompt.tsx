import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setEmployeePin, hasEmployeePin } from "@/services/pinService";

interface SetupPinPromptProps {
  employeeId: string | null;
  onPinSet?: () => void;
}

export const SetupPinPrompt = ({ employeeId, onPinSet }: SetupPinPromptProps) => {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has a PIN on mount
  useEffect(() => {
    const checkPin = async () => {
      if (!employeeId || hasChecked || dismissed) return;
      
      const hasPinSet = await hasEmployeePin(employeeId);
      setHasChecked(true);
      
      if (!hasPinSet) {
        // Small delay to let the dashboard load first
        setTimeout(() => setOpen(true), 1000);
      }
    };

    checkPin();
  }, [employeeId, hasChecked, dismissed]);

  const handleSetPin = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      setConfirmPin("");
      return;
    }

    setIsLoading(true);
    const success = await setEmployeePin(employeeId!, pin);
    setIsLoading(false);

    if (success) {
      toast.success("PIN set successfully! Your screen will now lock after 5 minutes of inactivity.");
      setPin("");
      setConfirmPin("");
      setOpen(false);
      onPinSet?.();
    } else {
      toast.error("Failed to set PIN. Please try again.");
    }
  };

  const handleSkip = () => {
    setDismissed(true);
    setOpen(false);
  };

  const handleRemindLater = () => {
    setOpen(false);
    // Will show again on next login since we don't persist the dismissal
  };

  if (!employeeId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Secure Your Session</DialogTitle>
          <DialogDescription className="text-center">
            Set up a 4-digit PIN to automatically lock your screen after 5 minutes of inactivity. 
            This helps protect your account when you step away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Create PIN</label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={setPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm PIN</label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={confirmPin}
                onChange={setConfirmPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSetPin}
            disabled={isLoading || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting PIN...
              </>
            ) : (
              "Set PIN"
            )}
          </Button>
          
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleRemindLater}
              className="flex-1"
            >
              Remind Me Later
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 text-muted-foreground"
            >
              Don't Ask Again
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
