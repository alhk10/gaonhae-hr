import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Lock, Loader2, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removeEmployeePin } from "@/services/pinService";

interface ScreenLockOverlayProps {
  isLocked: boolean;
  userEmail?: string;
  employeeId?: string;
  onUnlock: (pin: string) => Promise<boolean>;
  onPasswordUnlock: () => void;
  onPinReset?: () => void;
}

export const ScreenLockOverlay = ({
  isLocked,
  userEmail,
  employeeId,
  onUnlock,
  onPasswordUnlock,
  onPinReset,
}: ScreenLockOverlayProps) => {
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

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

  const handlePasswordUnlock = async () => {
    if (!password || !userEmail) {
      toast.error("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setPasswordError(false);

    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (error) {
        setPasswordError(true);
        setPassword("");
        toast.error("Incorrect password. Please try again.");
        setIsVerifying(false);
        return;
      }

      // Password verified, unlock the screen
      toast.success("Password verified. Screen unlocked.");
      setPassword("");
      setShowForgotPin(false);
      onPasswordUnlock();
    } catch (err) {
      setPasswordError(true);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPin = async () => {
    if (!employeeId) {
      toast.error("Unable to reset PIN. Please try again.");
      return;
    }

    setIsVerifying(true);

    try {
      const success = await removeEmployeePin(employeeId);
      if (success) {
        toast.success("PIN has been reset. You can set a new PIN from the menu.");
        onPinReset?.();
        onPasswordUnlock();
      } else {
        toast.error("Failed to reset PIN. Please try again.");
      }
    } catch (err) {
      toast.error("An error occurred while resetting PIN.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying) {
      if (showForgotPin && password) {
        handlePasswordUnlock();
      } else if (pin.length === 4) {
        handleUnlock();
      }
    }
  };

  const handleBackToPin = () => {
    setShowForgotPin(false);
    setPassword("");
    setPasswordError(false);
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
            {showForgotPin ? (
              <KeyRound className="h-8 w-8 text-primary" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {showForgotPin ? "Forgot PIN?" : "Screen Locked"}
          </CardTitle>
          <CardDescription>
            {showForgotPin ? (
              <>Enter your password to unlock as <strong>{userEmail}</strong></>
            ) : userEmail ? (
              <>Enter your PIN to unlock as <strong>{userEmail}</strong></>
            ) : (
              "Enter your PIN to unlock"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {showForgotPin ? (
            <>
              {/* Password input for forgot PIN flow */}
              <div onKeyDown={handleKeyDown}>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  disabled={isVerifying}
                  className={passwordError ? "border-destructive" : ""}
                />
              </div>

              {passwordError && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Incorrect password</span>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handlePasswordUnlock}
                  disabled={isVerifying || !password}
                  className="w-full"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Unlock with Password"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleResetPin}
                  disabled={isVerifying || !password}
                  className="w-full"
                  size="sm"
                >
                  Reset PIN & Unlock
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={handleBackToPin}
                className="w-full text-muted-foreground"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to PIN entry
              </Button>
            </>
          ) : (
            <>
              {/* PIN input */}
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

              <button
                onClick={() => setShowForgotPin(true)}
                className="w-full text-sm text-primary hover:underline"
              >
                Forgot PIN?
              </button>

              <p className="text-xs text-center text-muted-foreground">
                Session locked due to inactivity
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
