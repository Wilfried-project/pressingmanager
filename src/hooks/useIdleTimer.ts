import { useEffect, useRef, useState } from 'react';

interface UseIdleTimerOptions {
  timeout: number;        // ms avant déconnexion (ex: 30 * 60 * 1000)
  warningTime?: number;   // ms avant timeout pour afficher l'avertissement (ex: 2 * 60 * 1000)
  onIdle: () => void;     // callback quand timeout atteint
}

export function useIdleTimer({ timeout, warningTime = 0, onIdle }: UseIdleTimerOptions) {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownIntervalRef.current = null;
  };

  const resetTimers = () => {
    clearAllTimers();
    setIsWarning(false);
    setRemainingSeconds(0);

    // Timer pour déclencher l'avertissement
    if (warningTime > 0) {
      warningTimerRef.current = setTimeout(() => {
        setIsWarning(true);
        // Compte à rebours
        let remaining = Math.floor(warningTime / 1000);
        setRemainingSeconds(remaining);
        countdownIntervalRef.current = setInterval(() => {
          remaining -= 1;
          setRemainingSeconds(remaining);
          if (remaining <= 0 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
        }, 1000);
      }, timeout - warningTime);
    }

    // Timer final
    idleTimerRef.current = setTimeout(() => {
      onIdle();
    }, timeout);
  };

  useEffect(() => {
    // Événements qui comptent comme "activité"
    const events = [
      'mousemove', 'mousedown', 'keydown', 'touchstart',
      'scroll', 'click', 'visibilitychange'
    ];

    // Throttle pour ne pas reset à chaque pixel de souris
    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return; // max 1 reset/seconde
      lastReset = now;
      resetTimers();
    };

    // Démarrer les timers au montage
    resetTimers();

    // Écouter les événements
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [timeout, warningTime]);

  // Fonction pour prolonger manuellement la session
  const extendSession = () => {
    resetTimers();
  };

  return { isWarning, remainingSeconds, extendSession };
}