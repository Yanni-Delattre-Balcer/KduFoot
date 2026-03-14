import { useState, useEffect, useRef } from "react";

/**
 * Hook to detect user inactivity.
 * @param timeoutMs Delay in milliseconds before considering the user idle (default 3 minutes).
 * @returns boolean indicating if the user is idle.
 */
export function useIdle(timeoutMs: number = 60000) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isIdle) {
      setIsIdle(false);
    }

    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMs);
  };

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    // Initialize timeout
    resetTimeout();

    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isIdle, timeoutMs]);

  return isIdle;
}
