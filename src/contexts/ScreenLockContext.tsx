import { createContext, useContext, ReactNode } from 'react';

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

// TEMPORARILY DISABLED: No-op passthrough to avoid running timers/queries while feature is off
export const ScreenLockProvider = ({ children }: ScreenLockProviderProps) => {
  return (
    <ScreenLockContext.Provider value={{ isLocked: false, hasPin: false, refreshPinStatus: () => {}, lock: () => {} }}>
      {children}
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
