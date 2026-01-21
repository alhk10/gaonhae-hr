import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ScreenLockOverlayProps {
  isLocked: boolean;
  userEmail?: string;
  onUnlock: (pin: string) => Promise<boolean>;
}

export const ScreenLockOverlay = ({
  isLocked,
  userEmail,
  onUnlock,
}: ScreenLockOverlayProps) => {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);

  if (!isLocked) return null;

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }

    setIsVerifying(true);
    setError(false);

    const success = await onUnlock(pin);

    setIsVerifying(false);

    if (!success) {
      setError(true);
      setPin("");
      toast.error("Incorrect PIN. Please try again.");
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === 4 && !isVerifying) {
      handleUnlock();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backdropFilter: "blur(20px)" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/80" />

      {/* Lock card */}
      <Card className="relative z-10 w-full max-w-sm mx-4 shadow-2xl border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Screen Locked</CardTitle>
          <CardDescription>
            {userEmail ? (
              <>Enter your PIN to unlock as <strong>{userEmail}</strong></>
            ) : (
              "Enter your PIN to unlock"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div 
            className="flex justify-center"
            onKeyDown={handleKeyDown}
          >
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={handlePinChange}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className={error ? "border-destructive" : ""} />
                <InputOTPSlot index={1} className={error ? "border-destructive" : ""} />
                <InputOTPSlot index={2} className={error ? "border-destructive" : ""} />
                <InputOTPSlot index={3} className={error ? "border-destructive" : ""} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Incorrect PIN</span>
            </div>
          )}

          <Button
            onClick={handleUnlock}
            disabled={isVerifying || pin.length !== 4}
            className="w-full"
            size="lg"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Unlock"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Session locked due to inactivity
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
