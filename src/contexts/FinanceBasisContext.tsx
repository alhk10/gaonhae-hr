import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ReportingBasis = 'accrual' | 'cash';

interface FinanceBasisContextValue {
  basis: ReportingBasis;
  setBasis: (b: ReportingBasis) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'finance.reportingBasis';

const FinanceBasisContext = createContext<FinanceBasisContextValue | undefined>(undefined);

export const FinanceBasisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [basis, setBasisState] = useState<ReportingBasis>(() => {
    if (typeof window === 'undefined') return 'accrual';
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'cash' ? 'cash' : 'accrual';
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, basis); } catch { /* ignore */ }
  }, [basis]);

  const setBasis = useCallback((b: ReportingBasis) => setBasisState(b), []);
  const toggle = useCallback(() => setBasisState(prev => prev === 'cash' ? 'accrual' : 'cash'), []);

  return (
    <FinanceBasisContext.Provider value={{ basis, setBasis, toggle }}>
      {children}
    </FinanceBasisContext.Provider>
  );
};

export function useFinanceBasis(): FinanceBasisContextValue {
  const ctx = useContext(FinanceBasisContext);
  if (!ctx) {
    // Soft fallback: return default accrual without crashing
    return { basis: 'accrual', setBasis: () => {}, toggle: () => {} };
  }
  return ctx;
}
