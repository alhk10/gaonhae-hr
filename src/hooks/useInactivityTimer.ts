
import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityTimerOptions {
  timeout: number; // timeout in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export const useInactivityTimer = ({ timeout, onTimeout, enabled = true }: UseInactivityTimerOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [timeout, onTimeout, enabled]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Handle page visibility changes - pause timer when tab is not active
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, clear the timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        // Tab is visible again, restart the timer
        resetTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the initial timer
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleActivity, resetTimer]);

  // Manual reset function for external use
  const manualReset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { resetTimer: manualReset };
};
