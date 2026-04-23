/**
 * useScrollRestoration — saves window.scrollY per route into sessionStorage and
 * restores it on mount. Polls briefly via requestAnimationFrame so async data
 * has time to render before we attempt to scroll.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RESUME_PREFIX } from './useSessionState';

const SCROLL_KEY_PREFIX = `${RESUME_PREFIX}scroll:`;

export function useScrollRestoration(extraKey: string = ''): void {
  const location = useLocation();
  const storageKey = SCROLL_KEY_PREFIX + location.pathname + (extraKey ? `:${extraKey}` : '');

  // Save on scroll.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        try {
          window.sessionStorage.setItem(storageKey, String(window.scrollY));
        } catch {
          // ignore
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [storageKey]);

  // Restore on mount / when key changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    if (!raw) return;
    const target = parseInt(raw, 10);
    if (!Number.isFinite(target) || target <= 0) return;

    let attempts = 0;
    const maxAttempts = 60; // ~1s at 60fps
    let raf = 0;

    const tryScroll = () => {
      attempts += 1;
      const maxScrollable = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      if (maxScrollable >= target) {
        window.scrollTo(0, target);
        return;
      }
      if (attempts >= maxAttempts) {
        window.scrollTo(0, Math.min(target, maxScrollable));
        return;
      }
      raf = window.requestAnimationFrame(tryScroll);
    };

    raf = window.requestAnimationFrame(tryScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [storageKey]);
}
