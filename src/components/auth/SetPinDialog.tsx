import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setEmployeePin, removeEmployeePin, hasEmployeePin } from "@/services/pinService";
import { useEffect } from "react";

interface SetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onPinSet?: () => void;
}

export const SetPinDialog = ({
  open,
  onOpenChange,
  employeeId,
  onPinSet,
}: SetPinDialogProps) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(true);

  useEffect(() => {
    if (open && employeeId) {
      setIsCheckingPin(true);
      hasEmployeePin(employeeId).then((exists) => {
        setHasPinSet(exists);
        setIsCheckingPin(false);
      });
    }
  }, [open, employeeId]);

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
    const success = await setEmployeePin(employeeId, pin);
    setIsLoading(false);

    if (success) {
      toast.success("PIN set successfully! Your screen will now lock after 5 minutes of inactivity.");
      setPin("");
      setConfirmPin("");
      onOpenChange(false);
      onPinSet?.();
    } else {
      toast.error("Failed to set PIN. Please try again.");
    }
  };

  const handleRemovePin = async () => {
    setIsLoading(true);
    const success = await removeEmployeePin(employeeId);
    setIsLoading(false);

    if (success) {
      toast.success("PIN removed. Screen lock is now disabled.");
      setHasPinSet(false);
      onPinSet?.();
    } else {
      toast.error("Failed to remove PIN. Please try again.");
    }
  };

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {hasPinSet ? "Update Screen Lock PIN" : "Set Screen Lock PIN"}
          </DialogTitle>
          <DialogDescription>
            {hasPinSet
              ? "Enter a new 4-digit PIN to update your screen lock, or remove the existing PIN."
              : "Set a 4-digit PIN to enable automatic screen lock after 5 minutes of inactivity."}
          </DialogDescription>
        </DialogHeader>

        {isCheckingPin ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter PIN</label>
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

            <div className="flex flex-col gap-2">
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
                ) : hasPinSet ? (
                  "Update PIN"
                ) : (
                  "Set PIN"
                )}
              </Button>

              {hasPinSet && (
                <Button
                  variant="outline"
                  onClick={handleRemovePin}
                  disabled={isLoading}
                  className="w-full text-destructive hover:text-destructive"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove PIN (Disable Screen Lock)"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
