import { useState, useEffect, useCallback } from 'react';
import { useInactivityTimer } from './useInactivityTimer';
import { hasEmployeePin, verifyEmployeePin } from '@/services/pinService';

interface UseScreenLockOptions {
  employeeId: string | null;
  timeout?: number; // in milliseconds, default 5 minutes
}

export const useScreenLock = ({ employeeId, timeout = 5 * 60 * 1000 }: UseScreenLockOptions) => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(true);

  // Check if user has a PIN set
  const checkPinStatus = useCallback(async () => {
    if (!employeeId) {
      setHasPin(false);
      setIsCheckingPin(false);
      return;
    }

    setIsCheckingPin(true);
    const pinExists = await hasEmployeePin(employeeId);
    setHasPin(pinExists);
    setIsCheckingPin(false);
  }, [employeeId]);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  // Handle timeout - lock the screen
  const handleTimeout = useCallback(() => {
    if (hasPin) {
      setIsLocked(true);
    }
  }, [hasPin]);

  // Use the inactivity timer
  const { resetTimer } = useInactivityTimer({
    timeout,
    onTimeout: handleTimeout,
    enabled: hasPin && !isLocked,
  });

  // Unlock the screen with PIN verification
  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    if (!employeeId) return false;

    const isValid = await verifyEmployeePin(employeeId, pin);
    if (isValid) {
      setIsLocked(false);
      resetTimer();
      return true;
    }
    return false;
  }, [employeeId, resetTimer]);

  // Lock the screen manually
  const lock = useCallback(() => {
    if (hasPin) {
      setIsLocked(true);
    }
  }, [hasPin]);

  // Refresh PIN status (call after setting a new PIN)
  const refreshPinStatus = useCallback(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  return {
    isLocked,
    hasPin,
    isCheckingPin,
    unlock,
    lock,
    refreshPinStatus,
    resetTimer,
  };
};
