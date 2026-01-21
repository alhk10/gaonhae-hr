import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenLock } from '@/hooks/useScreenLock';
import { ScreenLockOverlay } from '@/components/auth/ScreenLockOverlay';

interface ScreenLockContextType {
  isLocked: boolean;
  hasPin: boolean;
  refreshPinStatus: () => void;
  lock: () => void;
}

const ScreenLockContext = createContext<ScreenLockContextType | null>(null);

interface ScreenLockProviderProps {
  children: ReactNode;
}

export const ScreenLockProvider = ({ children }: ScreenLockProviderProps) => {
  const { user, userDetails } = useAuth();
  const employeeId = userDetails?.id || null;

  const { isLocked, hasPin, unlock, lock, forceUnlock, refreshPinStatus } = useScreenLock({
    employeeId,
    timeout: 5 * 60 * 1000, // 5 minutes
  });

  const handlePasswordUnlock = () => {
    forceUnlock();
  };

  const handlePinReset = () => {
    refreshPinStatus();
  };

  return (
    <ScreenLockContext.Provider value={{ isLocked, hasPin, refreshPinStatus, lock }}>
      {children}
      <ScreenLockOverlay
        isLocked={isLocked}
        userEmail={user?.email}
        employeeId={employeeId || undefined}
        onUnlock={unlock}
        onPasswordUnlock={handlePasswordUnlock}
        onPinReset={handlePinReset}
      />
    </ScreenLockContext.Provider>
  );
};

export const useScreenLockContext = () => {
  const context = useContext(ScreenLockContext);
  if (!context) {
    throw new Error('useScreenLockContext must be used within a ScreenLockProvider');
  }
  return context;
};
