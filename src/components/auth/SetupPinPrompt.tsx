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

  // Check if user has a PIN on mount
  useEffect(() => {
    const checkPin = async () => {
      if (!employeeId || hasChecked) return;
      
      const hasPinSet = await hasEmployeePin(employeeId);
      setHasChecked(true);
      
      if (!hasPinSet) {
        // Small delay to let the dashboard load first
        setTimeout(() => setOpen(true), 1000);
      }
    };

    checkPin();
  }, [employeeId, hasChecked]);

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

  if (!employeeId) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Set Up Your Security PIN</DialogTitle>
          <DialogDescription className="text-center">
            A 4-digit PIN is required to secure your session. Your screen will automatically lock after 5 minutes of inactivity.
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
