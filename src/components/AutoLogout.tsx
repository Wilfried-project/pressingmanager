import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useIdleTimer } from '../hooks/useIdleTimer';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 min
const WARNING_MS = 2 * 60 * 1000;          // Avertissement 2 min avant

export const AutoLogout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleIdle = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    logout();
    navigate('/login?expired=true', { replace: true });
  };

  const { isWarning, remainingSeconds, extendSession } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    warningTime: WARNING_MS,
    onIdle: handleIdle,
  });

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <>
      {children}

      {isWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl">
                timer
              </span>
            </div>
            <h2 className="text-lg font-bold text-on-surface mb-2">
              Session expirante
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Votre session va expirer dans{' '}
              <span className="font-bold text-amber-600">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              {' '}à cause de l'inactivité.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleIdle}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high transition"
              >
                Se déconnecter
              </button>
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-semibold text-sm hover:bg-primary transition shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
              >
                Rester connecté
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};