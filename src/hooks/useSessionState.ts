/**
 * useSessionState — drop-in replacement for useState that persists to sessionStorage.
 * Scope: per-browser-tab. Cleared on sign-out via AuthContext.
 *
 * Keys are automatically prefixed with `lov-resume:` so they can be wiped in bulk.
 * Pass a stable, route/feature-namespaced key, e.g. `branch-dash:${branchId}:tab`.
 */

import { useEffect, useRef, useState } from 'react';

export const RESUME_PREFIX = 'lov-resume:';

const isBrowser = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

function readValue<T>(storageKey: string, initial: T | (() => T)): T {
  if (!isBrowser) return typeof initial === 'function' ? (initial as () => T)() : initial;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) {
      return typeof initial === 'function' ? (initial as () => T)() : initial;
    }
    return JSON.parse(raw) as T;
  } catch {
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  }
}

export function useSessionState<T>(
  key: string,
  initial: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = RESUME_PREFIX + key;
  const [value, setValue] = useState<T>(() => readValue(storageKey, initial));

  // Track previous key so re-keying re-reads from storage.
  const prevKeyRef = useRef(storageKey);
  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      prevKeyRef.current = storageKey;
      setValue(readValue(storageKey, initial));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!isBrowser) return;
    try {
      if (value === undefined || value === null) {
        // Persist null explicitly so we know the user cleared it; remove only undefined.
        if (value === undefined) {
          window.sessionStorage.removeItem(storageKey);
          return;
        }
      }
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore quota / serialization errors
    }
  }, [storageKey, value]);

  return [value, setValue];
}

/**
 * Remove every resume key. Call on sign-out.
 */
export function clearAllResumeState(): void {
  if (!isBrowser) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(RESUME_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Remove a single resume key (without the prefix).
 */
export function clearResumeKey(key: string): void {
  if (!isBrowser) return;
  try {
    window.sessionStorage.removeItem(RESUME_PREFIX + key);
  } catch {
    // ignore
  }
}
